import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { getTerminalSocket } from './socket'
import { XTERM_THEME, XTERM_FONT_FAMILY } from './theme'
import '@xterm/xterm/css/xterm.css'

export interface XtermTerminalProps {
  sessionId: string
  onExit?: (sessionId: string) => void
}

export function XtermTerminal({ sessionId, onExit }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const createdRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Create xterm instance
    const term = new Terminal({
      fontSize: 13,
      fontFamily: XTERM_FONT_FAMILY,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
      theme: XTERM_THEME,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())

    term.open(el)
    termRef.current = term
    fitRef.current = fitAddon

    // Fit to container
    requestAnimationFrame(() => {
      try {
        fitAddon.fit()
      } catch {
        /* ignore */
      }
    })

    // Connect to backend
    const socket = getTerminalSocket()

    // Request PTY session
    if (!createdRef.current) {
      createdRef.current = true
      socket.emit('terminal:create', { sessionId })
    }

    // Receive output from PTY
    const handleOutput = (msg: { sessionId: string; data: string }) => {
      if (msg.sessionId === sessionId) {
        term.write(msg.data)
      }
    }

    const handleExit = (msg: { sessionId: string; exitCode: number }) => {
      if (msg.sessionId === sessionId) {
        term.write(`\r\n\x1b[90m[Process exited with code ${msg.exitCode}]\x1b[0m\r\n`)
        onExit?.(sessionId)
      }
    }

    socket.on('terminal:output', handleOutput)
    socket.on('terminal:exit', handleExit)

    // Send user input to PTY
    const inputDisposable = term.onData((data) => {
      socket.emit('terminal:input', { sessionId, data })
    })

    // Handle resize
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      socket.emit('terminal:resize', { sessionId, cols, rows })
    })

    // ResizeObserver for container size changes
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit()
        } catch {
          /* ignore */
        }
      })
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      inputDisposable.dispose()
      resizeDisposable.dispose()
      socket.off('terminal:output', handleOutput)
      socket.off('terminal:exit', handleExit)
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [sessionId, onExit])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ padding: '4px 0 0 4px' }}
    />
  )
}
