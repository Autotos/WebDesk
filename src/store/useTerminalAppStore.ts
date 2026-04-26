import { create } from 'zustand'

/* ================================================================
   Types
   ================================================================ */

export interface TerminalAppTab {
  id: string
  label: string
  /** Session IDs in this tab (1 = single, 2+ = horizontal split) */
  sessions: string[]
}

interface TerminalAppStore {
  tabs: TerminalAppTab[]
  activeTabId: string | null

  createTerminal: () => string
  splitTerminal: () => string | null
  closeTerminal: (sessionId: string) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  renameTab: (tabId: string, label: string) => void
}

/* ================================================================
   Helpers
   ================================================================ */

let counter = 0
function nextId(): string {
  return `tapp-${Date.now()}-${++counter}`
}

/* ================================================================
   Store — standalone terminal app (separate from CodeEditor's
   integrated terminal store)
   ================================================================ */

export const useTerminalAppStore = create<TerminalAppStore>()((set, get) => ({
  tabs: [],
  activeTabId: null,

  createTerminal: () => {
    const sessionId = nextId()
    const tabId = sessionId
    const tabIndex = get().tabs.length + 1
    const tab: TerminalAppTab = {
      id: tabId,
      label: `Terminal ${tabIndex}`,
      sessions: [sessionId],
    }
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tabId,
    }))
    return sessionId
  },

  splitTerminal: () => {
    const { activeTabId, tabs } = get()
    if (!activeTabId) return null

    const tab = tabs.find((t) => t.id === activeTabId)
    if (!tab) return null

    const sessionId = nextId()
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, sessions: [...t.sessions, sessionId] }
          : t,
      ),
    }))
    return sessionId
  },

  closeTerminal: (sessionId) => {
    const { tabs, activeTabId } = get()
    const updatedTabs: TerminalAppTab[] = []

    for (const tab of tabs) {
      const remaining = tab.sessions.filter((s) => s !== sessionId)
      if (remaining.length > 0) {
        updatedTabs.push({ ...tab, sessions: remaining })
      }
    }

    let newActiveTabId = activeTabId
    if (!updatedTabs.find((t) => t.id === activeTabId)) {
      newActiveTabId = updatedTabs.length > 0 ? updatedTabs[updatedTabs.length - 1].id : null
    }

    set({ tabs: updatedTabs, activeTabId: newActiveTabId })
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get()
    const remaining = tabs.filter((t) => t.id !== tabId)

    let newActiveTabId = activeTabId
    if (activeTabId === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId)
      newActiveTabId = remaining.length > 0
        ? remaining[Math.min(idx, remaining.length - 1)].id
        : null
    }

    set({ tabs: remaining, activeTabId: newActiveTabId })
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  renameTab: (tabId, label) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, label } : t)),
    }))
  },
}))
