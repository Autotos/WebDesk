/* ================================================================
   Format Detectors — pure functions that identify content types
   Each detector returns matched line ranges or null.
   ================================================================ */

import type {
  TableMeta,
  GitStatusEntry,
  LogLine,
  ProgressMeta,
  DetectorHint,
} from './types'

/* ----------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------- */

/** Strip ANSI escape sequences from text */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
}

/** Check if text contains binary / non-printable characters */
export function hasBinaryContent(text: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\x00-\x08]/.test(text)
}

/* ----------------------------------------------------------------
   JSON Detector
   ---------------------------------------------------------------- */

export interface JsonDetectResult {
  startLine: number
  endLine: number
  formatted: string
  raw: string
}

/**
 * Detect JSON blocks in lines. Returns array of detected JSON regions.
 * Only tries to parse when a line starts with { or [.
 */
export function detectJson(lines: string[]): JsonDetectResult[] {
  const results: JsonDetectResult[] = []
  let i = 0
  while (i < lines.length) {
    const trimmed = lines[i].trimStart()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      // Try accumulating lines until we get valid JSON
      let jsonStr = ''
      let endIdx = i
      for (let j = i; j < lines.length; j++) {
        jsonStr += (j > i ? '\n' : '') + lines[j]
        try {
          const parsed = JSON.parse(jsonStr)
          const formatted = JSON.stringify(parsed, null, 2)
          // Skip overly large JSON (>50KB formatted)
          if (formatted.length <= 50_000) {
            results.push({
              startLine: i,
              endLine: j,
              formatted,
              raw: jsonStr,
            })
          }
          endIdx = j
          break
        } catch {
          endIdx = j
          // If we've accumulated >50KB without valid JSON, give up
          if (jsonStr.length > 50_000) break
        }
      }
      i = endIdx + 1
    } else {
      i++
    }
  }
  return results
}

/* ----------------------------------------------------------------
   Diff Detector
   ---------------------------------------------------------------- */

export interface DiffDetectResult {
  startLine: number
  endLine: number
  additions: number
  deletions: number
}

const DIFF_START = /^diff\s+--git\s/
const DIFF_HEADER = /^(---|\+\+\+)\s/
const DIFF_HUNK = /^@@\s/
const DIFF_ADD = /^\+[^+]/
const DIFF_DEL = /^-[^-]/
const DIFF_CTX = /^\s/

function isDiffLine(line: string): boolean {
  return (
    DIFF_START.test(line) ||
    DIFF_HEADER.test(line) ||
    DIFF_HUNK.test(line) ||
    DIFF_ADD.test(line) ||
    DIFF_DEL.test(line) ||
    DIFF_CTX.test(line)
  )
}

export function detectDiff(lines: string[]): DiffDetectResult[] {
  const results: DiffDetectResult[] = []
  let i = 0
  while (i < lines.length) {
    if (DIFF_START.test(lines[i]) || (DIFF_HEADER.test(lines[i]) && i + 1 < lines.length && DIFF_HEADER.test(lines[i + 1]))) {
      const start = i
      let additions = 0
      let deletions = 0
      while (i < lines.length && (isDiffLine(lines[i]) || lines[i] === '')) {
        if (DIFF_ADD.test(lines[i])) additions++
        if (DIFF_DEL.test(lines[i])) deletions++
        i++
      }
      // Must have at least a hunk to be a real diff
      if (i - start >= 3) {
        results.push({ startLine: start, endLine: i - 1, additions, deletions })
      }
    } else {
      i++
    }
  }
  return results
}

/* ----------------------------------------------------------------
   Git Status Detector
   ---------------------------------------------------------------- */

// Long format patterns
const GIT_LONG_MODIFIED = /^\s+(modified):\s+(.+)$/
const GIT_LONG_NEW = /^\s+(new file):\s+(.+)$/
const GIT_LONG_DELETED = /^\s+(deleted):\s+(.+)$/
const GIT_LONG_RENAMED = /^\s+(renamed):\s+(.+)$/
// Short format pattern: XY filename
const GIT_SHORT = /^([MADRCU?!]{1,2})\s+(.+)$/
// Section headers
const GIT_SECTION = /^(Changes to be committed|Changes not staged|Untracked files|On branch|Your branch|nothing to commit|no changes added)/

function gitStatusColor(status: string): GitStatusEntry['color'] {
  const s = status.toUpperCase()
  if (s === 'D' || s === 'DELETED') return 'red'
  if (s === 'A' || s === 'NEW FILE' || s === '??' || s === '?') return 'green'
  if (s === 'R' || s === 'RENAMED' || s === 'C') return 'blue'
  if (s === 'M' || s === 'MODIFIED' || s === 'MM' || s === 'AM') return 'yellow'
  return 'gray'
}

export interface GitStatusDetectResult {
  startLine: number
  endLine: number
  entries: GitStatusEntry[]
}

export function detectGitStatus(lines: string[]): GitStatusDetectResult | null {
  const entries: GitStatusEntry[] = []
  let startLine = -1
  let endLine = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let match: RegExpMatchArray | null

    // Long format
    if ((match = line.match(GIT_LONG_MODIFIED)) || (match = line.match(GIT_LONG_NEW)) || (match = line.match(GIT_LONG_DELETED)) || (match = line.match(GIT_LONG_RENAMED))) {
      if (startLine < 0) startLine = i
      endLine = i
      entries.push({ status: match[1], file: match[2].trim(), color: gitStatusColor(match[1]) })
    }
    // Short format
    else if ((match = line.match(GIT_SHORT))) {
      if (startLine < 0) startLine = i
      endLine = i
      entries.push({ status: match[1].trim(), file: match[2].trim(), color: gitStatusColor(match[1].trim()) })
    }
    // Section headers and context lines are part of git status
    else if (GIT_SECTION.test(line)) {
      if (startLine < 0) startLine = i
      endLine = i
    }
  }

  if (entries.length === 0) return null
  return { startLine, endLine, entries }
}

/* ----------------------------------------------------------------
   Table Detector
   ---------------------------------------------------------------- */

export interface TableDetectResult {
  startLine: number
  endLine: number
  meta: TableMeta
}

/**
 * Detect table-like columnar output.
 * Strategy: split by 2+ consecutive spaces, check consistent column counts.
 */
export function detectTable(lines: string[], hints: DetectorHint[]): TableDetectResult | null {
  if (lines.length < 2) return null

  // Try ls -l first if hinted
  if (hints.includes('table')) {
    const lsResult = parseLsLong(lines)
    if (lsResult) return lsResult
  }

  // Generic table detection: find runs of lines with consistent column counts
  const cleaned = lines.filter((l) => l.trim() !== '')
  if (cleaned.length < 2) return null

  // Use the first non-empty line as potential header
  const splitLine = (line: string) => line.trim().split(/\s{2,}/)

  const headerCols = splitLine(cleaned[0])
  if (headerCols.length < 2) return null

  const colCount = headerCols.length
  let matchingRows = 0
  const rows: string[][] = []

  for (let i = 1; i < cleaned.length && rows.length < 200; i++) {
    const cols = splitLine(cleaned[i])
    // Allow tolerance of +/- 1 column
    if (cols.length >= colCount - 1 && cols.length <= colCount + 1) {
      matchingRows++
      // Normalize to header column count
      while (cols.length < colCount) cols.push('')
      if (cols.length > colCount) cols.length = colCount
      rows.push(cols)
    }
  }

  // Need at least 2 matching data rows
  if (matchingRows < 2) return null
  // At least 60% of rows should match
  if (matchingRows / (cleaned.length - 1) < 0.6) return null

  // Detect alignment: numeric columns -> right
  const alignments: ('left' | 'right')[] = headerCols.map((_, colIdx) => {
    const numericCount = rows.filter((row) => /^\d[\d,.]*%?$/.test(row[colIdx]?.trim() || '')).length
    return numericCount / rows.length > 0.6 ? 'right' : 'left'
  })

  // Find actual line indices in original array
  const firstLineIdx = lines.indexOf(cleaned[0])
  const lastLineIdx = lines.lastIndexOf(cleaned[Math.min(cleaned.length - 1, rows.length)])

  return {
    startLine: Math.max(0, firstLineIdx),
    endLine: Math.min(lines.length - 1, lastLineIdx >= 0 ? lastLineIdx : lines.length - 1),
    meta: { headers: headerCols, rows, alignments },
  }
}

/**
 * Specialized parser for `ls -l` output
 */
function parseLsLong(lines: string[]): TableDetectResult | null {
  // ls -l output pattern: permissions links owner group size date name
  const LS_LINE =
    /^([drwxlst@-]{10}[.+]?)\s+(\d+)\s+(\S+)\s+(\S+)\s+([\d,.]+\s*[KMGT]?i?)\s+(\w+\s+\d+\s+[\d:]+(?:\s+\d{4})?)\s+(.+)$/

  let startLine = 0
  const rows: string[][] = []

  for (let i = 0; i < lines.length; i++) {
    // Skip "total N" line
    if (/^total\s+\d+/.test(lines[i])) {
      startLine = i
      continue
    }
    const match = lines[i].match(LS_LINE)
    if (match) {
      if (rows.length === 0 && startLine === 0) startLine = i
      rows.push([match[1], match[2], match[3], match[4], match[5].trim(), match[6], match[7]])
    }
  }

  if (rows.length < 1) return null

  return {
    startLine,
    endLine: lines.length - 1,
    meta: {
      headers: ['Permissions', 'Links', 'Owner', 'Group', 'Size', 'Date', 'Name'],
      rows,
      alignments: ['left', 'right', 'left', 'left', 'right', 'left', 'left'],
    },
  }
}

/* ----------------------------------------------------------------
   Log Level Detector
   ---------------------------------------------------------------- */

const LOG_LEVEL_RE = /\b(ERROR|FATAL|WARN(?:ING)?|INFO|DEBUG|TRACE)\b/i

export interface LogDetectResult {
  startLine: number
  endLine: number
  lines: LogLine[]
}

function parseLogLevel(level: string): LogLine['level'] {
  const upper = level.toUpperCase()
  if (upper === 'ERROR' || upper === 'FATAL') return 'error'
  if (upper === 'WARN' || upper === 'WARNING') return 'warn'
  if (upper === 'INFO') return 'info'
  return 'debug'
}

export function detectLogLevels(lines: string[]): LogDetectResult[] {
  const results: LogDetectResult[] = []
  let currentRun: LogLine[] = []
  let runStart = -1
  let noMatchStreak = 0

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(LOG_LEVEL_RE)
    if (match) {
      if (runStart < 0) runStart = i
      noMatchStreak = 0
      currentRun.push({ level: parseLogLevel(match[1]), text: lines[i] })
    } else if (runStart >= 0) {
      noMatchStreak++
      // Include non-matching lines (stack traces etc.) up to 3 lines
      if (noMatchStreak <= 3) {
        // Inherit level from last log line
        const lastLevel = currentRun.length > 0 ? currentRun[currentRun.length - 1].level : 'debug'
        currentRun.push({ level: lastLevel, text: lines[i] })
      } else {
        // End current run
        if (currentRun.length >= 3) {
          results.push({ startLine: runStart, endLine: i - noMatchStreak, lines: [...currentRun.slice(0, -noMatchStreak)] })
        }
        currentRun = []
        runStart = -1
        noMatchStreak = 0
      }
    }
  }

  // Flush remaining
  if (currentRun.length >= 3 && runStart >= 0) {
    results.push({ startLine: runStart, endLine: runStart + currentRun.length - 1, lines: currentRun })
  }

  return results
}

/* ----------------------------------------------------------------
   Progress Detector
   ---------------------------------------------------------------- */

const PROGRESS_PERCENT_RE = /(\d{1,3})%/
const PROGRESS_KEYWORD_RE = /\b(downloading|uploading|installing|extracting|resolving|linking|building|progress|ETA)\b/i

export function detectProgress(lines: string[]): ProgressMeta | null {
  // Only check the last 10 lines
  const tail = lines.slice(-10)
  for (let i = tail.length - 1; i >= 0; i--) {
    const percentMatch = tail[i].match(PROGRESS_PERCENT_RE)
    if (percentMatch) {
      const percent = parseInt(percentMatch[1], 10)
      if (percent >= 0 && percent <= 100) {
        return { percent, label: tail[i].trim() }
      }
    }
    if (PROGRESS_KEYWORD_RE.test(tail[i])) {
      return { label: tail[i].trim() }
    }
  }
  return null
}

/* ----------------------------------------------------------------
   Code Block Detector (markdown fenced code blocks in output)
   ---------------------------------------------------------------- */

export interface CodeDetectResult {
  startLine: number
  endLine: number
  language: string
  code: string
}

export function detectCodeBlocks(lines: string[]): CodeDetectResult[] {
  const results: CodeDetectResult[] = []
  let i = 0
  while (i < lines.length) {
    const fenceMatch = lines[i].match(/^```(\w*)/)
    if (fenceMatch) {
      const language = fenceMatch[1] || 'text'
      const codeLines: string[] = []
      let j = i + 1
      while (j < lines.length && !lines[j].startsWith('```')) {
        codeLines.push(lines[j])
        j++
      }
      if (j < lines.length) {
        results.push({
          startLine: i,
          endLine: j,
          language,
          code: codeLines.join('\n'),
        })
        i = j + 1
        continue
      }
    }
    i++
  }
  return results
}

/* ----------------------------------------------------------------
   File Path Extractor — post-processes ansi HTML to add path links
   ---------------------------------------------------------------- */

const FILE_PATH_RE = /((?:\/[\w.@-]+){2,}(?:\/[\w.@-]*)?)|(\.\/[\w.@\/-]+)/g

/**
 * Wrap file paths in the given HTML with clickable spans.
 * Only matches paths outside of HTML tags.
 */
export function injectFilePathLinks(html: string): string {
  // Simple approach: replace paths that are NOT inside HTML tag attributes
  return html.replace(FILE_PATH_RE, (match) => {
    return `<span class="terminal-file-path" data-path="${match}" title="Click to copy: ${match}">${match}</span>`
  })
}
