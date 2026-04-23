import { useState, useCallback } from 'react'
import { useMotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DOCK_APPS } from '@/components/apps/appRegistry'
import { useDesktopStore } from '@/store/useDesktopStore'
import { DockItem } from './DockItem'

export function Dock() {
  const mouseX = useMotionValue(Infinity)
  const { windows, openWindow, focusWindow } = useDesktopStore()
  const [bouncingAppId, setBouncingAppId] = useState<string | null>(null)

  const hasWindowForApp = useCallback(
    (appId: string) => windows.some((w) => w.appId === appId),
    [windows]
  )

  const handleDockClick = useCallback(
    (appId: string, appName: string) => {
      // If the app already has a visible window, focus it
      const existingVisible = windows.find(
        (w) => w.appId === appId && !w.isMinimized
      )
      if (existingVisible) {
        focusWindow(existingVisible.id)
        return
      }

      // If app has a minimized window, restore it
      const existingMinimized = windows.find(
        (w) => w.appId === appId && w.isMinimized
      )
      if (existingMinimized) {
        openWindow(appId, appName)
        return
      }

      // New app launch: trigger bounce animation
      setBouncingAppId(appId)
      setTimeout(() => setBouncingAppId(null), 600)
      openWindow(appId, appName)
    },
    [windows, openWindow, focusWindow]
  )

  return (
    <div className="os-chrome fixed bottom-2 left-1/2 -translate-x-1/2 z-40">
      <div
        className={cn(
          'flex items-end gap-1.5 px-3 py-1.5 rounded-2xl',
          'bg-mac-dock/60 glass-dock shadow-dock',
          'border border-white/20'
        )}
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        {DOCK_APPS.map((app) => (
          <DockItem
            key={app.id}
            app={app}
            mouseX={mouseX}
            isActive={hasWindowForApp(app.id)}
            isBouncing={bouncingAppId === app.id}
            onClick={() => handleDockClick(app.id, app.name)}
          />
        ))}
      </div>
    </div>
  )
}
