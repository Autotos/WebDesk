import os from 'node:os'
import * as pty from 'node-pty'

/* ================================================================
   Types
   ================================================================ */

interface PtySession {
  id: string
  process: pty.IPty
  cwd: string
}

/* ================================================================
   Session store
   ================================================================ */

const sessions = new Map<string, PtySession>()

/* ================================================================
   Public API
   ================================================================ */

export function createSession(id: string, cwd?: string): PtySession {
  const shell =
    os.platform() === 'win32'
      ? 'cmd.exe'
      : process.env.SHELL || 'bash'

  const initialCwd = cwd || os.homedir()

  const proc = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cwd: initialCwd,
    env: { ...process.env } as Record<string, string>,
    cols: 80,
    rows: 24,
  })

  const session: PtySession = { id, process: proc, cwd: initialCwd }
  sessions.set(id, session)
  return session
}

export function getSession(id: string): PtySession | undefined {
  return sessions.get(id)
}

export function writeToSession(id: string, data: string): void {
  const session = sessions.get(id)
  if (session) session.process.write(data)
}

export function resizeSession(
  id: string,
  cols: number,
  rows: number,
): void {
  const session = sessions.get(id)
  if (session) {
    try {
      session.process.resize(cols, rows)
    } catch {
      // Resize can fail if process already exited
    }
  }
}

export function destroySession(id: string): void {
  const session = sessions.get(id)
  if (session) {
    session.process.kill()
    sessions.delete(id)
  }
}

export function destroyAllSessions(): void {
  for (const [id] of sessions) {
    destroySession(id)
  }
}
