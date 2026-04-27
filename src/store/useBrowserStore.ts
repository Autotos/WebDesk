import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ================================================================
   Types
   ================================================================ */

export interface BrowserTab {
  id: string
  title: string
  url: string
  /** The URL currently displayed in the iframe (may differ from `url` during loading) */
  displayUrl: string
  isLoading: boolean
  /** Per-tab navigation history stack */
  history: string[]
  /** Current index within the history stack */
  historyIndex: number
  /** Loading error message, if any */
  error: string | null
  /** Loading progress 0..100 (simulated) */
  loadProgress: number
}

export interface Bookmark {
  id: string
  title: string
  url: string
  icon: string
  color: string
  createdAt: number
}

export interface QuickLink {
  id: string
  name: string
  url: string
  icon: string
  color: string
}

interface BrowserStore {
  // Tab state
  tabs: BrowserTab[]
  activeTabId: string | null

  // Tab actions
  addTab: (url?: string) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTab: (id: string, updates: Partial<BrowserTab>) => void

  // Navigation actions
  navigateTo: (url: string) => void
  goBack: () => void
  goForward: () => void
  reload: () => void

  // Quick links (persisted)
  quickLinks: QuickLink[]
  addQuickLink: (link: Omit<QuickLink, 'id'>) => void
  removeQuickLink: (id: string) => void

  // Bookmarks (persisted)
  bookmarks: Bookmark[]
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void
  removeBookmark: (url: string) => void
  isBookmarked: (url: string) => boolean

  // Search engine
  searchEngine: string
  setSearchEngine: (id: string) => void
}

let tabIdCounter = 0

function createTab(url = 'newtab'): BrowserTab {
  return {
    id: `tab-${++tabIdCounter}`,
    title: url === 'newtab' ? 'New Tab' : extractTitle(url),
    url,
    displayUrl: url,
    isLoading: false,
    history: [url],
    historyIndex: 0,
    error: null,
    loadProgress: 0,
  }
}

/** Resolve user input into a navigable URL */
export function resolveUrl(input: string, searchEngine = 'google'): string {
  const trimmed = input.trim()
  if (!trimmed || trimmed === 'newtab') return 'newtab'

  // Already a full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // Looks like a domain (has a dot, no spaces)
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`
  }

  // Treat as search query
  const engines: Record<string, string> = {
    google: 'https://www.google.com/search?q=',
    baidu: 'https://www.baidu.com/s?wd=',
    bing: 'https://www.bing.com/search?q=',
    github: 'https://github.com/search?q=',
  }
  const prefix = engines[searchEngine] || engines.google
  return `${prefix}${encodeURIComponent(trimmed)}`
}

function extractTitle(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

/* ================================================================
   Default data
   ================================================================ */

const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: 'ql-1', name: 'Google', url: 'https://www.google.com', icon: 'G', color: 'bg-blue-500' },
  { id: 'ql-2', name: 'GitHub', url: 'https://github.com', icon: '', color: 'bg-gray-800' },
  { id: 'ql-3', name: 'Baidu', url: 'https://www.baidu.com', icon: 'B', color: 'bg-blue-600' },
  { id: 'ql-4', name: 'YouTube', url: 'https://www.youtube.com', icon: '', color: 'bg-red-500' },
  { id: 'ql-5', name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'W', color: 'bg-gray-600' },
  { id: 'ql-6', name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'S', color: 'bg-orange-500' },
  { id: 'ql-7', name: 'Twitter', url: 'https://x.com', icon: '𝕏', color: 'bg-black' },
  { id: 'ql-8', name: 'Reddit', url: 'https://www.reddit.com', icon: 'R', color: 'bg-orange-600' },
]

/* ================================================================
   Store
   ================================================================ */

export const useBrowserStore = create<BrowserStore>()(
  persist(
    (set, get) => {
      const initialTab = createTab()
      return {
        tabs: [initialTab],
        activeTabId: initialTab.id,
        quickLinks: DEFAULT_QUICK_LINKS,
        bookmarks: [],
        searchEngine: 'google',

        /* ---- Tab management ---- */

        addTab: (url) => {
          const tab = createTab(url)
          if (url && url !== 'newtab') {
            tab.isLoading = true
          }
          set((s) => ({
            tabs: [...s.tabs, tab],
            activeTabId: tab.id,
          }))
        },

        closeTab: (id) => {
          const { tabs, activeTabId } = get()
          if (tabs.length <= 1) {
            const freshTab = createTab()
            set({ tabs: [freshTab], activeTabId: freshTab.id })
            return
          }

          const index = tabs.findIndex((t) => t.id === id)
          const newTabs = tabs.filter((t) => t.id !== id)

          let newActiveId = activeTabId
          if (activeTabId === id) {
            const newIndex = Math.min(index, newTabs.length - 1)
            newActiveId = newTabs[newIndex].id
          }

          set({ tabs: newTabs, activeTabId: newActiveId })
        },

        setActiveTab: (id) => {
          set({ activeTabId: id })
        },

        updateTab: (id, updates) => {
          set((s) => ({
            tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
          }))
        },

        /* ---- Navigation ---- */

        navigateTo: (rawInput) => {
          const { activeTabId, searchEngine } = get()
          if (!activeTabId) return

          const finalUrl = resolveUrl(rawInput, searchEngine)
          if (finalUrl === 'newtab') return

          set((s) => ({
            tabs: s.tabs.map((t) => {
              if (t.id !== activeTabId) return t

              // Push to history, discarding any forward history
              const newHistory = [...t.history.slice(0, t.historyIndex + 1), finalUrl]
              return {
                ...t,
                url: finalUrl,
                displayUrl: finalUrl,
                title: extractTitle(finalUrl),
                isLoading: true,
                error: null,
                loadProgress: 0,
                history: newHistory,
                historyIndex: newHistory.length - 1,
              }
            }),
          }))
        },

        goBack: () => {
          const { activeTabId } = get()
          if (!activeTabId) return

          set((s) => ({
            tabs: s.tabs.map((t) => {
              if (t.id !== activeTabId || t.historyIndex <= 0) return t
              const newIndex = t.historyIndex - 1
              const prevUrl = t.history[newIndex]
              return {
                ...t,
                historyIndex: newIndex,
                url: prevUrl,
                displayUrl: prevUrl,
                title: prevUrl === 'newtab' ? 'New Tab' : extractTitle(prevUrl),
                isLoading: prevUrl !== 'newtab',
                error: null,
                loadProgress: 0,
              }
            }),
          }))
        },

        goForward: () => {
          const { activeTabId } = get()
          if (!activeTabId) return

          set((s) => ({
            tabs: s.tabs.map((t) => {
              if (t.id !== activeTabId || t.historyIndex >= t.history.length - 1) return t
              const newIndex = t.historyIndex + 1
              const nextUrl = t.history[newIndex]
              return {
                ...t,
                historyIndex: newIndex,
                url: nextUrl,
                displayUrl: nextUrl,
                title: nextUrl === 'newtab' ? 'New Tab' : extractTitle(nextUrl),
                isLoading: nextUrl !== 'newtab',
                error: null,
                loadProgress: 0,
              }
            }),
          }))
        },

        reload: () => {
          const { activeTabId } = get()
          if (!activeTabId) return
          set((s) => ({
            tabs: s.tabs.map((t) =>
              t.id === activeTabId && t.url !== 'newtab'
                ? { ...t, isLoading: true, error: null, loadProgress: 0 }
                : t
            ),
          }))
        },

        /* ---- Quick links ---- */

        addQuickLink: (link) => {
          const id = `ql-${Date.now()}`
          set((s) => ({
            quickLinks: [...s.quickLinks, { ...link, id }],
          }))
        },

        removeQuickLink: (id) => {
          set((s) => ({
            quickLinks: s.quickLinks.filter((l) => l.id !== id),
          }))
        },

        /* ---- Bookmarks ---- */

        addBookmark: (bookmark) => {
          const id = `bm-${Date.now()}`
          set((s) => ({
            bookmarks: [
              ...s.bookmarks,
              { ...bookmark, id, createdAt: Date.now() },
            ],
          }))
        },

        removeBookmark: (url) => {
          set((s) => ({
            bookmarks: s.bookmarks.filter((b) => b.url !== url),
          }))
        },

        isBookmarked: (url) => {
          return get().bookmarks.some((b) => b.url === url)
        },

        /* ---- Search engine ---- */

        setSearchEngine: (id) => {
          set({ searchEngine: id })
        },
      }
    },
    {
      name: 'webdesk-browser',
      partialize: (state) => ({
        quickLinks: state.quickLinks,
        bookmarks: state.bookmarks,
        searchEngine: state.searchEngine,
      }),
    }
  )
)
