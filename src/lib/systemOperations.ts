import { getSocket } from '@/lib/socket'
import { getTerminalSocket } from '@/lib/terminal/socket'

/* ================================================================
   System Operations Manager
   Handles shutdown & restart lifecycle for WebDesk.
   ================================================================ */

export type ShutdownPhase =
  | 'idle'
  | 'closing-apps'
  | 'disconnecting'
  | 'clearing-cache'
  | 'done'

export interface ShutdownProgress {
  phase: ShutdownPhase
  message: string
}

type ProgressCallback = (progress: ShutdownProgress) => void

/**
 * Run the full shutdown sequence:
 *  1. Close all app windows / clear app state
 *  2. Disconnect WebSocket connections
 *  3. (Optional) Clear caches
 *  4. Display black screen / unload
 */
async function runShutdownSequence(
  onProgress: ProgressCallback,
  clearStorage: boolean,
): Promise<void> {
  // Phase 1: Close apps
  onProgress({ phase: 'closing-apps', message: '正在关闭所有应用...' })
  await delay(600)

  // Phase 2: Disconnect sockets
  onProgress({ phase: 'disconnecting', message: '正在断开连接...' })
  try {
    getSocket().disconnect()
  } catch {
    // socket may not be initialized
  }
  try {
    getTerminalSocket().disconnect()
  } catch {
    // terminal socket may not be initialized
  }
  await delay(400)

  // Phase 3: Clear cache
  if (clearStorage) {
    onProgress({ phase: 'clearing-cache', message: '正在清理缓存...' })
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('webdesk-')) keys.push(key)
    }
    keys.forEach((k) => localStorage.removeItem(k))
    await delay(300)
  }

  // Phase 4: Done
  onProgress({ phase: 'done', message: '系统已关闭' })
  await delay(200)
}

/**
 * Shut down WebDesk — clears state, disconnects, and replaces the page
 * with a black "powered off" screen.
 */
export async function shutdownSystem(onProgress: ProgressCallback): Promise<void> {
  await runShutdownSequence(onProgress, false)

  // Replace the page with a blank powered-off screen
  document.documentElement.innerHTML = `
    <head><title>WebDesk</title><style>
      body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif}
      .msg{color:#555;font-size:14px;text-align:center}
      .msg span{display:block;margin-top:8px;color:#333;font-size:12px;cursor:pointer}
      .msg span:hover{color:#888}
    </style></head>
    <body><div class="msg">WebDesk 已关机<span onclick="location.reload()">点击此处重新启动</span></div></body>
  `
}

/**
 * Restart WebDesk — runs the shutdown sequence then reloads the page.
 */
export async function restartSystem(onProgress: ProgressCallback): Promise<void> {
  await runShutdownSequence(onProgress, false)
  window.location.reload()
}

/* ================================================================
   Utility
   ================================================================ */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
