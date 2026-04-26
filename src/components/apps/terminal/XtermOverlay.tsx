import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { getTerminalSocket } from '@/lib/terminal/socket'
import { XTERM_THEME, XTERM_FONT_FAMILY } from '@/lib/terminal/theme'
import '@xterm/xterm/css/xterm.css'

/* ================================================================
   XtermOverlay — Full-screen xterm for raw PTY mode.
   Overlays on top of the block scroll area when mode === 'raw'.
   ================================================================ */

interface XtermOverlayProps {
  sessionId: string
  visible: boolean
  onSessionReady?: (sessionId: string) => void
  onExit?: (sessionId: string) => void
}

export function XtermOverlay({
  sessionId,
  visible,
  onSessionReady,
  onExit,
}: XtermOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const createdRef = useRef(false)

  // Create or destroy terminal based on visibility
  useEffect(() => {
    if (!visible || !containerRef.current) return

    const el = containerRef.current

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

    requestAnimationFrame(() => {
      try {
        fitAddon.fit()
      } catch {
        /* ignore */
      }
    })

    const socket = getTerminalSocket()

    if (!createdRef.current) {
      createdRef.current = true
      socket.emit('terminal:create', { sessionId })
    }

    const handleOutput = (msg: { sessionId: string; data: string }) => {
      if (msg.sessionId === sessionId) {
        term.write(msg.data)
      }
    }

    const handleCreated = (msg: { sessionId: string }) => {
      if (msg.sessionId === sessionId) {
        onSessionReady?.(sessionId)
      }
    }

    const handleExit = (msg: { sessionId: string; exitCode: number }) => {
      if (msg.sessionId === sessionId) {
        term.write(`\r\n\x1b[90m[Process exited with code ${msg.exitCode}]\x1b[0m\r\n`)
        onExit?.(sessionId)
      }
    }

    socket.on('terminal:output', handleOutput)
    socket.on('terminal:created', handleCreated)
    socket.on('terminal:exit', handleExit)

    const inputDisposable = term.onData((data) => {
      socket.emit('terminal:input', { sessionId, data })
    })

    const resizeDisposable = term.onResize(({ cols, rows }) => {
      socket.emit('terminal:resize', { sessionId, cols, rows })
    })

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

    // Focus the terminal
    term.focus()

    return () => {
      observer.disconnect()
      inputDisposable.dispose()
      resizeDisposable.dispose()
      socket.off('terminal:output', handleOutput)
      socket.off('terminal:created', handleCreated)
      socket.off('terminal:exit', handleExit)
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [visible, sessionId, onSessionReady, onExit])

  // Focus terminal on click
  const handleClick = useCallback(() => {
    termRef.current?.focus()
  }, [])

  if (!visible) return null

  return (
    <div
      className="absolute inset-0 z-10 bg-[#1e1e2e]"
      onClick={handleClick}
    >
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ padding: '4px 0 0 4px' }}
      />
    </div>
  )
}
