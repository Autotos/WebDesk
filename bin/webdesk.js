#!/usr/bin/env node

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

/* ================================================================
   Resolve project root (works through symlinks from npm link)
   ================================================================ */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')

/* ================================================================
   Path constants
   ================================================================ */

const CONFIG_PATH = path.join(PROJECT_ROOT, 'config.json')
const PID_FILE = path.join(PROJECT_ROOT, '.webdesk.pid')
const LOG_DIR = path.join(PROJECT_ROOT, 'logs')
const LOG_FILE = path.join(LOG_DIR, 'webdesk.log')
const SERVER_ENTRY = path.join(PROJECT_ROOT, 'server', 'dist', 'index.js')

/* ================================================================
   Default configuration
   ================================================================ */

const DEFAULTS = {
  host: '0.0.0.0',
  port: 3001,
  rootDir: '~',
}

/* ================================================================
   Utility functions
   ================================================================ */

function loadConfig() {
  let raw = DEFAULTS
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8')
    raw = { ...DEFAULTS, ...JSON.parse(content) }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`\u2716 Failed to parse config.json: ${err.message}`)
      process.exit(1)
    }
    // config.json not found — use defaults
  }

  // Expand ~ in rootDir
  let rootDir = String(raw.rootDir || '~')
  if (rootDir.startsWith('~')) {
    rootDir = rootDir.replace(/^~/, os.homedir())
  }
  rootDir = path.resolve(rootDir)

  return {
    host: String(raw.host || DEFAULTS.host),
    port: Number(raw.port) || DEFAULTS.port,
    rootDir,
  }
}

function readPid() {
  try {
    const content = fs.readFileSync(PID_FILE, 'utf-8').trim()
    const pid = parseInt(content, 10)
    return Number.isFinite(pid) ? pid : null
  } catch {
    return null
  }
}

function writePid(pid) {
  fs.writeFileSync(PID_FILE, String(pid), 'utf-8')
}

function removePid() {
  try {
    fs.unlinkSync(PID_FILE)
  } catch {
    // ignore
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    // EPERM = process exists but we lack permission
    if (err.code === 'EPERM') return true
    // ESRCH = no such process
    return false
  }
}

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readLastLines(filePath, n = 10) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(Boolean)
    return lines.slice(-n).join('\n')
  } catch {
    return ''
  }
}

function displayUrl(host, port) {
  const displayHost = host === '0.0.0.0' ? 'localhost' : host
  return `http://${displayHost}:${port}`
}

/* ================================================================
   Commands
   ================================================================ */

async function cmdStart() {
  // Check if already running
  const existingPid = readPid()
  if (existingPid !== null) {
    if (isProcessRunning(existingPid)) {
      console.log(`\u2139 WebDesk is already running (PID: ${existingPid})`)
      return
    }
    // Stale PID file
    console.log('\u26a0 Stale PID file found, cleaning up...')
    removePid()
  }

  // Load config
  const config = loadConfig()

  // Validate server entry
  if (!fs.existsSync(SERVER_ENTRY)) {
    console.error('\u2716 Server not built. Run `npm run build:all` first.')
    process.exit(1)
  }

  // Validate rootDir
  try {
    const stat = fs.statSync(config.rootDir)
    if (!stat.isDirectory()) {
      console.error(`\u2716 Root directory is not a directory: ${config.rootDir}`)
      process.exit(1)
    }
  } catch {
    console.error(`\u2716 Root directory does not exist: ${config.rootDir}`)
    process.exit(1)
  }

  // Ensure log directory
  ensureLogDir()

  // Open log file (append mode)
  const logFd = fs.openSync(LOG_FILE, 'a')

  // Spawn the server as a detached daemon
  const child = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      HOST: config.host,
      PORT: String(config.port),
      ROOT_DIR: config.rootDir,
      NODE_ENV: 'production',
    },
    detached: true,
    stdio: ['ignore', logFd, logFd],
  })

  child.unref()
  writePid(child.pid)
  fs.closeSync(logFd)

  // Health check — wait a bit and verify process is still alive
  await sleep(600)

  if (!isProcessRunning(child.pid)) {
    const lastLog = readLastLines(LOG_FILE, 8)
    console.error('\u2716 WebDesk failed to start. Last log output:')
    if (lastLog) {
      console.error('  ' + lastLog.split('\n').join('\n  '))
    }
    removePid()
    process.exit(1)
  }

  console.log(`\u2714 WebDesk started (PID: ${child.pid})`)
  console.log(`  URL:      ${displayUrl(config.host, config.port)}`)
  console.log(`  Root:     ${config.rootDir}`)
  console.log(`  Log:      ${LOG_FILE}`)
}

async function cmdStop() {
  const pid = readPid()
  if (pid === null) {
    console.log('\u2139 WebDesk is not running.')
    return
  }

  if (!isProcessRunning(pid)) {
    console.log('\u2139 WebDesk is not running (stale PID file removed).')
    removePid()
    return
  }

  // Send SIGTERM for graceful shutdown
  try {
    process.kill(pid, 'SIGTERM')
  } catch (err) {
    if (err.code === 'EPERM') {
      console.error('\u2716 Permission denied. Try with sudo.')
      process.exit(1)
    }
    throw err
  }

  // Wait for process to exit (up to 5 seconds)
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    await sleep(200)
    if (!isProcessRunning(pid)) {
      removePid()
      console.log(`\u2714 WebDesk stopped (PID: ${pid})`)
      return
    }
  }

  // Force kill
  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    // already dead
  }
  await sleep(500)
  removePid()
  console.log(`\u2714 WebDesk force stopped (PID: ${pid})`)
}

async function cmdRestart() {
  const pid = readPid()
  if (pid !== null && isProcessRunning(pid)) {
    await cmdStop()
  }
  await cmdStart()
}

function cmdStatus() {
  const pid = readPid()
  if (pid === null) {
    console.log('\u25cb WebDesk is stopped.')
    return
  }

  if (!isProcessRunning(pid)) {
    console.log('\u25cb WebDesk is stopped (stale PID file removed).')
    removePid()
    return
  }

  const config = loadConfig()
  console.log('\u25cf WebDesk is running')
  console.log(`  PID:      ${pid}`)
  console.log(`  URL:      ${displayUrl(config.host, config.port)}`)
  console.log(`  Host:     ${config.host}`)
  console.log(`  Port:     ${config.port}`)
  console.log(`  Root:     ${config.rootDir}`)
  console.log(`  Log:      ${LOG_FILE}`)
}

/* ================================================================
   Help text
   ================================================================ */

function printHelp() {
  console.log(`
Usage: webdesk <command>

Commands:
  start     Start WebDesk server in background
  stop      Stop WebDesk server
  restart   Restart WebDesk server
  status    Show WebDesk server status

Configuration:
  Edit config.json in the project root to change host, port, and rootDir.
  Default: { "host": "0.0.0.0", "port": 3001, "rootDir": "~" }
`.trim())
}

/* ================================================================
   Main
   ================================================================ */

const command = process.argv[2]

switch (command) {
  case 'start':
    await cmdStart()
    break
  case 'stop':
    await cmdStop()
    break
  case 'restart':
    await cmdRestart()
    break
  case 'status':
    cmdStatus()
    break
  case '--help':
  case '-h':
  case undefined:
    printHelp()
    break
  default:
    console.error(`Unknown command: ${command}\n`)
    printHelp()
    process.exit(1)
}
