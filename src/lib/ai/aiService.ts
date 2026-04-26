import { useAIStore } from '@/store/useAIStore'
import { parseSSEStream } from './streamParser'
import type {
  ChatMessage,
  ChatCompletionResponse,
  StreamChunk,
  AITestResult,
} from './types'

/* ================================================================
   AI Service — Frontend API Client
   All requests go through the Express backend proxy at /api/ai/*.
   Configuration is read from useAIStore.
   ================================================================ */

function getConfig() {
  const { provider, baseUrl, apiKey, modelName, enabled } = useAIStore.getState()
  if (!enabled) throw new Error('AI 服务未启用，请先在设置中配置并启用')
  if (!modelName) throw new Error('未配置模型名称，请在设置中填写')
  return { provider, baseUrl, apiKey, model: modelName }
}

/* ----------------------------------------------------------------
   Non-streaming Chat Completion
   ---------------------------------------------------------------- */

export async function chatCompletion(
  messages: ChatMessage[],
): Promise<ChatCompletionResponse> {
  const config = getConfig()

  const res = await fetch('/api/ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...config, messages, stream: false }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string }
    throw new Error(err.error || `请求失败: ${res.status}`)
  }

  return res.json() as Promise<ChatCompletionResponse>
}

/* ----------------------------------------------------------------
   Streaming Chat Completion
   ---------------------------------------------------------------- */

export async function* chatCompletionStream(
  messages: ChatMessage[],
): AsyncGenerator<StreamChunk> {
  const config = getConfig()

  const res = await fetch('/api/ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...config, messages, stream: true }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string }
    throw new Error(err.error || `请求失败: ${res.status}`)
  }

  if (!res.body) throw new Error('响应中没有数据流')

  yield* parseSSEStream(res.body)
}

/* ----------------------------------------------------------------
   Connection Test
   ---------------------------------------------------------------- */

export async function testConnection(): Promise<AITestResult> {
  const { provider, baseUrl, apiKey, modelName } = useAIStore.getState()

  if (!modelName) {
    return { success: false, message: '请先填写模型名称' }
  }

  try {
    const res = await fetch('/api/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, baseUrl, apiKey, model: modelName }),
    })

    if (!res.ok) {
      return { success: false, message: `WebDesk 后端错误: ${res.status}` }
    }

    return res.json() as Promise<AITestResult>
  } catch {
    return { success: false, message: '无法连接到 WebDesk 后端服务器' }
  }
}
