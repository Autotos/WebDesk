import { useState, useCallback, useEffect, useRef } from 'react'
import type { FsNode } from '@/components/apps/finder/fileSystem'
import * as fsApi from '@/lib/fsApi'

/* ================================================================
   Types
   ================================================================ */

export interface FsBreadcrumb {
  name: string
  path: string
}

export interface UseFileSystemReturn {
  loading: boolean
  error: string | null
  rootName: string
  entries: FsNode[]
  breadcrumbs: FsBreadcrumb[]
  currentPath: string

  navigateInto: (node: FsNode) => Promise<void>
  navigateTo: (path: string) => Promise<void>
  navigateToBreadcrumb: (index: number) => Promise<void>
  goBack: () => Promise<void>

  readFileAsText: (node: FsNode) => Promise<string>
  getFileUrl: (node: FsNode) => string
  writeFile: (node: FsNode, content: string) => Promise<void>
  createFolder: (name: string) => Promise<void>
  createFile: (name: string) => Promise<void>
  deleteEntry: (node: FsNode) => Promise<void>
  renameEntry: (node: FsNode, newName: string) => Promise<void>
  refresh: () => Promise<void>
}

/* ================================================================
   Breadcrumb computation (pure function)
   ================================================================ */

function computeBreadcrumbs(currentPath: string, rootName: string): FsBreadcrumb[] {
  const crumbs: FsBreadcrumb[] = [{ name: rootName || 'Root', path: '/' }]

  if (currentPath === '/') return crumbs

  const segments = currentPath.split('/').filter(Boolean)
  let accumulated = ''
  for (const seg of segments) {
    accumulated += '/' + seg
    crumbs.push({ name: seg, path: accumulated })
  }

  return crumbs
}

/* ================================================================
   Hook
   ================================================================ */

export function useFileSystem(): UseFileSystemReturn {
  const [currentPath, setCurrentPath] = useState('/')
  const [entries, setEntries] = useState<FsNode[]>([])
  const [rootName, setRootName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])

  // Abort controller ref for cancelling in-flight requests on rapid navigation
  const abortRef = useRef<AbortController | null>(null)

  /* ---- Core directory loader ---- */

  const loadDirectory = useCallback(async (dirPath: string) => {
    // Cancel any previous in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const result = await fsApi.listDirectory(dirPath)

      // If this request was aborted, ignore the result
      if (controller.signal.aborted) return

      setEntries(result.entries)
      if (result.rootName) setRootName(result.rootName)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to load directory')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  /* ---- Load root on mount ---- */

  useEffect(() => {
    loadDirectory('/')
  }, [loadDirectory])

  /* ---- Breadcrumbs (derived) ---- */

  const breadcrumbs = computeBreadcrumbs(currentPath, rootName)

  /* ---- Navigation ---- */

  const navigateInto = useCallback(async (node: FsNode) => {
    setHistory(prev => [...prev, currentPath])
    setCurrentPath(node.path)
    await loadDirectory(node.path)
  }, [currentPath, loadDirectory])

  const navigateTo = useCallback(async (path: string) => {
    if (path === currentPath) return
    setHistory(prev => [...prev, currentPath])
    setCurrentPath(path)
    await loadDirectory(path)
  }, [currentPath, loadDirectory])

  const navigateToBreadcrumb = useCallback(async (index: number) => {
    const target = breadcrumbs[index]
    if (!target || target.path === currentPath) return
    setHistory(prev => [...prev, currentPath])
    setCurrentPath(target.path)
    await loadDirectory(target.path)
  }, [breadcrumbs, currentPath, loadDirectory])

  const goBack = useCallback(async () => {
    if (history.length === 0) return
    const prevPath = history[history.length - 1]
    setHistory(prev => prev.slice(0, -1))
    setCurrentPath(prevPath)
    await loadDirectory(prevPath)
  }, [history, loadDirectory])

  /* ---- File operations ---- */

  const readFileAsText = useCallback(async (node: FsNode): Promise<string> => {
    return fsApi.readFileAsText(node.path)
  }, [])

  const getFileUrl = useCallback((node: FsNode): string => {
    return fsApi.getFileUrl(node.path)
  }, [])

  const writeFile = useCallback(async (node: FsNode, content: string): Promise<void> => {
    await fsApi.writeFile(node.path, content)
  }, [])

  /* ---- CRUD operations (operate on currentPath directory) ---- */

  const createFolder = useCallback(async (name: string) => {
    setError(null)
    try {
      await fsApi.createFolder(currentPath, name)
      await loadDirectory(currentPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
    }
  }, [currentPath, loadDirectory])

  const createFile = useCallback(async (name: string) => {
    setError(null)
    try {
      await fsApi.createFile(currentPath, name)
      await loadDirectory(currentPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create file')
    }
  }, [currentPath, loadDirectory])

  const deleteEntry = useCallback(async (node: FsNode) => {
    setError(null)
    try {
      await fsApi.deleteEntry(node.path)
      await loadDirectory(currentPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }, [currentPath, loadDirectory])

  const renameEntry = useCallback(async (node: FsNode, newName: string) => {
    setError(null)
    try {
      await fsApi.renameEntry(node.path, newName)
      await loadDirectory(currentPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename')
    }
  }, [currentPath, loadDirectory])

  const refresh = useCallback(async () => {
    await loadDirectory(currentPath)
  }, [currentPath, loadDirectory])

  return {
    loading,
    error,
    rootName,
    entries,
    breadcrumbs,
    currentPath,
    navigateInto,
    navigateTo,
    navigateToBreadcrumb,
    goBack,
    readFileAsText,
    getFileUrl,
    writeFile,
    createFolder,
    createFile,
    deleteEntry,
    renameEntry,
    refresh,
  }
}
