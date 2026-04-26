import { useCallback, useEffect } from 'react'
import { Plus, SplitSquareHorizontal, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { XtermTerminal } from '@/lib/terminal/XtermTerminal'
import { destroyTerminalSession } from '@/lib/terminal/socket'
import { useTerminalAppStore } from '@/store/useTerminalAppStore'

interface TerminalWindowProps {
  compact?: boolean
}

export function TerminalWindow({ compact }: TerminalWindowProps) {
  const tabs = useTerminalAppStore((s) => s.tabs)
  const activeTabId = useTerminalAppStore((s) => s.activeTabId)
  const setActiveTab = useTerminalAppStore((s) => s.setActiveTab)
  const createTerminal = useTerminalAppStore((s) => s.createTerminal)
  const splitTerminal = useTerminalAppStore((s) => s.splitTerminal)
  const closeTerminal = useTerminalAppStore((s) => s.closeTerminal)
  const closeTab = useTerminalAppStore((s) => s.closeTab)

  const activeTab = tabs.find((t) => t.id === activeTabId)

  // Auto-create a terminal on first mount
  useEffect(() => {
    if (tabs.length === 0) {
      createTerminal()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = useCallback(() => {
    createTerminal()
  }, [createTerminal])

  const handleSplit = useCallback(() => {
    splitTerminal()
  }, [splitTerminal])

  const handleCloseTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId)
      if (tab) {
        for (const sid of tab.sessions) {
          destroyTerminalSession(sid)
        }
        closeTab(tabId)
      }
    },
    [tabs, closeTab],
  )

  const handleSessionExit = useCallback(
    (sessionId: string) => {
      closeTerminal(sessionId)
    },
    [closeTerminal],
  )

  const handleKillAll = useCallback(() => {
    for (const tab of tabs) {
      for (const sid of tab.sessions) {
        destroyTerminalSession(sid)
      }
    }
    for (const tab of tabs) {
      closeTab(tab.id)
    }
  }, [tabs, closeTab])

  // Cleanup all sessions on unmount
  useEffect(() => {
    return () => {
      const currentTabs = useTerminalAppStore.getState().tabs
      for (const tab of currentTabs) {
        for (const sid of tab.sessions) {
          destroyTerminalSession(sid)
        }
      }
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#1e1e2e]">
      {/* Header: tabs + toolbar */}
      <div className="flex items-center bg-[#181825] border-b border-[#313244] shrink-0">
        {/* Tab list */}
        <div className="flex-1 flex items-center min-w-0 overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                'flex items-center gap-1 px-3 shrink-0 text-[12px] transition-colors border-r border-[#313244]',
                compact ? 'py-1.5' : 'py-2',
                activeTabId === tab.id
                  ? 'bg-[#1e1e2e] text-[#cdd6f4]'
                  : 'text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#1e1e2e]/50',
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="truncate max-w-[120px]">{tab.label}</span>
              {tab.sessions.length > 1 && (
                <span className="text-[10px] text-[#6c7086] ml-0.5">
                  [{tab.sessions.length}]
                </span>
              )}
              <span
                role="button"
                className="ml-1.5 p-0.5 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#cdd6f4]"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCloseTab(tab.id)
                }}
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 shrink-0">
          <button
            className="p-1.5 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
            onClick={handleCreate}
            title="新建终端"
          >
            <Plus className="h-4 w-4" />
          </button>
          {!compact && (
            <button
              className="p-1.5 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
              onClick={handleSplit}
              title="拆分终端"
            >
              <SplitSquareHorizontal className="h-4 w-4" />
            </button>
          )}
          <button
            className="p-1.5 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
            onClick={handleKillAll}
            title="终止所有终端"
          >
            <Trash2 className="h-4 w-4" />
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
                  i > 0 && 'border-l border-[#313244]',
                )}
              >
                <XtermTerminal sessionId={sid} onExit={handleSessionExit} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[#6c7086] text-[13px]">
            按 + 创建新终端
          </div>
        )}
      </div>
    </div>
  )
}
