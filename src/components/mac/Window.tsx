import { useCallback, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDesktopStore, type WindowState } from '@/store/useDesktopStore'

interface WindowProps {
  window: WindowState
  isTopWindow: boolean
  children?: ReactNode
}

type ResizeDirection =
  | 'n' | 's' | 'e' | 'w'
  | 'ne' | 'nw' | 'se' | 'sw'

const RESIZE_HANDLES: { dir: ResizeDirection; className: string; cursor: string }[] = [
  { dir: 'n',  className: 'top-0 left-2 right-2 h-1',                        cursor: 'ns-resize' },
  { dir: 's',  className: 'bottom-0 left-2 right-2 h-1',                     cursor: 'ns-resize' },
  { dir: 'e',  className: 'top-2 bottom-2 right-0 w-1',                      cursor: 'ew-resize' },
  { dir: 'w',  className: 'top-2 bottom-2 left-0 w-1',                       cursor: 'ew-resize' },
  { dir: 'ne', className: 'top-0 right-0 w-3 h-3',                           cursor: 'nesw-resize' },
  { dir: 'nw', className: 'top-0 left-0 w-3 h-3',                            cursor: 'nwse-resize' },
  { dir: 'se', className: 'bottom-0 right-0 w-3 h-3',                        cursor: 'nwse-resize' },
  { dir: 'sw', className: 'bottom-0 left-0 w-3 h-3',                         cursor: 'nesw-resize' },
]

const TOPBAR_H = 28
const DOCK_H = 70
const MIN_VISIBLE_TITLEBAR = 40

export function Window({ window: win, isTopWindow, children }: WindowProps) {
  const {
    closeWindow,
    focusWindow,
    toggleMaximize,
    toggleMinimize,
    updateWindowPosition,
    updateWindowSize,
  } = useDesktopStore()

  // ---- Drag logic ----
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const handleTitlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (win.isMaximized) return
      e.preventDefault()
      focusWindow(win.id)

      const origX = win.position.x
      const origY = win.position.y
      const startX = e.clientX
      const startY = e.clientY
      dragRef.current = { startX, startY, origX, origY }

      const handleMove = (ev: PointerEvent) => {
        if (!dragRef.current) return
        let newX = dragRef.current.origX + (ev.clientX - dragRef.current.startX)
        let newY = dragRef.current.origY + (ev.clientY - dragRef.current.startY)

        // Constrain: keep at least part of the titlebar visible
        newY = Math.max(TOPBAR_H, newY)
        newY = Math.min(window.innerHeight - MIN_VISIBLE_TITLEBAR, newY)
        newX = Math.max(-win.size.width + MIN_VISIBLE_TITLEBAR * 2, newX)
        newX = Math.min(window.innerWidth - MIN_VISIBLE_TITLEBAR * 2, newX)

        updateWindowPosition(win.id, { x: newX, y: newY })
      }

      const handleUp = () => {
        dragRef.current = null
        document.removeEventListener('pointermove', handleMove)
        document.removeEventListener('pointerup', handleUp)
      }

      document.addEventListener('pointermove', handleMove)
      document.addEventListener('pointerup', handleUp)
    },
    [win.id, win.position.x, win.position.y, win.size.width, win.isMaximized, focusWindow, updateWindowPosition]
  )

  // ---- Resize logic ----
  const resizeRef = useRef<{
    dir: ResizeDirection
    startX: number; startY: number
    origX: number; origY: number
    origW: number; origH: number
  } | null>(null)

  const handleResizePointerDown = useCallback(
    (dir: ResizeDirection, e: React.PointerEvent) => {
      if (win.isMaximized) return
      e.preventDefault()
      e.stopPropagation()
      focusWindow(win.id)

      resizeRef.current = {
        dir,
        startX: e.clientX,
        startY: e.clientY,
        origX: win.position.x,
        origY: win.position.y,
        origW: win.size.width,
        origH: win.size.height,
      }

      const handleMove = (ev: PointerEvent) => {
        if (!resizeRef.current) return
        const { dir: d, startX, startY, origX, origY, origW, origH } = resizeRef.current
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY

        let newX = origX
        let newY = origY
        let newW = origW
        let newH = origH

        // Horizontal
        if (d.includes('e')) newW = origW + dx
        if (d.includes('w')) { newW = origW - dx; newX = origX + dx }

        // Vertical
        if (d.includes('s')) newH = origH + dy
        if (d.includes('n')) { newH = origH - dy; newY = origY + dy }

        // Enforce minimum size
        if (newW < win.minSize.width) {
          if (d.includes('w')) newX = origX + origW - win.minSize.width
          newW = win.minSize.width
        }
        if (newH < win.minSize.height) {
          if (d.includes('n')) newY = origY + origH - win.minSize.height
          newH = win.minSize.height
        }

        updateWindowPosition(win.id, { x: newX, y: newY })
        updateWindowSize(win.id, { width: newW, height: newH })
      }

      const handleUp = () => {
        resizeRef.current = null
        document.removeEventListener('pointermove', handleMove)
        document.removeEventListener('pointerup', handleUp)
      }

      document.addEventListener('pointermove', handleMove)
      document.addEventListener('pointerup', handleUp)
    },
    [win.id, win.position, win.size, win.minSize, win.isMaximized, focusWindow, updateWindowPosition, updateWindowSize]
  )

  return (
    <AnimatePresence>
      {!win.isMinimized && (
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.88 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={cn('absolute', win.isMaximized && 'transition-all duration-200')}
          style={
            win.isMaximized
              ? {
                  top: TOPBAR_H,
                  left: 0,
                  right: 0,
                  bottom: DOCK_H,
                  width: '100%',
                  height: `calc(100vh - ${TOPBAR_H}px - ${DOCK_H}px)`,
                  zIndex: win.zIndex,
                }
              : {
                  top: win.position.y,
                  left: win.position.x,
                  width: win.size.width,
                  height: win.size.height,
                  zIndex: win.zIndex,
                }
          }
          onPointerDown={() => focusWindow(win.id)}
        >
          <div
            className={cn(
              'flex flex-col h-full rounded-window overflow-hidden',
              'border border-black/[0.08]',
              isTopWindow
                ? 'shadow-window-active bg-mac-window'
                : 'shadow-window bg-mac-window/95'
            )}
          >
            {/* Title bar */}
            <div
              className={cn(
                'os-chrome flex items-center h-[38px] shrink-0 px-3',
                'border-b border-mac-border/40',
                isTopWindow
                  ? 'bg-mac-titlebar'
                  : 'bg-mac-titlebar/70'
              )}
              onPointerDown={handleTitlePointerDown}
              onDoubleClick={() => toggleMaximize(win.id)}
            >
              {/* Traffic lights */}
              <div className="flex items-center gap-2 mr-4 group/tl">
                <button
                  onClick={(e) => { e.stopPropagation(); closeWindow(win.id) }}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all flex items-center justify-center',
                    isTopWindow ? 'bg-mac-close' : 'bg-mac-border'
                  )}
                >
                  <svg className="w-[6px] h-[6px] opacity-0 group-hover/tl:opacity-100" viewBox="0 0 6 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                    <line x1="1" y1="1" x2="5" y2="5" className="text-black/60" />
                    <line x1="5" y1="1" x2="1" y2="5" className="text-black/60" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMinimize(win.id) }}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all flex items-center justify-center',
                    isTopWindow ? 'bg-mac-minimize' : 'bg-mac-border'
                  )}
                >
                  <svg className="w-[6px] h-[6px] opacity-0 group-hover/tl:opacity-100" viewBox="0 0 6 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                    <line x1="1" y1="3" x2="5" y2="3" className="text-black/60" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMaximize(win.id) }}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all flex items-center justify-center',
                    isTopWindow ? 'bg-mac-maximize' : 'bg-mac-border'
                  )}
                >
                  <svg className="w-[6px] h-[6px] opacity-0 group-hover/tl:opacity-100" viewBox="0 0 6 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                    {win.isMaximized ? (
                      /* Restore icon: two overlapping squares */
                      <>
                        <rect x="0.5" y="1.5" width="3.5" height="3.5" className="text-black/60" strokeWidth="0.8" />
                        <rect x="2" y="0.5" width="3.5" height="3.5" className="text-black/60" strokeWidth="0.8" />
                      </>
                    ) : (
                      /* Maximize icon: diagonal expand arrows */
                      <>
                        <polyline points="1,5 1,1 5,1" className="text-black/60" strokeWidth="0.9" fill="none" />
                        <polyline points="5,1 5,5 1,5" className="text-black/60" strokeWidth="0.9" fill="none" />
                      </>
                    )}
                  </svg>
                </button>
              </div>

              {/* Title */}
              <span className={cn(
                'flex-1 text-center text-[13px] font-medium truncate',
                isTopWindow ? 'text-foreground/80' : 'text-foreground/50'
              )}>
                {win.title}
              </span>

              {/* Spacer for centering */}
              <div className="w-[60px]" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto scrollbar-thin">
              {children ?? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {win.title}
                </div>
              )}
            </div>
          </div>

          {/* Resize handles (only when not maximized) */}
          {!win.isMaximized && RESIZE_HANDLES.map(({ dir, className, cursor }) => (
            <div
              key={dir}
              className={cn('absolute z-10', className)}
              style={{ cursor }}
              onPointerDown={(e) => handleResizePointerDown(dir, e)}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
