import { TopBar } from './TopBar'
import { Dock } from './Dock'
import { Window } from './Window'
import { useDesktopStore } from '@/store/useDesktopStore'
import { getApp } from '@/components/apps/appRegistry'

export function MacDesktop() {
  const { windows } = useDesktopStore()

  const sortedVisible = [...windows]
    .filter((w) => !w.isMinimized)
    .sort((a, b) => b.zIndex - a.zIndex)

  const topWindowId = sortedVisible[0]?.id ?? null

  return (
    <div
      className="relative w-full h-full bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/mac-wallpaper.png)' }}
    >
      <TopBar activeAppName={sortedVisible[0]?.title} />

      {/* Window layer */}
      <div className="absolute inset-0 pt-[var(--mac-topbar-h)]">
        {windows.map((win) => {
          const app = getApp(win.appId)
          const AppComponent = app?.component
          return (
            <Window key={win.id} window={win} isTopWindow={win.id === topWindowId}>
              {AppComponent ? <AppComponent /> : undefined}
            </Window>
          )
        })}
      </div>

      <Dock />
    </div>
  )
}
