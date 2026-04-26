import { Router } from 'express'
import { Readable } from 'node:stream'
import { proxyChat, AIProxyError, type ProxyChatParams } from '../services/aiProxyService.js'

export function createAiRouter(): Router {
  const router = Router()

  /* ----------------------------------------------------------
     POST /api/ai/chat/completions
     Proxy chat completion requests to the configured AI provider.
     ---------------------------------------------------------- */
  router.post('/chat/completions', async (req, res) => {
    try {
      const { provider, baseUrl, apiKey, model, messages, stream } = req.body as ProxyChatParams

      if (!provider || !baseUrl || !model || !messages?.length) {
        res.status(400).json({ error: '缺少必填参数: provider, baseUrl, model, messages' })
        return
      }

      const controller = new AbortController()
      req.on('close', () => controller.abort())

      const upstream = await proxyChat({ provider, baseUrl, apiKey: apiKey || '', model, messages, stream })

      if (!stream) {
        // Non-streaming: parse JSON and forward
        const data = await upstream.json()
        res.json(data)
        return
      }

      // Streaming: pipe SSE response
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()

      if (!upstream.body) {
        res.end()
        return
      }

      // Pipe the upstream ReadableStream to Express response
      const nodeStream = Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream)
      nodeStream.pipe(res)

      nodeStream.on('error', () => {
        if (!res.writableEnded) res.end()
      })
    } catch (err) {
      handleAiError(err, res)
    }
  })

  /* ----------------------------------------------------------
     POST /api/ai/test
     Test connectivity to the configured AI provider.
     Always returns 200 — success/failure is in the response body.
     ---------------------------------------------------------- */
  router.post('/test', async (req, res) => {
    const { provider, baseUrl, apiKey, model } = req.body as {
      provider: string
      baseUrl: string
      apiKey?: string
      model: string
    }

    if (!provider || !baseUrl || !model) {
      res.json({ success: false, message: '缺少必填参数: provider, baseUrl, model' })
      return
    }

    const start = Date.now()

    try {
      const upstream = await proxyChat({
        provider,
        baseUrl,
        apiKey: apiKey || '',
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        stream: false,
      })

      const data = await upstream.json() as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const latencyMs = Date.now() - start
      const reply = data.choices?.[0]?.message?.content || '(无回复内容)'

      res.json({
        success: true,
        message: reply.slice(0, 200),
        latencyMs,
      })
    } catch (err) {
      const latencyMs = Date.now() - start
      const message =
        err instanceof AIProxyError
          ? err.message
          : err instanceof Error
            ? err.message
            : '未知错误'

      res.json({ success: false, message, latencyMs })
    }
  })

  return router
}

/* ----------------------------------------------------------------
   Error Handler
   ---------------------------------------------------------------- */

function handleAiError(err: unknown, res: import('express').Response): void {
  if (err instanceof AIProxyError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code })
    return
  }
  const message = err instanceof Error ? err.message : '内部服务器错误'
  console.error('[ai]', message)
  res.status(500).json({ error: message })
}
