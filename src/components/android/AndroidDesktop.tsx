import { useCallback } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'
import { StatusBar } from './StatusBar'
import { AppGrid } from './AppGrid'
import { AndroidDock, ANDROID_DOCK_APP_IDS } from './AndroidDock'
import { useDesktopStore } from '@/store/useDesktopStore'
import { getApp } from '@/components/apps/appRegistry'

const DISMISS_THRESHOLD = 120

export function AndroidDesktop() {
  const { androidActiveApp, openAndroidApp, closeAndroidApp } = useDesktopStore()
  const activeApp = androidActiveApp ? getApp(androidActiveApp) : null
  const AppComponent = activeApp?.component

  const handleOpenApp = useCallback(
    (appId: string) => openAndroidApp(appId),
    [openAndroidApp]
  )

  const handleSheetDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      // Drag down to dismiss
      if (info.offset.y > DISMISS_THRESHOLD) {
        closeAndroidApp()
      }
    },
    [closeAndroidApp]
  )

  return (
    <div
      className="relative w-full h-full bg-cover bg-center flex flex-col overflow-hidden"
      style={{ backgroundImage: 'url(/images/android-wallpaper.png)' }}
    >
      {/* Status bar - changes color when app open */}
      <StatusBar isInApp={!!androidActiveApp} />

      {/* Home screen content */}
      <div className="flex-1 flex flex-col pt-[var(--android-statusbar-h)]">
        {/* Time & date widget */}
        {!androidActiveApp && <HomeWidget />}

        {/* App grid (excludes dock apps) */}
        {!androidActiveApp && (
          <AppGrid onOpenApp={handleOpenApp} excludeIds={ANDROID_DOCK_APP_IDS} />
        )}

        {/* Bottom dock */}
        {!androidActiveApp && <AndroidDock onOpenApp={handleOpenApp} />}

        {/* Gesture bar */}
        <div className="os-chrome flex justify-center pb-1.5 pt-1">
          <div
            className={cn(
              'w-28 h-1 rounded-full',
              androidActiveApp ? 'bg-foreground/20' : 'bg-white/30'
            )}
          />
        </div>
      </div>

      {/* Bottom Sheet overlay for apps */}
      <AnimatePresence>
        {androidActiveApp && AppComponent && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/30 z-40"
              onClick={closeAndroidApp}
            />

            {/* Bottom Sheet */}
            <motion.div
              key={`sheet-${androidActiveApp}`}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={handleSheetDragEnd}
              className={cn(
                'absolute bottom-0 left-0 right-0 z-50',
                'flex flex-col',
                'bg-android-surface rounded-t-[20px] overflow-hidden',
                'shadow-[0_-4px_30px_rgba(0,0,0,0.15)]'
              )}
              style={{ height: 'calc(100% - 28px)', maxHeight: 'calc(100% - 28px)' }}
            >
              {/* Sheet drag handle */}
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-foreground/20" />
              </div>

              {/* App header */}
              <div className="flex items-center h-12 px-4 shrink-0 border-b border-border/50">
                <button
                  className="p-1.5 -ml-1.5 mr-2 rounded-full active:bg-accent transition-colors"
                  onClick={closeAndroidApp}
                >
                  <ChevronLeft className="h-5 w-5 text-foreground/70" />
                </button>
                <span className="text-[15px] font-semibold text-foreground">
                  {activeApp?.name}
                </span>
              </div>

              {/* App content */}
              <div className="flex-1 overflow-auto">
                <AppComponent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---- Home widget (time/date) ---- */

function HomeWidget() {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const dateStr = now.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="px-6 pt-8 pb-2">
      <p className="text-[48px] font-light text-white leading-none tracking-tight drop-shadow-lg tabular-nums">
        {timeStr}
      </p>
      <p className="text-[14px] text-white/80 mt-1 drop-shadow-sm">
        {dateStr}
      </p>
    </div>
  )
}
