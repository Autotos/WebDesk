/* ================================================================
   AI Proxy Service
   Stateless proxy that adapts requests to different AI providers.
   All three providers use OpenAI-compatible request body format,
   differing only in URL path and auth headers.
   ================================================================ */

export class AIProxyError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 502,
  ) {
    super(message)
    this.name = 'AIProxyError'
  }
}

/* ----------------------------------------------------------------
   URL Construction
   ---------------------------------------------------------------- */

export function buildEndpointUrl(provider: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '')

  // If URL already ends with /chat/completions, use as-is
  if (base.endsWith('/chat/completions')) {
    return base
  }

  // If URL path already contains a version segment (e.g. /v1, /v3, /api/coding/v3),
  // only append /chat/completions instead of the full provider prefix
  try {
    const path = new URL(base).pathname.replace(/\/+$/, '')
    if (/\/v\d+$/.test(path)) {
      return `${base}/chat/completions`
    }
  } catch {
    // invalid URL, fall through to default
  }

  // Default: apply full provider-specific path prefix
  switch (provider) {
    case 'dashscope':
      return `${base}/compatible-mode/v1/chat/completions`
    case 'volcengine-ark':
      return `${base}/api/v3/chat/completions`
    case 'openai-compatible':
    default:
      return `${base}/v1/chat/completions`
  }
}

/* ----------------------------------------------------------------
   Header Construction
   ---------------------------------------------------------------- */

export function buildHeaders(provider: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  // Provider-specific headers can be added here in the future
  if (provider === 'dashscope' && apiKey) {
    headers['X-DashScope-SSE'] = 'enable'
  }
  return headers
}

/* ----------------------------------------------------------------
   Proxy Request
   ---------------------------------------------------------------- */

export interface ProxyChatParams {
  provider: string
  baseUrl: string
  apiKey: string
  model: string
  messages: Array<{ role: string; content: string }>
  stream?: boolean
}

export async function proxyChat(params: ProxyChatParams): Promise<Response> {
  const { provider, baseUrl, apiKey, model, messages, stream } = params

  const url = buildEndpointUrl(provider, baseUrl)
  const headers = buildHeaders(provider, apiKey)
  const body = JSON.stringify({ model, messages, stream: !!stream })

  // Timeout only for non-streaming requests
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  if (!stream) {
    timeoutId = setTimeout(() => controller.abort(), 120_000)
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    })

    if (timeoutId) clearTimeout(timeoutId)

    if (!response.ok) {
      const status = response.status
      let errorBody = ''
      try {
        errorBody = await response.text()
      } catch {
        // ignore read errors
      }

      if (status === 401 || status === 403) {
        throw new AIProxyError('AUTH_FAILED', `API Key 无效或已过期 (${status})`, 401)
      }
      if (status === 429) {
        throw new AIProxyError('RATE_LIMITED', '请求频率超限，请稍后重试', 429)
      }
      throw new AIProxyError(
        'PROVIDER_ERROR',
        `AI 服务返回错误: ${status} ${errorBody.slice(0, 200)}`,
        502,
      )
    }

    return response
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId)

    if (err instanceof AIProxyError) throw err

    const e = err as NodeJS.ErrnoException & { type?: string }

    if (e.name === 'AbortError') {
      throw new AIProxyError('TIMEOUT', '连接超时 (120s)', 504)
    }
    if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND' || e.type === 'system') {
      throw new AIProxyError(
        'CONNECTION_FAILED',
        `无法连接到 AI 服务: ${baseUrl} (${e.code || e.message})`,
        502,
      )
    }

    throw new AIProxyError('UNKNOWN', `代理请求失败: ${e.message}`, 500)
  }
}
