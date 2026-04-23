import {
  FolderOpen,
  FileText,
  Image,
  Music,
  FileCode,
  File,
  Archive,
  Film,
  AppWindow,
  type LucideIcon,
} from 'lucide-react'

/* ================================================================
   File System Data Types
   ================================================================ */

export type FileKind =
  | 'folder'
  | 'image'
  | 'document'
  | 'music'
  | 'code'
  | 'archive'
  | 'video'
  | 'app'
  | 'other'

export interface FsNode {
  id: string
  name: string
  type: 'folder' | 'file'
  kind: FileKind
  /** File size in bytes (folders have no size) */
  size?: number
  modified: string
  /** Relative path from ROOT_DIR, e.g. "/src/App.tsx" */
  path: string
}

/* ================================================================
   Icon / color mapping
   ================================================================ */

export const FILE_ICON_MAP: Record<FileKind, LucideIcon> = {
  folder: FolderOpen,
  image: Image,
  document: FileText,
  music: Music,
  code: FileCode,
  archive: Archive,
  video: Film,
  app: AppWindow,
  other: File,
}

export const FILE_COLOR_MAP: Record<FileKind, string> = {
  folder: 'text-mac-accent',
  image: 'text-green-500',
  document: 'text-orange-400',
  music: 'text-pink-500',
  code: 'text-violet-500',
  archive: 'text-yellow-600',
  video: 'text-red-400',
  app: 'text-blue-400',
  other: 'text-muted-foreground',
}

/* ================================================================
   Determine FileKind from file name
   ================================================================ */

const EXT_TO_KIND: Record<string, FileKind> = {
  // image
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image', webp: 'image', bmp: 'image', ico: 'image',
  // code
  ts: 'code', tsx: 'code', js: 'code', jsx: 'code', json: 'code', html: 'code', css: 'code', scss: 'code',
  py: 'code', rs: 'code', go: 'code', java: 'code', c: 'code', cpp: 'code', h: 'code', hpp: 'code',
  sh: 'code', yaml: 'code', yml: 'code', toml: 'code', xml: 'code', sql: 'code', graphql: 'code',
  vue: 'code', svelte: 'code', astro: 'code',
  // document
  md: 'document', txt: 'document', pdf: 'document', doc: 'document', docx: 'document',
  xls: 'document', xlsx: 'document', ppt: 'document', pptx: 'document', csv: 'document', rtf: 'document',
  // music
  mp3: 'music', wav: 'music', flac: 'music', aac: 'music', ogg: 'music', m4a: 'music',
  // video
  mp4: 'video', mkv: 'video', avi: 'video', mov: 'video', webm: 'video',
  // archive
  zip: 'archive', tar: 'archive', gz: 'archive', rar: 'archive', '7z': 'archive', bz2: 'archive',
  // app
  app: 'app', exe: 'app', dmg: 'app', deb: 'app', rpm: 'app', msi: 'app', appimage: 'app',
}

export function getFileKind(name: string): FileKind {
  const dot = name.lastIndexOf('.')
  if (dot === -1) return 'other'
  const ext = name.slice(dot + 1).toLowerCase()
  return EXT_TO_KIND[ext] ?? 'other'
}

/** Check if a file is likely to contain readable text */
export function isTextFile(name: string): boolean {
  const kind = getFileKind(name)
  return kind === 'code' || kind === 'document' && /\.(md|txt|csv|rtf)$/i.test(name)
}

/** Check if a file is an image that can be previewed */
export function isImageFile(name: string): boolean {
  return getFileKind(name) === 'image'
}

export function formatFileSize(bytes?: number): string {
  if (bytes == null) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/* ================================================================
   Sidebar quick-access entries (macOS Finder)
   ================================================================ */

export const SIDEBAR_SECTIONS = [
  {
    title: 'Favorites',
    items: [
      { id: 'desktop', label: 'Desktop', targetPath: '/Desktop' },
      { id: 'documents', label: 'Documents', targetPath: '/Documents' },
      { id: 'downloads', label: 'Downloads', targetPath: '/Downloads' },
      { id: 'pictures', label: 'Pictures', targetPath: '/Pictures' },
      { id: 'music', label: 'Music', targetPath: '/Music' },
    ],
  },
]
