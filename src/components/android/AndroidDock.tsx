import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { APP_REGISTRY } from '@/components/apps/appRegistry'

/** IDs of apps pinned to the bottom dock */
export const ANDROID_DOCK_APP_IDS = [
  'finder',
  'browser',
  'code-editor',
  'music',
  'settings',
]

export const ANDROID_DOCK_APPS = ANDROID_DOCK_APP_IDS
  .map((id) => APP_REGISTRY.find((a) => a.id === id)!)
  .filter(Boolean)

interface AndroidDockProps {
  onOpenApp: (appId: string) => void
}

export function AndroidDock({ onOpenApp }: AndroidDockProps) {
  return (
    <div className="os-chrome px-4 pb-2 pt-2">
      <div
        className={cn(
          'flex items-center justify-around px-3 py-2 rounded-[20px]',
          'bg-white/15 glass-android'
        )}
      >
        {ANDROID_DOCK_APPS.map((app) => (
          <DockIcon key={app.id} app={app} onOpen={() => onOpenApp(app.id)} />
        ))}
      </div>
    </div>
  )
}

/* ---- Dock icon with ripple ---- */

interface DockIconProps {
  app: (typeof APP_REGISTRY)[number]
  onOpen: () => void
}

function DockIcon({ app, onOpen }: DockIconProps) {
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
      setTimeout(onOpen, 120)
    },
    [onOpen]
  )

  return (
    <button
      ref={btnRef}
      className={cn(
        'relative flex items-center justify-center',
        'w-12 h-12 rounded-[14px] overflow-hidden',
        'active:scale-90 transition-transform duration-150',
        'shadow-android-card',
        app.iconBg
      )}
      onPointerDown={handleTap}
    >
      <Icon className="w-5 h-5 text-white relative z-[1]" strokeWidth={1.5} />

      {/* Ripple */}
      <AnimatePresence>
        {ripple && (
          <motion.span
            key={ripple.key}
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 3.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            onAnimationComplete={() => setRipple(null)}
            className="absolute rounded-full bg-white/30 w-8 h-8 pointer-events-none"
            style={{ left: ripple.x - 16, top: ripple.y - 16 }}
          />
        )}
      </AnimatePresence>
    </button>
  )
}
