import { useState, useEffect } from 'react'
import { Wifi, Signal, BatteryFull } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator'

function useCurrentTime() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return time
}

interface StatusBarProps {
  /** true when an app is open (use dark text on light surface) */
  isInApp?: boolean
}

export function StatusBar({ isInApp }: StatusBarProps) {
  const now = useCurrentTime()

  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const textColor = isInApp ? 'text-foreground' : 'text-white'

  return (
    <header
      className={cn(
        'os-chrome fixed top-0 left-0 right-0 z-50',
        'h-[var(--android-statusbar-h)] px-5 flex items-center justify-between',
        'text-[11px] font-medium',
        textColor,
        isInApp ? 'bg-android-surface' : 'bg-transparent'
      )}
    >
      <span className="font-semibold tabular-nums">{timeStr}</span>
      <div className="flex items-center gap-1">
        <SyncStatusIndicator />
        <Signal className="h-3 w-3" />
        <Wifi className="h-3 w-3" />
        <BatteryFull className="h-3.5 w-3.5" />
      </div>
    </header>
  )
}
