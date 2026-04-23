import fs from 'node:fs/promises'
import path from 'node:path'
import { resolveSafePath, toRelativePath, validateName } from '../utils/pathSecurity.js'

/* ================================================================
   File kind detection (mirrors frontend fileSystem.ts)
   ================================================================ */

type FileKind =
  | 'folder' | 'image' | 'document' | 'music'
  | 'code' | 'archive' | 'video' | 'app' | 'other'

const EXT_TO_KIND: Record<string, FileKind> = {
  // image
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image',
  svg: 'image', webp: 'image', bmp: 'image', ico: 'image',
  // code
  ts: 'code', tsx: 'code', js: 'code', jsx: 'code',
  json: 'code', html: 'code', css: 'code', scss: 'code',
  py: 'code', rs: 'code', go: 'code', java: 'code',
  c: 'code', cpp: 'code', h: 'code', hpp: 'code',
  sh: 'code', yaml: 'code', yml: 'code', toml: 'code',
  xml: 'code', sql: 'code', graphql: 'code',
  vue: 'code', svelte: 'code', astro: 'code',
  // document
  md: 'document', txt: 'document', pdf: 'document',
  doc: 'document', docx: 'document',
  xls: 'document', xlsx: 'document',
  ppt: 'document', pptx: 'document',
  csv: 'document', rtf: 'document',
  // music
  mp3: 'music', wav: 'music', flac: 'music',
  aac: 'music', ogg: 'music', m4a: 'music',
  // video
  mp4: 'video', mkv: 'video', avi: 'video',
  mov: 'video', webm: 'video',
  // archive
  zip: 'archive', tar: 'archive', gz: 'archive',
  rar: 'archive', '7z': 'archive', bz2: 'archive',
  // app
  app: 'app', exe: 'app', dmg: 'app', deb: 'app',
  rpm: 'app', msi: 'app', appimage: 'app',
}

function getFileKind(name: string): FileKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_KIND[ext] ?? 'other'
}

/* ================================================================
   FsNode shape (sent to frontend)
   ================================================================ */

interface FsNode {
  id: string
  name: string
  type: 'folder' | 'file'
  kind: FileKind
  size?: number
  modified: string
  path: string
}

/* ================================================================
   Service functions
   ================================================================ */

const MAX_TEXT_SIZE = 10 * 1024 * 1024 // 10 MB

export async function listDirectory(
  dirPath: string,
  rootDir: string,
): Promise<{ entries: FsNode[]; rootName: string }> {
  const resolved = resolveSafePath(dirPath, rootDir)

  const dirents = await fs.readdir(resolved, { withFileTypes: true })

  const entries: FsNode[] = []
  for (const dirent of dirents) {
    // Skip hidden files/folders (starting with .)
    if (dirent.name.startsWith('.')) continue

    const entryAbsolute = path.join(resolved, dirent.name)
    const entryRelPath = toRelativePath(entryAbsolute, rootDir)

    if (dirent.isDirectory()) {
      let modified = ''
      try {
        const stat = await fs.stat(entryAbsolute)
        modified = stat.mtime.toISOString().slice(0, 10)
      } catch { /* ignore stat errors */ }

      entries.push({
        id: entryRelPath,
        name: dirent.name,
        type: 'folder',
        kind: 'folder',
        modified,
        path: entryRelPath,
      })
    } else if (dirent.isFile()) {
      let size: number | undefined
      let modified = ''
      try {
        const stat = await fs.stat(entryAbsolute)
        size = stat.size
        modified = stat.mtime.toISOString().slice(0, 10)
      } catch { /* ignore stat errors */ }

      entries.push({
        id: entryRelPath,
        name: dirent.name,
        type: 'file',
        kind: getFileKind(dirent.name),
        size,
        modified,
        path: entryRelPath,
      })
    }
  }

  // Sort: folders first, then alphabetical by name (case-insensitive)
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

  const rootName = path.basename(rootDir)
  return { entries, rootName }
}

export async function readFileAsText(
  filePath: string,
  rootDir: string,
): Promise<string> {
  const resolved = resolveSafePath(filePath, rootDir)

  const stat = await fs.stat(resolved)
  if (stat.isDirectory()) {
    throw new Error('Cannot read a directory as text')
  }
  if (stat.size > MAX_TEXT_SIZE) {
    const err = new Error(`File too large (${(stat.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_TEXT_SIZE / 1024 / 1024} MB.`)
    ;(err as NodeJS.ErrnoException).code = 'PAYLOAD_TOO_LARGE'
    throw err
  }

  return fs.readFile(resolved, 'utf-8')
}

export function getAbsolutePath(
  filePath: string,
  rootDir: string,
): string {
  return resolveSafePath(filePath, rootDir)
}

export async function writeFile(
  filePath: string,
  content: string,
  rootDir: string,
): Promise<void> {
  const resolved = resolveSafePath(filePath, rootDir)
  await fs.writeFile(resolved, content, 'utf-8')
}

export async function createFolder(
  dirPath: string,
  name: string,
  rootDir: string,
): Promise<void> {
  validateName(name)
  const parentResolved = resolveSafePath(dirPath, rootDir)
  const newPath = path.join(parentResolved, name)

  // Re-validate the final path stays in sandbox
  resolveSafePath(toRelativePath(newPath, rootDir), rootDir)

  await fs.mkdir(newPath)
}

export async function createFile(
  dirPath: string,
  name: string,
  rootDir: string,
): Promise<void> {
  validateName(name)
  const parentResolved = resolveSafePath(dirPath, rootDir)
  const newPath = path.join(parentResolved, name)

  resolveSafePath(toRelativePath(newPath, rootDir), rootDir)

  await fs.writeFile(newPath, '', 'utf-8')
}

export async function deleteEntry(
  entryPath: string,
  rootDir: string,
): Promise<void> {
  const resolved = resolveSafePath(entryPath, rootDir)

  // Prevent deleting the root directory itself
  if (resolved === path.resolve(rootDir)) {
    throw new Error('Cannot delete the root directory')
  }

  await fs.rm(resolved, { recursive: true, force: true })
}

export async function renameEntry(
  entryPath: string,
  newName: string,
  rootDir: string,
): Promise<void> {
  validateName(newName)
  const resolved = resolveSafePath(entryPath, rootDir)

  // Prevent renaming the root
  if (resolved === path.resolve(rootDir)) {
    throw new Error('Cannot rename the root directory')
  }

  const parentDir = path.dirname(resolved)
  const newPath = path.join(parentDir, newName)

  // Validate the new path stays in sandbox
  resolveSafePath(toRelativePath(newPath, rootDir), rootDir)

  await fs.rename(resolved, newPath)
}
