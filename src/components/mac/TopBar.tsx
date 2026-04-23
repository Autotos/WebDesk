import { useState, useEffect } from 'react'
import { Apple, Wifi, Battery, Search } from 'lucide-react'
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

function formatTime(d: Date) {
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDate(d: Date) {
  return d.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
}

interface TopBarProps {
  activeAppName?: string
}

export function TopBar({ activeAppName }: TopBarProps) {
  const now = useCurrentTime()

  return (
    <header
      className={cn(
        'os-chrome fixed top-0 left-0 right-0 z-50 flex items-center justify-between',
        'h-[var(--mac-topbar-h)] px-4 text-[13px] font-medium',
        'bg-mac-topbar/70 text-mac-topbar-text glass-mac shadow-topbar'
      )}
    >
      {/* Left: Apple logo + app name + menus */}
      <div className="flex items-center gap-4">
        <Apple className="h-3.5 w-3.5 opacity-90" />
        <span className="font-semibold">{activeAppName ?? 'Finder'}</span>
        <nav className="hidden sm:flex items-center gap-3 opacity-80 text-[12.5px]">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Window</span>
          <span>Help</span>
        </nav>
      </div>

      {/* Right: status icons + time */}
      <div className="flex items-center gap-3 opacity-90 text-[12px]">
        <Search className="h-3.5 w-3.5" />
        <SyncStatusIndicator />
        <Wifi className="h-3.5 w-3.5" />
        <Battery className="h-4 w-4" />
        <span>
          {formatDate(now)} {formatTime(now)}
        </span>
      </div>
    </header>
  )
}
