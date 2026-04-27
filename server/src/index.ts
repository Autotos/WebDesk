import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'
import { Server as SocketIOServer } from 'socket.io'
import { createFsRouter } from './routes/fsRoutes.js'
import { createAiRouter } from './routes/aiRoutes.js'
import { createSkillRouter } from './routes/skillRoutes.js'
import { createBrowserProxyRouter } from './routes/browserProxy.js'
import { SelfSaveTracker } from './services/selfSaveTracker.js'
import { createFileWatcher } from './services/fileWatcher.js'
import * as ptyService from './services/ptyService.js'
import * as blockExec from './services/commandExecService.js'

/* ================================================================
   Tab completion helper
   ================================================================ */

async function getCompletions(
  input: string,
  cwd: string,
): Promise<{ completions: string[]; prefix: string }> {
  const tokens = input.split(/\s+/)
  const partial = tokens[tokens.length - 1] || ''

  let dirToList: string
  let filePrefix: string

  if (partial.includes('/')) {
    const lastSlash = partial.lastIndexOf('/')
    const dirPart = partial.slice(0, lastSlash + 1)
    filePrefix = partial.slice(lastSlash + 1)
    dirToList = dirPart.startsWith('~')
      ? path.join(os.homedir(), dirPart.slice(1))
      : path.resolve(cwd, dirPart)
  } else {
    dirToList = cwd
    filePrefix = partial
  }

  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(dirToList, { withFileTypes: true })
  } catch {
    return { completions: [], prefix: partial }
  }

  const matches = entries
    .filter((e) => e.name.startsWith(filePrefix) && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 50)
    .map((e) => (e.isDirectory() ? e.name + '/' : e.name))

  return { completions: matches, prefix: partial }
}

/* ================================================================
   Server environment snapshot (collected once at startup)
   ================================================================ */

function collectServerEnv() {
  const osType = os.type()            // 'Linux', 'Darwin', 'Windows_NT'
  const osRelease = os.release()      // kernel version
  const arch = os.arch()              // 'x64', 'arm64'
  const hostname = os.hostname()
  const homeDir = os.homedir()
  const nodeVersion = process.version // e.g. 'v20.11.0'

  // Detect default shell
  let shell = process.env.SHELL || ''
  if (shell) {
    // Extract basename: '/usr/bin/zsh' → 'zsh'
    shell = path.basename(shell)
  } else if (osType === 'Windows_NT') {
    shell = 'powershell'
  } else {
    shell = 'sh'
  }

  // Build a human-readable OS description
  let osDesc = osType
  if (osType === 'Linux') {
    try {
      const release = fs.readFileSync('/etc/os-release', 'utf-8')
      const prettyName = release.match(/^PRETTY_NAME="?(.+?)"?\s*$/m)
      if (prettyName) osDesc = prettyName[1]
      else osDesc = `Linux ${osRelease}`
    } catch {
      osDesc = `Linux ${osRelease}`
    }
  } else if (osType === 'Darwin') {
    osDesc = `macOS (${osRelease})`
  } else if (osType === 'Windows_NT') {
    osDesc = `Windows (${osRelease})`
  }

  return { osType, osRelease: osDesc, arch, shell, hostname, homeDir, nodeVersion }
}

const SERVER_ENV = collectServerEnv()

/* ================================================================
   Configuration
   ================================================================ */

const ROOT_DIR = path.resolve(process.env.ROOT_DIR || os.homedir())
const HOST = process.env.HOST || '0.0.0.0'
const PORT = parseInt(process.env.PORT || '3001', 10)

// Validate ROOT_DIR at startup
if (!fs.existsSync(ROOT_DIR) || !fs.statSync(ROOT_DIR).isDirectory()) {
  console.error(`[error] ROOT_DIR does not exist or is not a directory: ${ROOT_DIR}`)
  process.exit(1)
}

/* ================================================================
   Express application
   ================================================================ */

const app = express()

// CORS — allow frontend dev server (Vite)
app.use(cors())

// Body parsing
app.use(express.json({ limit: '15mb' }))

/* ================================================================
   Self-save tracker & file system router
   ================================================================ */

const tracker = new SelfSaveTracker()

app.use(
  '/api/fs',
  createFsRouter(ROOT_DIR, (absolutePath) => {
    tracker.markSelfWrite(absolutePath)
  }),
)

// AI proxy router (stateless — config sent with each request)
app.use('/api/ai', createAiRouter())

// Skills API
app.use('/api/skills', createSkillRouter())

// Browser proxy (fetch & rewrite external pages for iframe embedding)
app.use('/api/browser/proxy', createBrowserProxyRouter())

// Production: serve frontend static files
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(import.meta.dirname, '../../dist')
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath))
    // SPA fallback: all non-API routes serve index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }
}

/* ================================================================
   HTTP Server + Socket.IO
   ================================================================ */

const server = createServer(app)

const io = new SocketIOServer(server, {
  cors: { origin: '*' },
})

io.on('connection', (socket) => {
  console.log(`[socket.io] Client connected: ${socket.id}`)
  socket.on('disconnect', () => {
    console.log(`[socket.io] Client disconnected: ${socket.id}`)
  })
})

/* ================================================================
   File Watcher → Socket.IO broadcast
   ================================================================ */

createFileWatcher(ROOT_DIR, (fsEvent) => {
  const isSelfChange = tracker.consumeSelfWrite(fsEvent.absolutePath)
  io.emit('fs:change', {
    event: fsEvent.event,
    path: fsEvent.path,
    type: fsEvent.type,
    isSelfChange,
  })
})

/* ================================================================
   Terminal namespace — PTY over Socket.IO
   ================================================================ */

const terminalNs = io.of('/terminal')

terminalNs.on('connection', (socket) => {
  console.log(`[terminal] Client connected: ${socket.id}`)

  // Create a new PTY session
  socket.on('terminal:create', (opts: { sessionId: string; cwd?: string }) => {
    const { sessionId, cwd } = opts

    if (ptyService.getSession(sessionId)) {
      socket.emit('terminal:error', { sessionId, message: 'Session already exists' })
      return
    }

    const session = ptyService.createSession(sessionId, cwd || ROOT_DIR)

    session.process.onData((data) => {
      socket.emit('terminal:output', { sessionId, data })
    })

    session.process.onExit(({ exitCode }) => {
      socket.emit('terminal:exit', { sessionId, exitCode })
      ptyService.destroySession(sessionId)
    })

    socket.emit('terminal:created', { sessionId })
  })

  // Client sends keystrokes
  socket.on('terminal:input', (msg: { sessionId: string; data: string }) => {
    ptyService.writeToSession(msg.sessionId, msg.data)
  })

  // Client requests resize
  socket.on('terminal:resize', (msg: { sessionId: string; cols: number; rows: number }) => {
    ptyService.resizeSession(msg.sessionId, msg.cols, msg.rows)
  })

  // Client destroys a session
  socket.on('terminal:destroy', (msg: { sessionId: string }) => {
    ptyService.destroySession(msg.sessionId)
  })

  /* --------------------------------------------------------------
     Block-mode execution (separate from PTY — uses child_process)
     -------------------------------------------------------------- */

  socket.on(
    'terminal:block-session-create',
    (opts: { sessionId: string; cwd?: string }) => {
      const blockId = `block-${socket.id}`
      blockExec.createBlockSession(blockId, opts.cwd || ROOT_DIR)
      socket.emit('terminal:block-session-created', {
        sessionId: blockId,
        cwd: opts.cwd || ROOT_DIR,
        env: SERVER_ENV,
      })
    },
  )

  socket.on(
    'terminal:exec',
    (msg: { commandId: string; command: string }) => {
      const blockId = `block-${socket.id}`
      blockExec.executeCommand(blockId, msg.commandId, msg.command, {
        onStdout: (data) => {
          socket.emit('terminal:exec-output', {
            commandId: msg.commandId,
            type: 'stdout',
            data,
          })
        },
        onStderr: (data) => {
          socket.emit('terminal:exec-output', {
            commandId: msg.commandId,
            type: 'stderr',
            data,
          })
        },
        onDone: (exitCode, duration) => {
          const cwd = blockExec.getSessionCwd(blockId)
          socket.emit('terminal:exec-done', {
            commandId: msg.commandId,
            exitCode,
            duration,
            cwd,
          })
        },
      })
    },
  )

  socket.on('terminal:exec-cancel', (msg: { commandId: string }) => {
    blockExec.cancelCommand(msg.commandId)
  })

  socket.on('terminal:block-session-destroy', () => {
    blockExec.destroyBlockSession(`block-${socket.id}`)
  })

  /* --------------------------------------------------------------
     Sudo password management for block-mode sessions
     -------------------------------------------------------------- */

  socket.on(
    'terminal:set-sudo-password',
    (msg: { password: string }) => {
      const blockId = `block-${socket.id}`
      blockExec.setSudoPassword(blockId, msg.password)
    },
  )

  socket.on('terminal:clear-sudo-password', () => {
    const blockId = `block-${socket.id}`
    blockExec.clearSudoPassword(blockId)
  })

  /* --------------------------------------------------------------
     Tab completion — file/directory path suggestions
     -------------------------------------------------------------- */

  socket.on(
    'terminal:complete',
    async (
      msg: { input: string; cwd: string },
      callback: (results: { completions: string[]; prefix: string }) => void,
    ) => {
      try {
        const completions = await getCompletions(msg.input, msg.cwd || ROOT_DIR)
        callback(completions)
      } catch {
        callback({ completions: [], prefix: '' })
      }
    },
  )

  socket.on('disconnect', () => {
    blockExec.destroyBlockSession(`block-${socket.id}`)
    console.log(`[terminal] Client disconnected: ${socket.id}`)
  })
})

// Cleanup sessions on server shutdown
process.on('SIGINT', () => {
  ptyService.destroyAllSessions()
  blockExec.destroyAllBlockSessions()
  process.exit(0)
})
process.on('SIGTERM', () => {
  ptyService.destroyAllSessions()
  blockExec.destroyAllBlockSessions()
  process.exit(0)
})

/* ================================================================
   Start
   ================================================================ */

server.listen(PORT, HOST, () => {
  console.log(`[webdesk-server] Listening on http://${HOST}:${PORT}`)
  console.log(`[webdesk-server] ROOT_DIR: ${ROOT_DIR}`)
})
