import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { APP_REGISTRY } from '@/components/apps/appRegistry'

interface AppGridProps {
  onOpenApp: (appId: string) => void
  /** App IDs to exclude (shown in dock instead) */
  excludeIds?: string[]
}

const COLS = 4
const ROWS_PER_PAGE = 4
const APPS_PER_PAGE = COLS * ROWS_PER_PAGE
const SWIPE_THRESHOLD = 50

export function AppGrid({ onOpenApp, excludeIds = [] }: AppGridProps) {
  const [currentPage, setCurrentPage] = useState(0)

  const gridApps = useMemo(
    () => APP_REGISTRY.filter((a) => !excludeIds.includes(a.id)),
    [excludeIds]
  )

  const pages = useMemo(() => {
    const result: typeof gridApps[] = []
    for (let i = 0; i < gridApps.length; i += APPS_PER_PAGE) {
      result.push(gridApps.slice(i, i + APPS_PER_PAGE))
    }
    return result.length > 0 ? result : [[] as typeof gridApps]
  }, [gridApps])

  const totalPages = pages.length

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x < -SWIPE_THRESHOLD && currentPage < totalPages - 1) {
        setCurrentPage((p) => p + 1)
      } else if (info.offset.x > SWIPE_THRESHOLD && currentPage > 0) {
        setCurrentPage((p) => p - 1)
      }
    },
    [currentPage, totalPages]
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Swipeable pages */}
      <div className="flex-1 relative">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={currentPage}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 px-6 pt-6 pb-2"
          >
            <div
              className="grid gap-y-5 gap-x-3 max-w-sm mx-auto h-full content-start"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            >
              {pages[currentPage].map((app, i) => (
                <AppIcon
                  key={app.id}
                  app={app}
                  index={i}
                  onOpen={() => onOpenApp(app.id)}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Page dots */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-3 pt-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all duration-200',
                i === currentPage
                  ? 'bg-white w-4'
                  : 'bg-white/40'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---- Individual app icon with ripple ---- */

interface AppIconProps {
  app: (typeof APP_REGISTRY)[number]
  index: number
  onOpen: () => void
}

function AppIcon({ app, index, onOpen }: AppIconProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null)
  const rippleKey = useRef(0)
  const Icon = app.icon

  const handleTap = useCallback(
    (e: React.PointerEvent) => {
      const btn = btnRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      rippleKey.current += 1
      setRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        key: rippleKey.current,
      })
      // Delay open slightly so ripple is visible
      setTimeout(onOpen, 150)
    },
    [onOpen]
  )

  return (
    <motion.button
      ref={btnRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-1.5 relative"
      onPointerDown={handleTap}
    >
      <div
        className={cn(
          'w-[var(--android-icon-size)] h-[var(--android-icon-size)]',
          'rounded-android-icon flex items-center justify-center',
          'shadow-android-card relative overflow-hidden',
          'active:scale-90 transition-transform duration-150',
          app.iconBg
        )}
      >
        <Icon className="w-6 h-6 text-white relative z-[1]" strokeWidth={1.5} />

        {/* Ripple */}
        <AnimatePresence>
          {ripple && (
            <motion.span
              key={ripple.key}
              initial={{ scale: 0, opacity: 0.4 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              onAnimationComplete={() => setRipple(null)}
              className="absolute rounded-full bg-white/30 w-8 h-8 pointer-events-none"
              style={{
                left: ripple.x - 16,
                top: ripple.y - 16,
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <span className="text-[11px] font-medium text-white drop-shadow-sm truncate max-w-[64px] text-center">
        {app.name}
      </span>
    </motion.button>
  )
}
