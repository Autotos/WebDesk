import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ================================================================
   Types
   ================================================================ */

export type SidePanelId =
  | 'explorer'
  | 'search'
  | 'scm'
  | 'wiki'
  | 'debug'
  | 'extensions'

export interface Toast {
  id: string
  message: string
  timestamp: number
}

interface IDEStore {
  /* --- Persisted fields --- */
  activeSidePanel: SidePanelId | null
  sidePanelWidth: number
  workspaceRoot: string | null

  /* --- Transient fields --- */
  activeMenu: string | null
  toasts: Toast[]
  mobileSidebarOpen: boolean
  folderPickerOpen: boolean

  /* --- Actions --- */
  toggleSidePanel: (id: SidePanelId) => void
  setSidePanelWidth: (w: number) => void
  setWorkspaceRoot: (path: string | null) => void
  setActiveMenu: (key: string | null) => void
  addToast: (message: string) => void
  removeToast: (id: string) => void
  setMobileSidebarOpen: (open: boolean) => void
  setFolderPickerOpen: (open: boolean) => void
}

/* ================================================================
   Store
   ================================================================ */

export const useIDEStore = create<IDEStore>()(
  persist(
    (set, get) => ({
      // Persisted defaults
      activeSidePanel: 'explorer',
      sidePanelWidth: 240,
      workspaceRoot: null,

      // Transient defaults
      activeMenu: null,
      toasts: [],
      mobileSidebarOpen: false,
      folderPickerOpen: false,

      toggleSidePanel: (id) => {
        set({ activeSidePanel: get().activeSidePanel === id ? null : id })
      },

      setSidePanelWidth: (w) => {
        set({ sidePanelWidth: Math.max(160, Math.min(480, w)) })
      },

      setWorkspaceRoot: (path) => set({ workspaceRoot: path }),

      setActiveMenu: (key) => set({ activeMenu: key }),

      addToast: (message) => {
        const toast: Toast = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          message,
          timestamp: Date.now(),
        }
        set((s) => ({ toasts: [...s.toasts, toast] }))
      },

      removeToast: (id) => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      },

      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      setFolderPickerOpen: (open) => set({ folderPickerOpen: open }),
    }),
    {
      name: 'webdesk-ide-layout',
      partialize: (state) => ({
        activeSidePanel: state.activeSidePanel,
        sidePanelWidth: state.sidePanelWidth,
        workspaceRoot: state.workspaceRoot,
      }),
    },
  ),
)
