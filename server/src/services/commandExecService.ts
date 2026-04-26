/* ================================================================
   Command Execution Service (Block Mode)
   Runs shell commands via child_process.spawn with structured
   stdout/stderr capture. Separate from ptyService which handles
   raw terminal mode and Code Editor's integrated terminal.
   ================================================================ */

import { spawn, type ChildProcess } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */

interface BlockSession {
  id: string
  cwd: string
  sudoPassword?: string
}

interface ExecCallbacks {
  onStdout: (data: string) => void
  onStderr: (data: string) => void
  onDone: (exitCode: number, duration: number) => void
}

/* ----------------------------------------------------------------
   State
   ---------------------------------------------------------------- */

const sessions = new Map<string, BlockSession>()
const runningCommands = new Map<string, ChildProcess>()

const DEFAULT_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const SHELL = os.platform() === 'win32' ? 'cmd.exe' : process.env.SHELL || '/bin/bash'

/* ----------------------------------------------------------------
   Session Management
   ---------------------------------------------------------------- */

export function createBlockSession(id: string, initialCwd?: string): void {
  const cwd = initialCwd || os.homedir()
  sessions.set(id, { id, cwd })
}

export function getSessionCwd(id: string): string | null {
  return sessions.get(id)?.cwd ?? null
}

export function destroyBlockSession(id: string): void {
  sessions.delete(id)
}

export function setSudoPassword(sessionId: string, password: string): void {
  const session = sessions.get(sessionId)
  if (session) {
    session.sudoPassword = password
  }
}

export function clearSudoPassword(sessionId: string): void {
  const session = sessions.get(sessionId)
  if (session) {
    session.sudoPassword = undefined
  }
}

export function destroyAllBlockSessions(): void {
  // Kill any running commands
  for (const [cmdId, proc] of runningCommands) {
    try { proc.kill('SIGTERM') } catch { /* ignore */ }
    runningCommands.delete(cmdId)
  }
  sessions.clear()
}

/* ----------------------------------------------------------------
   Command Execution
   ---------------------------------------------------------------- */

export function executeCommand(
  sessionId: string,
  commandId: string,
  command: string,
  callbacks: ExecCallbacks,
): void {
  const session = sessions.get(sessionId)
  if (!session) {
    callbacks.onStderr(`Block session not found: ${sessionId}`)
    callbacks.onDone(1, 0)
    return
  }

  const startTime = Date.now()
  const trimmed = command.trim()

  // Handle pure cd commands by changing cwd directly
  const cdMatch = trimmed.match(/^cd\s+(.+)$/)
  if (cdMatch) {
    handleCd(session, cdMatch[1], commandId, callbacks, startTime)
    return
  }

  // Verify cwd exists, fallback to home
  let cwd = session.cwd
  if (!fs.existsSync(cwd)) {
    cwd = os.homedir()
    session.cwd = cwd
  }

  // Detect sudo commands: if session has a cached password, rewrite sudo → sudo -S
  // so the password can be piped through stdin
  const needsSudoPassword = /(?:^|&&|;|\|)\s*sudo\s/.test(trimmed) && !!session.sudoPassword
  let execCommand = trimmed
  if (needsSudoPassword) {
    // Insert -S flag after each 'sudo' that doesn't already have -S
    execCommand = trimmed.replace(/\bsudo\s+(?!-S)/g, 'sudo -S ')
  }

  // Spawn the command with shell
  const shellArgs = os.platform() === 'win32' ? ['/c', execCommand] : ['-c', execCommand]
  const child = spawn(SHELL, shellArgs, {
    cwd,
    env: { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '1' },
    stdio: [needsSudoPassword ? 'pipe' : 'ignore', 'pipe', 'pipe'],
  })

  // Pipe sudo password to stdin if needed
  if (needsSudoPassword && child.stdin && session.sudoPassword) {
    child.stdin.write(session.sudoPassword + '\n')
    child.stdin.end()
  }

  runningCommands.set(commandId, child)

  child.stdout?.on('data', (chunk: Buffer) => {
    callbacks.onStdout(chunk.toString())
  })

  child.stderr?.on('data', (chunk: Buffer) => {
    callbacks.onStderr(chunk.toString())
  })

  child.on('close', (code) => {
    runningCommands.delete(commandId)
    const duration = Date.now() - startTime
    callbacks.onDone(code ?? 1, duration)
  })

  child.on('error', (err) => {
    runningCommands.delete(commandId)
    const duration = Date.now() - startTime
    callbacks.onStderr(`Process error: ${err.message}`)
    callbacks.onDone(1, duration)
  })

  // Timeout guard
  setTimeout(() => {
    if (runningCommands.has(commandId)) {
      try { child.kill('SIGTERM') } catch { /* ignore */ }
      runningCommands.delete(commandId)
      callbacks.onStderr(`\nCommand timed out after ${DEFAULT_TIMEOUT / 1000}s`)
      callbacks.onDone(124, Date.now() - startTime)
    }
  }, DEFAULT_TIMEOUT)
}

/* ----------------------------------------------------------------
   Cancel Command
   ---------------------------------------------------------------- */

export function cancelCommand(commandId: string): boolean {
  const proc = runningCommands.get(commandId)
  if (!proc) return false

  try {
    proc.kill('SIGTERM')
    // Force kill after 3s if still alive
    setTimeout(() => {
      try { proc.kill('SIGKILL') } catch { /* ignore */ }
    }, 3000)
  } catch { /* ignore */ }

  runningCommands.delete(commandId)
  return true
}

/* ----------------------------------------------------------------
   Internal: cd handling
   ---------------------------------------------------------------- */

function handleCd(
  session: BlockSession,
  target: string,
  _commandId: string,
  callbacks: ExecCallbacks,
  startTime: number,
): void {
  // Expand ~ to home directory
  let resolved = target.trim().replace(/^~/, os.homedir())

  // Resolve relative paths against current cwd
  if (!path.isAbsolute(resolved)) {
    resolved = path.resolve(session.cwd, resolved)
  }

  // Normalize
  resolved = path.normalize(resolved)

  if (!fs.existsSync(resolved)) {
    callbacks.onStderr(`cd: no such file or directory: ${target}`)
    callbacks.onDone(1, Date.now() - startTime)
    return
  }

  try {
    const stat = fs.statSync(resolved)
    if (!stat.isDirectory()) {
      callbacks.onStderr(`cd: not a directory: ${target}`)
      callbacks.onDone(1, Date.now() - startTime)
      return
    }
  } catch {
    callbacks.onStderr(`cd: permission denied: ${target}`)
    callbacks.onDone(1, Date.now() - startTime)
    return
  }

  session.cwd = resolved
  callbacks.onDone(0, Date.now() - startTime)
}
