/* ================================================================
   Warp Terminal — Shared Types
   Used by frontend components, store, and backend socket events.
   ================================================================ */

/* ----------------------------------------------------------------
   Task System
   ---------------------------------------------------------------- */

export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled'

export interface Task {
  id: string
  description: string
  command: string
  cwd?: string
  status: TaskStatus
  commandBlockId?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
  source: 'manual' | 'ai'
}

/* ----------------------------------------------------------------
   Command Block
   ---------------------------------------------------------------- */

export interface OutputChunk {
  type: 'stdout' | 'stderr' | 'system'
  text: string
  timestamp: number
}

export interface CommandBlock {
  id: string
  command: string
  taskId?: string
  output: OutputChunk[]
  exitCode?: number
  duration?: number
  status: 'running' | 'done' | 'error'
  startedAt: number
  cwd: string
}

/* ----------------------------------------------------------------
   Terminal Mode
   ---------------------------------------------------------------- */

export type TerminalMode = 'block' | 'raw'

/* ----------------------------------------------------------------
   Socket.IO Event Payloads (Block Mode)
   ---------------------------------------------------------------- */

export interface ExecRequest {
  commandId: string
  command: string
  cwd?: string
}

export interface ExecOutputEvent {
  commandId: string
  type: 'stdout' | 'stderr'
  data: string
}

export interface ExecDoneEvent {
  commandId: string
  exitCode: number
  duration: number
}

/* ----------------------------------------------------------------
   Server Environment Info (returned by block-session-created)
   ---------------------------------------------------------------- */

export interface ServerEnvInfo {
  /** e.g. 'Linux', 'Darwin', 'Windows_NT' */
  osType: string
  /** e.g. 'Ubuntu 22.04', 'macOS 14.2', 'Windows 11' */
  osRelease: string
  /** e.g. 'x64', 'arm64' */
  arch: string
  /** e.g. 'bash', 'zsh', 'powershell' */
  shell: string
  /** server hostname */
  hostname: string
  /** Node.js version running the server */
  nodeVersion: string
  /** home directory */
  homeDir: string
}

/* ----------------------------------------------------------------
   Skill System
   ---------------------------------------------------------------- */

export interface SkillDefinition {
  id: string
  name: string
  description: string
  icon: string
  keywords: string[]
  systemPrompt: string
  builtIn: boolean
}
