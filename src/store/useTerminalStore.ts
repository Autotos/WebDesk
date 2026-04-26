import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ================================================================
   Types
   ================================================================ */

export interface TerminalTab {
  id: string
  label: string
  /** Session IDs in this tab (1 = single, 2+ = horizontal split) */
  sessions: string[]
}

interface TerminalStore {
  /* --- Persisted --- */
  terminalPanelHeight: number

  /* --- Transient --- */
  terminalVisible: boolean
  tabs: TerminalTab[]
  activeTabId: string | null

  /* --- Actions --- */
  setTerminalVisible: (visible: boolean) => void
  toggleTerminal: () => void
  setTerminalPanelHeight: (h: number) => void
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
  return `term-${Date.now()}-${++counter}`
}

/* ================================================================
   Store
   ================================================================ */

export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set, get) => ({
      // Persisted
      terminalPanelHeight: 220,

      // Transient
      terminalVisible: false,
      tabs: [],
      activeTabId: null,

      setTerminalVisible: (visible) => set({ terminalVisible: visible }),

      toggleTerminal: () => {
        const { terminalVisible, tabs } = get()
        if (terminalVisible) {
          set({ terminalVisible: false })
        } else {
          // If no tabs exist, create one
          if (tabs.length === 0) {
            get().createTerminal()
          }
          set({ terminalVisible: true })
        }
      },

      setTerminalPanelHeight: (h) => {
        set({ terminalPanelHeight: Math.max(100, Math.min(600, h)) })
      },

      createTerminal: () => {
        const sessionId = nextId()
        const tabId = sessionId
        const tabIndex = get().tabs.length + 1
        const tab: TerminalTab = {
          id: tabId,
          label: `Terminal ${tabIndex}`,
          sessions: [sessionId],
        }
        set((s) => ({
          tabs: [...s.tabs, tab],
          activeTabId: tabId,
          terminalVisible: true,
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
        const updatedTabs: TerminalTab[] = []

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

        set({
          tabs: updatedTabs,
          activeTabId: newActiveTabId,
          terminalVisible: updatedTabs.length > 0 ? get().terminalVisible : false,
        })
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

        set({
          tabs: remaining,
          activeTabId: newActiveTabId,
          terminalVisible: remaining.length > 0 ? get().terminalVisible : false,
        })
      },

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      renameTab: (tabId, label) => {
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, label } : t)),
        }))
      },
    }),
    {
      name: 'webdesk-terminal',
      partialize: (state) => ({
        terminalPanelHeight: state.terminalPanelHeight,
      }),
    },
  ),
)
