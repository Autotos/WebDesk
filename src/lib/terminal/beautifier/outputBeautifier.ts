/* ================================================================
   Output Beautifier — Main analysis engine
   Analyzes raw terminal output and produces structured segments.
   ================================================================ */

import type { BeautifiedSegment, BeautifiedResult, DetectorHint } from './types'
import { getCommandHints } from './commandHints'
import {
  stripAnsi,
  hasBinaryContent,
  detectJson,
  detectDiff,
  detectGitStatus,
  detectTable,
  detectLogLevels,
  detectProgress,
  detectCodeBlocks,
} from './detectors'

/** Max raw text size we'll attempt to beautify (200KB) */
const MAX_BEAUTIFY_SIZE = 200_000

/**
 * Analyze command output and produce beautified segments.
 *
 * Strategy:
 * 1. Quick-reject: binary content, oversized output
 * 2. Command-based hints narrow down which detectors to prioritize
 * 3. Content-based detection: run detectors in priority order
 * 4. Mark line ranges with detected types, remaining lines become 'ansi'
 * 5. Merge adjacent segments of the same type
 */
export function analyze(command: string, rawText: string): BeautifiedResult {
  const EMPTY: BeautifiedResult = { segments: [], hasRichContent: false }

  if (!rawText || rawText.length === 0) return EMPTY

  // Quick reject: binary content
  const plain = stripAnsi(rawText)
  if (hasBinaryContent(plain)) return fallback(rawText, plain)

  // Quick reject: oversized
  if (rawText.length > MAX_BEAUTIFY_SIZE) return fallback(rawText, plain)

  const hints = getCommandHints(command)
  const lines = plain.split('\n')
  // Track which lines have been claimed by a detector
  // Each element: { type, detectorIndex } or null (unclaimed)
  const claimed: Array<{ type: BeautifiedSegment['type']; idx: number } | null> = new Array(lines.length).fill(null)

  let detectorIdx = 0

  // --- Phase 1: Run detectors in priority order ---

  // 1. JSON detection
  const jsonResults = detectJson(lines)
  for (const jr of jsonResults) {
    claimRange(claimed, jr.startLine, jr.endLine, 'json', detectorIdx)
  }
  detectorIdx++

  // 2. Diff detection (prioritize if hinted)
  if (hints.includes('diff') || !hints.length) {
    const diffResults = detectDiff(lines)
    for (const dr of diffResults) {
      claimRange(claimed, dr.startLine, dr.endLine, 'diff', detectorIdx)
    }
  }
  detectorIdx++

  // 3. Git status (only if hinted)
  if (hints.includes('git-status')) {
    const gitResult = detectGitStatus(lines)
    if (gitResult) {
      claimRange(claimed, gitResult.startLine, gitResult.endLine, 'git-status', detectorIdx)
    }
  }
  detectorIdx++

  // 4. Table detection
  if (hints.includes('table') || !hints.length) {
    const tableResult = detectTable(lines, hints)
    if (tableResult) {
      claimRange(claimed, tableResult.startLine, tableResult.endLine, 'table', detectorIdx)
    }
  }
  detectorIdx++

  // 5. Code block detection
  const codeResults = detectCodeBlocks(lines)
  for (const cr of codeResults) {
    claimRange(claimed, cr.startLine, cr.endLine, 'code', detectorIdx)
  }
  detectorIdx++

  // 6. Log level detection
  if (hints.includes('log') || !hints.length) {
    const logResults = detectLogLevels(lines)
    for (const lr of logResults) {
      claimRange(claimed, lr.startLine, lr.endLine, 'log', detectorIdx)
    }
  }
  detectorIdx++

  // --- Phase 2: Build segments from claimed ranges ---

  const rawLines = rawText.split('\n')
  const segments: BeautifiedSegment[] = []
  let i = 0

  while (i < lines.length) {
    const claim = claimed[i]

    if (!claim) {
      // Unclaimed: accumulate consecutive unclaimed lines into an 'ansi' segment
      const start = i
      while (i < lines.length && !claimed[i]) i++
      segments.push(makeSegment('ansi', rawLines, lines, start, i - 1))
    } else {
      // Claimed: find the end of this claimed range (same type & idx)
      const start = i
      const { type, idx } = claim
      while (i < lines.length && claimed[i]?.type === type && claimed[i]?.idx === idx) i++
      const seg = makeSegment(type, rawLines, lines, start, i - 1)

      // Attach metadata
      attachMeta(seg, type, lines, start, i - 1, jsonResults, codeResults, hints)
      segments.push(seg)
    }
  }

  // --- Phase 3: Progress detection (appended, not a line range) ---
  if (hints.includes('progress')) {
    const progressMeta = detectProgress(lines)
    if (progressMeta) {
      segments.push({
        type: 'progress',
        raw: '',
        content: '',
        meta: progressMeta as unknown as Record<string, unknown>,
      })
    }
  }

  // Merge adjacent 'ansi' segments
  const merged = mergeAdjacentAnsi(segments)

  const hasRichContent = merged.some((s) => s.type !== 'ansi')
  return { segments: merged, hasRichContent }
}

/* ----------------------------------------------------------------
   Internal helpers
   ---------------------------------------------------------------- */

function fallback(rawText: string, plain: string): BeautifiedResult {
  return {
    segments: [{ type: 'ansi', raw: rawText, content: plain }],
    hasRichContent: false,
  }
}

/** Claim a line range for a detector, only if lines are not already claimed */
function claimRange(
  claimed: Array<{ type: BeautifiedSegment['type']; idx: number } | null>,
  start: number,
  end: number,
  type: BeautifiedSegment['type'],
  idx: number,
) {
  for (let i = start; i <= end && i < claimed.length; i++) {
    if (!claimed[i]) {
      claimed[i] = { type, idx }
    }
  }
}

/** Create a segment from a range of lines */
function makeSegment(
  type: BeautifiedSegment['type'],
  rawLines: string[],
  plainLines: string[],
  start: number,
  end: number,
): BeautifiedSegment {
  return {
    type,
    raw: rawLines.slice(start, end + 1).join('\n'),
    content: plainLines.slice(start, end + 1).join('\n'),
  }
}

/** Attach type-specific metadata to a segment */
function attachMeta(
  seg: BeautifiedSegment,
  type: BeautifiedSegment['type'],
  lines: string[],
  start: number,
  end: number,
  jsonResults: ReturnType<typeof detectJson>,
  codeResults: ReturnType<typeof detectCodeBlocks>,
  hints: DetectorHint[],
) {
  switch (type) {
    case 'json': {
      const jr = jsonResults.find((r) => r.startLine === start)
      if (jr) {
        seg.meta = { formatted: jr.formatted, valid: true }
      }
      break
    }
    case 'code': {
      const cr = codeResults.find((r) => r.startLine === start)
      if (cr) {
        seg.language = cr.language
        seg.content = cr.code
        seg.meta = { code: cr.code }
      }
      break
    }
    case 'table': {
      const tableResult = detectTable(lines.slice(start, end + 1), hints)
      if (tableResult) {
        seg.meta = tableResult.meta as unknown as Record<string, unknown>
      }
      break
    }
    case 'git-status': {
      const gitResult = detectGitStatus(lines.slice(start, end + 1))
      if (gitResult) {
        seg.meta = { entries: gitResult.entries }
      }
      break
    }
    case 'log': {
      const logResults = detectLogLevels(lines.slice(start, end + 1))
      if (logResults.length > 0) {
        const allLines = logResults.flatMap((r) => r.lines)
        seg.meta = { lines: allLines }
      }
      break
    }
    case 'diff': {
      const diffResults = detectDiff(lines.slice(start, end + 1))
      if (diffResults.length > 0) {
        const total = diffResults.reduce(
          (acc, d) => ({ additions: acc.additions + d.additions, deletions: acc.deletions + d.deletions }),
          { additions: 0, deletions: 0 },
        )
        seg.meta = total as unknown as Record<string, unknown>
      }
      break
    }
  }
}

/** Merge adjacent 'ansi' segments into one */
function mergeAdjacentAnsi(segments: BeautifiedSegment[]): BeautifiedSegment[] {
  const result: BeautifiedSegment[] = []
  for (const seg of segments) {
    const prev = result[result.length - 1]
    if (prev && prev.type === 'ansi' && seg.type === 'ansi') {
      prev.raw += '\n' + seg.raw
      prev.content += '\n' + seg.content
    } else {
      result.push({ ...seg })
    }
  }
  return result
}
