import { useCallback } from 'react'
import { Plus, X, Globe, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBrowserStore } from '@/store/useBrowserStore'

export function TabBar() {
  const tabs = useBrowserStore((s) => s.tabs)
  const activeTabId = useBrowserStore((s) => s.activeTabId)
  const addTab = useBrowserStore((s) => s.addTab)
  const closeTab = useBrowserStore((s) => s.closeTab)
  const setActiveTab = useBrowserStore((s) => s.setActiveTab)

  const handleMiddleClick = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      if (e.button === 1) {
        e.preventDefault()
        closeTab(tabId)
      }
    },
    [closeTab]
  )

  return (
    <div className="flex items-end h-[36px] px-1 pt-1 gap-[2px] overflow-x-auto scrollbar-thin os-chrome select-none bg-transparent">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onMouseDown={(e) => handleMiddleClick(e, tab.id)}
            className={cn(
              'group relative flex items-center gap-1.5 min-w-[120px] max-w-[200px] h-[30px] px-3 rounded-t-lg',
              'text-[12px] leading-none transition-colors duration-150',
              'outline-none cursor-default shrink-0',
              isActive
                ? 'bg-white/90 text-foreground/90 shadow-[0_-1px_3px_rgba(0,0,0,0.06)]'
                : 'bg-transparent text-foreground/50 hover:bg-white/40 hover:text-foreground/70'
            )}
          >
            {/* Favicon / loading indicator */}
            <span className="shrink-0 w-4 h-4 flex items-center justify-center">
              {tab.isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-mac-accent" />
              ) : (
                <Globe className="w-3 h-3 opacity-50" />
              )}
            </span>

            {/* Title */}
            <span className="flex-1 truncate text-left">
              {tab.url === 'newtab' ? 'New Tab' : tab.title}
            </span>

            {/* Close button */}
            <span
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              className={cn(
                'shrink-0 w-4 h-4 rounded-full flex items-center justify-center',
                'opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity'
              )}
            >
              <X className="w-2.5 h-2.5" />
            </span>
          </button>
        )
      })}

      {/* New tab button */}
      <button
        onClick={() => addTab()}
        className={cn(
          'shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
          'text-foreground/40 hover:text-foreground/70 hover:bg-white/40 transition-colors',
          'mb-[1px]'
        )}
        title="New Tab"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
