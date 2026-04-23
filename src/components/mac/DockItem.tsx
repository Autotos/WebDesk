import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { AppDefinition } from '@/components/apps/appRegistry'

interface DockItemProps {
  app: AppDefinition
  mouseX: ReturnType<typeof useMotionValue<number>>
  isActive: boolean
  isBouncing: boolean
  onClick: () => void
}

const BASE_SIZE = 48
const MAX_SIZE = 72
const DISTANCE_THRESHOLD = 150

export function DockItem({ app, mouseX, isActive, isBouncing, onClick }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null)

  const distance = useTransform(mouseX, (val: number) => {
    const el = ref.current
    if (!el) return DISTANCE_THRESHOLD
    const rect = el.getBoundingClientRect()
    return val - rect.left - rect.width / 2
  })

  const scaleSync = useTransform(
    distance,
    [-DISTANCE_THRESHOLD, 0, DISTANCE_THRESHOLD],
    [BASE_SIZE, MAX_SIZE, BASE_SIZE]
  )

  const size = useSpring(scaleSync, {
    mass: 0.1,
    stiffness: 170,
    damping: 12,
  })

  const Icon = app.icon

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      className={cn(
        'relative flex items-center justify-center cursor-pointer group',
        isBouncing && 'animate-app-bounce'
      )}
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
    >
      {/* Tooltip */}
      <div
        className={cn(
          'absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap',
          'px-2.5 py-1 rounded-md text-[11px] font-medium',
          'bg-mac-topbar/80 text-mac-topbar-text glass-mac',
          'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
          'shadow-lg'
        )}
      >
        {app.name}
      </div>

      {/* Icon container */}
      <motion.div
        className={cn(
          'w-full h-full rounded-app-icon flex items-center justify-center',
          'shadow-lg transition-shadow hover:shadow-xl',
          app.iconBg
        )}
        layout
      >
        <Icon className="w-1/2 h-1/2 text-mac-topbar-text" strokeWidth={1.5} />
      </motion.div>

      {/* Active indicator dot */}
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/70"
        />
      )}
    </motion.div>
  )
}
