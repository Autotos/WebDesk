import { useState, useCallback, useEffect } from 'react'
import type { FsNode } from '../finder/fileSystem'
import * as fsApi from '@/lib/fsApi'
import { detectLanguage } from './syntaxHighlighter'
import type { BreadcrumbItem } from './MonacoEditor'

/* ================================================================
   Types
   ================================================================ */

export interface Tab {
  id: string
  name: string
  node: FsNode
  content: string
  savedContent: string
  isDirty: boolean
  language: string
  scrollTop: number
}

/* ================================================================
   useCodeEditor Hook
   ================================================================ */

export function useCodeEditor() {
  // --- Root tree nodes ---
  const [treeNodes, setTreeNodes] = useState<FsNode[]>([])
  const [rootName, setRootName] = useState('')
  const [treeLoading, setTreeLoading] = useState(true)
  const [treeError, setTreeError] = useState<string | null>(null)

  // --- Tabs ---
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  // --- Tree state (lazy-loaded children) ---
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set())
  const [dirChildren, setDirChildren] = useState<Map<string, FsNode[]>>(new Map())

  // --- Cursor ---
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })

  // --- Breadcrumbs ---
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])

  // --- Saving state ---
  const [saving, setSaving] = useState(false)

  // --- Load root tree on mount ---
  useEffect(() => {
    let cancelled = false
    async function loadRoot() {
      setTreeLoading(true)
      setTreeError(null)
      try {
        const result = await fsApi.listDirectory('/')
        if (!cancelled) {
          setTreeNodes(result.entries)
          if (result.rootName) setRootName(result.rootName)
        }
      } catch (err) {
        if (!cancelled) {
          setTreeError(err instanceof Error ? err.message : 'Failed to load file tree')
        }
      } finally {
        if (!cancelled) setTreeLoading(false)
      }
    }
    loadRoot()
    return () => { cancelled = true }
  }, [])

  // Get children for a folder (lazy loaded via API)
  const getChildren = useCallback((node: FsNode): FsNode[] | undefined => {
    return dirChildren.get(node.id)
  }, [dirChildren])

  // Toggle directory expand/collapse
  const toggleDir = useCallback(async (node: FsNode) => {
    if (node.type !== 'folder') return

    if (expandedDirs.has(node.id)) {
      // Collapse
      setExpandedDirs(prev => {
        const next = new Set(prev)
        next.delete(node.id)
        return next
      })
      return
    }

    // Expand — load children from API if not yet loaded
    if (!dirChildren.has(node.id)) {
      setLoadingDirs(prev => new Set(prev).add(node.id))
      try {
        const result = await fsApi.listDirectory(node.path)
        setDirChildren(prev => new Map(prev).set(node.id, result.entries))
      } catch {
        // Failed to load directory
      } finally {
        setLoadingDirs(prev => {
          const next = new Set(prev)
          next.delete(node.id)
          return next
        })
      }
    }

    setExpandedDirs(prev => new Set(prev).add(node.id))
  }, [expandedDirs, dirChildren])

  // --- Active tab ---
  const activeTab = tabs.find(t => t.id === activeTabId) ?? null

  // Open a file in a tab
  const openFile = useCallback(async (node: FsNode) => {
    if (node.type !== 'file') return

    // Check if already open
    const existing = tabs.find(t => t.id === node.id)
    if (existing) {
      setActiveTabId(node.id)
      return
    }

    // Load content from API
    let content = ''
    try {
      content = await fsApi.readFileAsText(node.path)
    } catch {
      content = `// Error reading ${node.name}\n`
    }

    const newTab: Tab = {
      id: node.id,
      name: node.name,
      node,
      content,
      savedContent: content,
      isDirty: false,
      language: detectLanguage(node.name),
      scrollTop: 0,
    }

    setTabs(prev => [...prev, newTab])
    setActiveTabId(node.id)
  }, [tabs])

  // Close a tab
  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id)
      // If closing active tab, switch to nearest
      if (activeTabId === id && next.length > 0) {
        const idx = prev.findIndex(t => t.id === id)
        const newActive = next[Math.min(idx, next.length - 1)]
        setActiveTabId(newActive.id)
      } else if (next.length === 0) {
        setActiveTabId(null)
      }
      return next
    })
  }, [activeTabId])

  // Switch tab
  const switchTab = useCallback((id: string) => {
    setActiveTabId(id)
  }, [])

  // Update content of active tab
  const updateContent = useCallback((text: string) => {
    if (!activeTabId) return
    setTabs(prev => prev.map(t =>
      t.id === activeTabId
        ? { ...t, content: text, isDirty: text !== t.savedContent }
        : t
    ))
  }, [activeTabId])

  // Save scroll position for active tab
  const updateScrollTop = useCallback((scrollTop: number) => {
    if (!activeTabId) return
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, scrollTop } : t
    ))
  }, [activeTabId])

  // Save active file via API
  const saveActiveFile = useCallback(async () => {
    if (!activeTab || !activeTab.isDirty) return
    setSaving(true)
    try {
      await fsApi.writeFile(activeTab.node.path, activeTab.content)
      setTabs(prev => prev.map(t =>
        t.id === activeTabId
          ? { ...t, savedContent: t.content, isDirty: false }
          : t
      ))
    } catch {
      // Save failed
    } finally {
      setSaving(false)
    }
  }, [activeTab, activeTabId])

  // Update cursor position
  const updateCursorPos = useCallback((line: number, col: number) => {
    setCursorPos({ line, col })
  }, [])

  // Update breadcrumbs
  const updateBreadcrumbs = useCallback((items: BreadcrumbItem[]) => {
    setBreadcrumbs(items)
  }, [])

  return {
    // Tree
    treeNodes,
    rootName,
    treeLoading,
    treeError,
    expandedDirs,
    loadingDirs,
    getChildren,
    toggleDir,

    // Tabs
    tabs,
    activeTabId,
    activeTab,
    openFile,
    closeTab,
    switchTab,

    // Editing
    updateContent,
    updateScrollTop,
    saveActiveFile,
    saving,

    // Cursor
    cursorPos,
    updateCursorPos,

    // Breadcrumbs
    breadcrumbs,
    updateBreadcrumbs,
  }
}
