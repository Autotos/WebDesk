import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'
import { Server as SocketIOServer } from 'socket.io'
import { createFsRouter } from './routes/fsRoutes.js'
import { SelfSaveTracker } from './services/selfSaveTracker.js'
import { createFileWatcher } from './services/fileWatcher.js'
import * as ptyService from './services/ptyService.js'

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

app.use('/api/fs', createFsRouter(ROOT_DIR, (absolutePath) => {
  tracker.markSelfWrite(absolutePath)
}))

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

  socket.on('disconnect', () => {
    console.log(`[terminal] Client disconnected: ${socket.id}`)
  })
})

// Cleanup PTY sessions on server shutdown
process.on('SIGINT', () => {
  ptyService.destroyAllSessions()
  process.exit(0)
})
process.on('SIGTERM', () => {
  ptyService.destroyAllSessions()
  process.exit(0)
})

/* ================================================================
   Start
   ================================================================ */

server.listen(PORT, HOST, () => {
  console.log(`[webdesk-server] Listening on http://${HOST}:${PORT}`)
  console.log(`[webdesk-server] ROOT_DIR: ${ROOT_DIR}`)
})
