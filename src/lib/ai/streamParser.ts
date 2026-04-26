import type { StreamChunk } from './types'

/* ================================================================
   SSE Stream Parser
   Parses a ReadableStream<Uint8Array> from fetch().body into
   an async generator of StreamChunk objects.
   ================================================================ */

export async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamChunk> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          const chunk = parseLine(buffer.trim())
          if (chunk) yield chunk
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Split on newlines and process complete lines
      const lines = buffer.split('\n')
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()

        // Skip empty lines and SSE comments
        if (!trimmed || trimmed.startsWith(':')) continue

        // Check for stream termination
        if (trimmed === 'data: [DONE]') return

        // Parse data lines
        const chunk = parseLine(trimmed)
        if (chunk) yield chunk
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function parseLine(line: string): StreamChunk | null {
  if (!line.startsWith('data: ')) return null
  const json = line.slice(6) // Remove 'data: ' prefix
  if (!json || json === '[DONE]') return null

  try {
    return JSON.parse(json) as StreamChunk
  } catch {
    // Skip malformed JSON chunks rather than crashing the stream
    return null
  }
}
