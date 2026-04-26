import { useCallback } from 'react'
import { Plus, SplitSquareHorizontal, X, ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTerminalStore } from '@/store/useTerminalStore'
import { XtermTerminal } from '@/lib/terminal/XtermTerminal'
import { destroyTerminalSession } from '@/lib/terminal/socket'

interface TerminalPanelProps {
  compact?: boolean
}

export function TerminalPanel({ compact }: TerminalPanelProps) {
  const tabs = useTerminalStore((s) => s.tabs)
  const activeTabId = useTerminalStore((s) => s.activeTabId)
  const setActiveTab = useTerminalStore((s) => s.setActiveTab)
  const createTerminal = useTerminalStore((s) => s.createTerminal)
  const splitTerminal = useTerminalStore((s) => s.splitTerminal)
  const closeTerminal = useTerminalStore((s) => s.closeTerminal)
  const closeTab = useTerminalStore((s) => s.closeTab)
  const setTerminalVisible = useTerminalStore((s) => s.setTerminalVisible)

  const activeTab = tabs.find((t) => t.id === activeTabId)

  const handleCreate = useCallback(() => {
    createTerminal()
  }, [createTerminal])

  const handleSplit = useCallback(() => {
    splitTerminal()
  }, [splitTerminal])

  const handleCloseTab = useCallback((tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (tab) {
      // Destroy all sessions in the tab
      for (const sid of tab.sessions) {
        destroyTerminalSession(sid)
      }
      closeTab(tabId)
    }
  }, [tabs, closeTab])

  const handleSessionExit = useCallback((sessionId: string) => {
    closeTerminal(sessionId)
  }, [closeTerminal])

  const handleHide = useCallback(() => {
    setTerminalVisible(false)
  }, [setTerminalVisible])

  const handleKillAll = useCallback(() => {
    for (const tab of tabs) {
      for (const sid of tab.sessions) {
        destroyTerminalSession(sid)
      }
    }
    // Close all tabs
    for (const tab of tabs) {
      closeTab(tab.id)
    }
  }, [tabs, closeTab])

  return (
    <div className="flex flex-col h-full bg-[#1e1e2e]">
      {/* Header: tabs + toolbar */}
      <div className="flex items-center bg-mac-titlebar/50 border-b border-mac-border/30 shrink-0">
        {/* Tab list */}
        <div className="flex-1 flex items-center min-w-0 overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                'flex items-center gap-1 px-2.5 shrink-0 text-[11px] transition-colors border-r border-mac-border/20',
                compact ? 'py-1' : 'py-1.5',
                activeTabId === tab.id
                  ? 'bg-[#1e1e2e] text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/30',
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="truncate max-w-[100px]">{tab.label}</span>
              {tab.sessions.length > 1 && (
                <span className="text-[9px] text-muted-foreground/60 ml-0.5">
                  [{tab.sessions.length}]
                </span>
              )}
              <span
                role="button"
                className="ml-1 p-0.5 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id) }}
              >
                <X className="h-2.5 w-2.5" />
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-1.5 shrink-0">
          <button
            className="p-1 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleCreate}
            title="New Terminal"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleSplit}
            title="Split Terminal"
          >
            <SplitSquareHorizontal className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleKillAll}
            title="Kill All Terminals"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleHide}
            title="Hide Terminal Panel"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal body */}
      <div className="flex-1 min-h-0">
        {activeTab ? (
          <div className="flex h-full">
            {activeTab.sessions.map((sid, i) => (
              <div
                key={sid}
                className={cn(
                  'flex-1 min-w-0',
                  i > 0 && 'border-l border-mac-border/30',
                )}
              >
                <XtermTerminal
                  sessionId={sid}
                  onExit={handleSessionExit}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground/40 text-[12px]">
            No active terminal
          </div>
        )}
      </div>
    </div>
  )
}
