import { useState, useEffect, useCallback, useRef } from 'react'
import { getSocket } from '@/lib/socket'

/* ================================================================
   Types
   ================================================================ */

export interface FsChangeEvent {
  event: 'create' | 'modify' | 'delete'
  path: string
  type: 'file' | 'directory'
  isSelfChange: boolean
}

type Subscriber = {
  filter: (e: FsChangeEvent) => boolean
  handler: (e: FsChangeEvent) => void
}

/* ================================================================
   Shared subscriber registry (module-level singleton)

   All useFileSync() hook instances share the same subscriber set
   and the same socket listener, avoiding duplicates.
   ================================================================ */

const subscribers = new Set<Subscriber>()
let listenerAttached = false
let instanceCount = 0

function attachSocketListener() {
  if (listenerAttached) return
  listenerAttached = true

  const socket = getSocket()
  socket.on('fs:change', (data: FsChangeEvent) => {
    for (const sub of subscribers) {
      try {
        if (sub.filter(data)) {
          sub.handler(data)
        }
      } catch {
        // Subscriber error — don't break others
      }
    }
  })
}

/* ================================================================
   Hook
   ================================================================ */

export function useFileSync() {
  const [isConnected, setIsConnected] = useState(false)
  const reconnectCallbacksRef = useRef<Set<() => void>>(new Set())

  useEffect(() => {
    instanceCount++
    attachSocketListener()

    const socket = getSocket()

    function onConnect() {
      setIsConnected(true)
      // Notify reconnect subscribers (fires on every connect including reconnects)
      for (const cb of reconnectCallbacksRef.current) {
        try { cb() } catch { /* ignore */ }
      }
    }
    function onDisconnect() {
      setIsConnected(false)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    // Set initial state
    setIsConnected(socket.connected)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      instanceCount--
    }
  }, [])

  /**
   * Subscribe to fs:change events that pass the filter.
   * Returns an unsubscribe function (for useEffect cleanup).
   */
  const subscribe = useCallback(
    (
      filter: (e: FsChangeEvent) => boolean,
      handler: (e: FsChangeEvent) => void,
    ): (() => void) => {
      const sub: Subscriber = { filter, handler }
      subscribers.add(sub)
      return () => { subscribers.delete(sub) }
    },
    [],
  )

  /**
   * Register a callback that fires on socket reconnection.
   * Returns an unsubscribe function.
   */
  const onReconnect = useCallback((cb: () => void): (() => void) => {
    reconnectCallbacksRef.current.add(cb)
    return () => { reconnectCallbacksRef.current.delete(cb) }
  }, [])

  return { isConnected, subscribe, onReconnect }
}
