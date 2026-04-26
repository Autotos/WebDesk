/* ================================================================
   Beautify Cache — FIFO cache for BeautifiedResult
   ================================================================ */

import type { BeautifiedResult } from './types'
import { analyze } from './outputBeautifier'

const MAX_CACHE_SIZE = 50
const cache = new Map<string, BeautifiedResult>()

/**
 * Get cached result or compute and cache a new one.
 */
export function getOrCompute(blockId: string, command: string, rawText: string): BeautifiedResult {
  const existing = cache.get(blockId)
  if (existing) return existing

  const result = analyze(command, rawText)

  // FIFO eviction
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) cache.delete(firstKey)
  }

  cache.set(blockId, result)
  return result
}

/**
 * Clear the entire cache (called when blocks are cleared).
 */
export function clearBeautifyCache(): void {
  cache.clear()
}
