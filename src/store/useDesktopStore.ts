import { create } from 'zustand'

export interface WindowState {
  id: string
  title: string
  appId: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  /** Position/size before maximizing, used to restore */
  preMaximize: { position: { x: number; y: number }; size: { width: number; height: number } } | null
  /** Minimum allowed size */
  minSize: { width: number; height: number }
  isMaximized: boolean
  isMinimized: boolean
  zIndex: number
}

interface DesktopStore {
  /* macOS window management */
  windows: WindowState[]
  nextZIndex: number
  openWindow: (appId: string, title: string) => void
  closeWindow: (id: string) => void
  focusWindow: (id: string) => void
  toggleMaximize: (id: string) => void
  toggleMinimize: (id: string) => void
  updateWindowPosition: (id: string, pos: { x: number; y: number }) => void
  updateWindowSize: (id: string, size: { width: number; height: number }) => void

  /* Android app management */
  androidActiveApp: string | null
  openAndroidApp: (appId: string) => void
  closeAndroidApp: () => void
}

let windowIdCounter = 0

const DEFAULT_WINDOW_SIZE = { width: 720, height: 480 }
const MIN_WINDOW_SIZE = { width: 320, height: 200 }

function getDefaultPosition(index: number) {
  const base = 80
  const offset = index * 30
  return { x: base + offset, y: base + offset }
}

export const useDesktopStore = create<DesktopStore>((set, get) => ({
  windows: [],
  nextZIndex: 1,

  openWindow: (appId, title) => {
    const existing = get().windows.find(
      (w) => w.appId === appId && !w.isMinimized
    )
    if (existing) {
      get().focusWindow(existing.id)
      return
    }

    const minimized = get().windows.find(
      (w) => w.appId === appId && w.isMinimized
    )
    if (minimized) {
      set((s) => ({
        windows: s.windows.map((w) =>
          w.id === minimized.id
            ? { ...w, isMinimized: false, zIndex: s.nextZIndex }
            : w
        ),
        nextZIndex: s.nextZIndex + 1,
      }))
      return
    }

    const id = `window-${++windowIdCounter}`
    const position = getDefaultPosition(get().windows.length)
    const zIndex = get().nextZIndex

    set((s) => ({
      windows: [
        ...s.windows,
        {
          id,
          title,
          appId,
          position,
          size: DEFAULT_WINDOW_SIZE,
          minSize: MIN_WINDOW_SIZE,
          preMaximize: null,
          isMaximized: false,
          isMinimized: false,
          zIndex,
        },
      ],
      nextZIndex: zIndex + 1,
    }))
  },

  closeWindow: (id) => {
    set((s) => ({
      windows: s.windows.filter((w) => w.id !== id),
    }))
  },

  focusWindow: (id) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, zIndex: s.nextZIndex } : w
      ),
      nextZIndex: s.nextZIndex + 1,
    }))
  },

  toggleMaximize: (id) => {
    set((s) => ({
      windows: s.windows.map((w) => {
        if (w.id !== id) return w
        if (w.isMaximized) {
          // Restore to pre-maximize position/size
          return {
            ...w,
            isMaximized: false,
            position: w.preMaximize?.position ?? w.position,
            size: w.preMaximize?.size ?? DEFAULT_WINDOW_SIZE,
            preMaximize: null,
          }
        }
        // Save current position/size before maximizing
        return {
          ...w,
          isMaximized: true,
          preMaximize: { position: { ...w.position }, size: { ...w.size } },
        }
      }),
    }))
  },

  toggleMinimize: (id) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: !w.isMinimized } : w
      ),
    }))
  },

  updateWindowPosition: (id, pos) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, position: pos } : w
      ),
    }))
  },

  updateWindowSize: (id, size) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, size } : w
      ),
    }))
  },

  /* Android */
  androidActiveApp: null,

  openAndroidApp: (appId) => {
    set({ androidActiveApp: appId })
  },

  closeAndroidApp: () => {
    set({ androidActiveApp: null })
  },
}))
