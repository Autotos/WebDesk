import { useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useBrowserStore } from '@/store/useBrowserStore'
import { TabBar } from './TabBar'
import { AddressBar } from './AddressBar'
import { NewTabPage } from './NewTabPage'
import { WebContentView } from './WebContentView'

export function BrowserLayout() {
  const tabs = useBrowserStore((s) => s.tabs)
  const activeTabId = useBrowserStore((s) => s.activeTabId)
  const addTab = useBrowserStore((s) => s.addTab)
  const closeTab = useBrowserStore((s) => s.closeTab)

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey
      if (isMeta && e.key === 't') {
        e.preventDefault()
        addTab()
      }
      if (isMeta && e.key === 'w') {
        e.preventDefault()
        if (activeTabId) closeTab(activeTabId)
      }
      // Cmd+L / Ctrl+L to focus address bar
      if (isMeta && e.key === 'l') {
        e.preventDefault()
        const addrInput = document.querySelector<HTMLInputElement>(
          '[data-browser-address-bar]'
        )
        addrInput?.focus()
      }
    },
    [addTab, closeTab, activeTabId]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Active tab's loading progress (for the thin bar above content)
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const loadProgress = activeTab?.loadProgress ?? 0

  return (
    <div className="h-full w-full flex flex-col bg-mac-window overflow-hidden">
      {/* Chrome area: Tab bar + Address bar */}
      <div
        className={cn(
          'shrink-0 flex flex-col',
          'bg-gradient-to-b from-[hsl(220,10%,95%)] to-[hsl(220,10%,93%)]',
          'border-b border-mac-border/50'
        )}
      >
        <TabBar />
        <AddressBar />
      </div>

      {/* Loading progress bar (sits between chrome and content) */}
      <div className="shrink-0 h-[2px] relative">
        {loadProgress > 0 && loadProgress < 100 && (
          <div
            className="absolute inset-0 bg-mac-accent/80 transition-[width] duration-300 ease-out"
            style={{ width: `${loadProgress}%` }}
          />
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const isTabNewTab = tab.url === 'newtab'

          return (
            <div
              key={tab.id}
              className={cn(
                'absolute inset-0',
                isActive ? 'z-10 visible' : 'z-0 invisible'
              )}
            >
              {isTabNewTab ? (
                <NewTabPage />
              ) : (
                <WebContentView tab={tab} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
