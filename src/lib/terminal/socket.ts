import { io, type Socket } from 'socket.io-client'

/** Lazy singleton Socket.IO connection to the /terminal namespace */
let termSocket: Socket | null = null

export function getTerminalSocket(): Socket {
  if (!termSocket) {
    termSocket = io('/terminal', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
  }
  return termSocket
}

/** Destroy a PTY session on the server */
export function destroyTerminalSession(sessionId: string): void {
  getTerminalSocket().emit('terminal:destroy', { sessionId })
}
