import { watch, type FSWatcher } from 'chokidar'
import path from 'node:path'
import { toRelativePath } from '../utils/pathSecurity.js'

/* ================================================================
   Types
   ================================================================ */

export interface FsEvent {
  event: 'create' | 'modify' | 'delete'
  path: string          // relative path (e.g., "/src/foo.ts")
  absolutePath: string  // for selfSaveTracker lookup
  type: 'file' | 'directory'
}

type FsEventCallback = (fsEvent: FsEvent) => void

/* ================================================================
   Watcher factory
   ================================================================ */

export function createFileWatcher(
  rootDir: string,
  onFsEvent: FsEventCallback,
): FSWatcher {
  // Use a function-based ignored so chokidar skips entire directory trees
  // without even opening them. Glob patterns can still descend into dirs
  // before matching, exhausting inotify watchers on large ROOT_DIR.
  const SKIP_DIRS = new Set([
    'node_modules', 'dist', 'build', '.cache', '__pycache__',
    '.venv', 'venv', '.tox', '.next', '.nuxt', '.output',
  ])

  const ignored = (filePath: string): boolean => {
    if (filePath === rootDir) return false
    const basename = path.basename(filePath)
    // Skip hidden files/directories (.git, .npm, .cache, .DS_Store, etc.)
    if (basename.startsWith('.')) return true
    // Skip known heavy directories
    if (SKIP_DIRS.has(basename)) return true
    // Skip swap / backup files
    if (basename.endsWith('.swp') || basename.endsWith('~')) return true
    return false
  }

  const watcher = watch(rootDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
    ignored,
  })

  function emit(
    event: FsEvent['event'],
    absolutePath: string,
    type: FsEvent['type'],
  ) {
    try {
      const relativePath = toRelativePath(absolutePath, rootDir)
      onFsEvent({ event, path: relativePath, absolutePath, type })
    } catch {
      // Path outside sandbox — ignore
    }
  }

  watcher
    .on('add', (fp) => emit('create', path.resolve(fp), 'file'))
    .on('change', (fp) => emit('modify', path.resolve(fp), 'file'))
    .on('unlink', (fp) => emit('delete', path.resolve(fp), 'file'))
    .on('addDir', (fp) => emit('create', path.resolve(fp), 'directory'))
    .on('unlinkDir', (fp) => emit('delete', path.resolve(fp), 'directory'))
    .on('error', (err: unknown) => console.error('[file-watcher] error:', err))
    .on('ready', () => console.log('[file-watcher] Initial scan complete, watching for changes'))

  return watcher
}
