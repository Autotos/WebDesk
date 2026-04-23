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
  const watcher = watch(rootDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.DS_Store',
      '**/dist/**',
      '**/.cache/**',
      '**/*.swp',
      '**/*~',
    ],
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
