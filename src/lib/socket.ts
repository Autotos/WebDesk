import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

/**
 * Get the shared Socket.IO client instance (lazy-initialized).
 * Connects to the same origin — works with Vite proxy in dev
 * and same Express server in production.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
  }
  return socket
}
