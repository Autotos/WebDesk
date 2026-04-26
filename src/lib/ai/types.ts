/* ================================================================
   AI Service Type Definitions
   ================================================================ */

export type AIProvider = 'openai-compatible' | 'dashscope' | 'volcengine-ark'

export interface AIConfig {
  provider: AIProvider
  baseUrl: string
  apiKey: string
  modelName: string
  enabled: boolean
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  provider: AIProvider
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  stream?: boolean
}

export interface ChatCompletionResponse {
  id: string
  model: string
  choices: Array<{
    message: ChatMessage
    finish_reason: string | null
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface StreamChunk {
  id: string
  model: string
  choices: Array<{
    delta: { role?: string; content?: string }
    finish_reason: string | null
  }>
}

export interface AITestResult {
  success: boolean
  message: string
  latencyMs?: number
}
