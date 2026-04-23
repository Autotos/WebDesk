import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import express from 'express'
import cors from 'cors'
import { createFsRouter } from './routes/fsRoutes.js'

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

// Mount file system API
app.use('/api/fs', createFsRouter(ROOT_DIR))

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
   Start
   ================================================================ */

app.listen(PORT, HOST, () => {
  console.log(`[webdesk-server] Listening on http://${HOST}:${PORT}`)
  console.log(`[webdesk-server] ROOT_DIR: ${ROOT_DIR}`)
})
