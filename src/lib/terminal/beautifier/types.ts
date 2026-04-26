/* ================================================================
   Output Beautifier — Type Definitions
   ================================================================ */

export type SegmentType =
  | 'code'
  | 'json'
  | 'table'
  | 'diff'
  | 'git-status'
  | 'log'
  | 'progress'
  | 'ansi'

export interface BeautifiedSegment {
  type: SegmentType
  /** Original text including ANSI escape codes (for copy) */
  raw: string
  /** ANSI-stripped plain text (for detection / display) */
  content: string
  /** Language identifier when type is 'code' */
  language?: string
  /** Type-specific metadata */
  meta?: Record<string, unknown>
}

export interface BeautifiedResult {
  segments: BeautifiedSegment[]
  /** Whether the result contains at least one non-'ansi' segment */
  hasRichContent: boolean
}

/* ----------------------------------------------------------------
   Type-specific metadata interfaces
   ---------------------------------------------------------------- */

export interface TableMeta {
  headers: string[]
  rows: string[][]
  alignments: ('left' | 'right')[]
}

export interface GitStatusEntry {
  status: string
  file: string
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
}

export interface LogLine {
  level: 'error' | 'warn' | 'info' | 'debug'
  text: string
}

export interface ProgressMeta {
  percent?: number
  label?: string
}

export interface DiffMeta {
  additions: number
  deletions: number
}

/** Hint categories derived from command name */
export type DetectorHint =
  | 'git-status'
  | 'diff'
  | 'table'
  | 'json'
  | 'progress'
  | 'log'
