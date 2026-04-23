import { useState, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Monitor,
  FolderOpen,
  ArrowDown,
  Image,
  Music,
  FolderPlus,
  FilePlus,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SIDEBAR_SECTIONS,
  FILE_ICON_MAP,
  FILE_COLOR_MAP,
  formatFileSize,
  type FsNode,
} from './fileSystem'
import { useFileSystem } from '@/hooks/useFileSystem'
import { FilePreview } from './FilePreview'

const SIDEBAR_ICON_MAP: Record<string, typeof Monitor> = {
  desktop: Monitor,
  documents: FolderOpen,
  downloads: ArrowDown,
  pictures: Image,
  music: Music,
}

export function MacFinder() {
  const fs = useFileSystem()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeSidebar, setActiveSidebar] = useState<string | null>(null)
  const [previewNode, setPreviewNode] = useState<FsNode | null>(null)

  // New folder / file dialog
  const [showNewDialog, setShowNewDialog] = useState<'folder' | 'file' | null>(null)
  const [newName, setNewName] = useState('')
  const newNameInputRef = useRef<HTMLInputElement>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FsNode | null>(null)

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node?: FsNode } | null>(null)

  /* ---- Derived state ---- */
  const canGoBack = fs.breadcrumbs.length > 1

  /* ---- Sidebar actions ---- */
  const handleSidebarClick = async (itemId: string, targetPath: string) => {
    setActiveSidebar(itemId)
    setSelectedId(null)
    setPreviewNode(null)
    await fs.navigateTo(targetPath)
  }

  /* ---- Navigation ---- */
  const handleGoBack = async () => {
    setPreviewNode(null)
    await fs.goBack()
  }

  const handleItemClick = (node: FsNode) => {
    setSelectedId(node.id)
    setContextMenu(null)
  }

  const handleItemDoubleClick = async (node: FsNode) => {
    if (node.type === 'folder') {
      setSelectedId(null)
      setPreviewNode(null)
      await fs.navigateInto(node)
    } else {
      setPreviewNode(node)
    }
  }

  const handleBreadcrumbClick = async (index: number) => {
    setPreviewNode(null)
    await fs.navigateToBreadcrumb(index)
  }

  /* ---- Context menu ---- */
  const handleContextMenu = (e: React.MouseEvent, node?: FsNode) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  /* ---- CRUD ---- */
  const handleNewFolder = () => {
    setShowNewDialog('folder')
    setNewName('')
    setTimeout(() => newNameInputRef.current?.focus(), 50)
  }

  const handleNewFile = () => {
    setShowNewDialog('file')
    setNewName('')
    setTimeout(() => newNameInputRef.current?.focus(), 50)
  }

  const handleCreateSubmit = async () => {
    if (!newName.trim()) return
    if (showNewDialog === 'folder') {
      await fs.createFolder(newName.trim())
    } else {
      await fs.createFile(newName.trim())
    }
    setShowNewDialog(null)
    setNewName('')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await fs.deleteEntry(deleteTarget)
    if (previewNode?.id === deleteTarget.id) setPreviewNode(null)
    setSelectedId(null)
    setDeleteTarget(null)
  }

  return (
    <div className="flex h-full" onClick={() => setContextMenu(null)}>
      {/* ---- Sidebar ---- */}
      <aside className="w-[168px] shrink-0 bg-mac-sidebar/80 border-r border-mac-border/40 py-2 px-2 overflow-auto scrollbar-thin flex flex-col">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5 mt-1">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = SIDEBAR_ICON_MAP[item.id] ?? FolderOpen
              return (
                <button
                  key={item.id}
                  onClick={() => handleSidebarClick(item.id, item.targetPath)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-[5px] rounded-md text-[12px]',
                    'transition-colors',
                    activeSidebar === item.id
                      ? 'bg-mac-accent/15 text-mac-accent'
                      : 'text-foreground/70 hover:bg-accent'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}

        <div className="flex-1" />

        {/* Root name */}
        <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground truncate">
          <FolderOpen className="h-3 w-3 shrink-0 text-mac-accent" />
          <span className="truncate">{fs.rootName}</span>
        </div>
      </aside>

      {/* ---- Main area ---- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1 border-b border-mac-border/30 bg-mac-titlebar/50 shrink-0">
          {/* Back button */}
          <button
            disabled={!canGoBack}
            onClick={handleGoBack}
            className={cn(
              'p-1 rounded transition-colors',
              canGoBack ? 'hover:bg-accent text-foreground/70' : 'text-muted-foreground/30 cursor-default'
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Breadcrumbs */}
          <div className="flex-1 flex items-center gap-0.5 min-w-0 px-1 text-[12px] text-muted-foreground overflow-hidden">
            {fs.breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center shrink-0">
                {i > 0 && <ChevronRight className="h-3 w-3 mx-0.5 text-muted-foreground/40" />}
                <button
                  onClick={() => handleBreadcrumbClick(i)}
                  className={cn(
                    'hover:text-foreground transition-colors px-1 py-0.5 rounded truncate max-w-[120px]',
                    i === fs.breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''
                  )}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          {/* CRUD toolbar */}
          <div className="flex items-center gap-0.5 mr-1">
            <button onClick={handleNewFolder} className="p-1 rounded hover:bg-accent/50 transition-colors" title="New Folder">
              <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={handleNewFile} className="p-1 rounded hover:bg-accent/50 transition-colors" title="New File">
              <FilePlus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {selectedId && (
              <button
                onClick={() => {
                  const node = fs.entries.find((n) => n.id === selectedId)
                  if (node) setDeleteTarget(node)
                }}
                className="p-1 rounded hover:bg-red-500/10 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            )}
            <button onClick={() => fs.refresh()} className="p-1 rounded hover:bg-accent/50 transition-colors" title="Refresh">
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1 rounded', viewMode === 'grid' ? 'bg-accent' : 'hover:bg-accent/50')}
            >
              <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1 rounded', viewMode === 'list' ? 'bg-accent' : 'hover:bg-accent/50')}
            >
              <List className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Error banner */}
        {fs.error && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-[12px] text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">{fs.error}</span>
            <button onClick={() => fs.refresh()} className="shrink-0 underline">Dismiss</button>
          </div>
        )}

        {/* Content + Preview split */}
        <div className="flex-1 flex min-h-0">
          {/* File listing */}
          <div className="flex-1 flex flex-col min-w-0">
            {fs.loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : fs.entries.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                This folder is empty
              </div>
            ) : viewMode === 'grid' ? (
              <GridView
                items={fs.entries}
                selectedId={selectedId}
                onSelect={handleItemClick}
                onOpen={handleItemDoubleClick}
                onContextMenu={handleContextMenu}
              />
            ) : (
              <ListView
                items={fs.entries}
                selectedId={selectedId}
                onSelect={handleItemClick}
                onOpen={handleItemDoubleClick}
                onContextMenu={handleContextMenu}
              />
            )}

            {/* Status bar */}
            <div className="px-3 py-1 border-t border-mac-border/30 text-[11px] text-muted-foreground bg-mac-titlebar/30 shrink-0 flex items-center gap-2">
              <span>{fs.entries.length} items</span>
              {selectedId && (
                <span>&mdash; &ldquo;{fs.entries.find((n) => n.id === selectedId)?.name}&rdquo; selected</span>
              )}
            </div>
          </div>

          {/* Preview panel */}
          {previewNode && (
            <FilePreview
              node={previewNode}
              fs={fs}
              onClose={() => setPreviewNode(null)}
            />
          )}
        </div>
      </div>

      {/* ---- Context Menu ---- */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-mac-window/95 backdrop-blur-xl border border-mac-border/50 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button onClick={handleNewFolder} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-accent/50 transition-colors flex items-center gap-2">
            <FolderPlus className="h-3.5 w-3.5" /> New Folder
          </button>
          <button onClick={handleNewFile} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-accent/50 transition-colors flex items-center gap-2">
            <FilePlus className="h-3.5 w-3.5" /> New File
          </button>
          {contextMenu.node && (
            <>
              <div className="h-px bg-mac-border/30 my-1" />
              <button
                onClick={() => {
                  if (contextMenu.node) setDeleteTarget(contextMenu.node)
                  setContextMenu(null)
                }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-red-500/10 text-red-400 transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
          <button onClick={() => fs.refresh()} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-accent/50 transition-colors flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      )}

      {/* ---- New folder/file dialog ---- */}
      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowNewDialog(null)}>
          <div className="bg-mac-window border border-mac-border/50 rounded-xl shadow-xl p-4 w-72" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium mb-3">
              New {showNewDialog === 'folder' ? 'Folder' : 'File'}
            </p>
            <input
              ref={newNameInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSubmit()}
              placeholder={showNewDialog === 'folder' ? 'Folder name' : 'filename.txt'}
              className="w-full px-3 py-1.5 rounded-md bg-accent/50 border border-mac-border/30 text-sm outline-none focus:border-mac-accent/50"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowNewDialog(null)}
                className="px-3 py-1 rounded-md text-[12px] hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={!newName.trim()}
                className="px-3 py-1 rounded-md text-[12px] bg-mac-accent text-white hover:bg-mac-accent/90 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Delete confirmation ---- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setDeleteTarget(null)}>
          <div className="bg-mac-window border border-mac-border/50 rounded-xl shadow-xl p-4 w-80" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium mb-2">Delete &ldquo;{deleteTarget.name}&rdquo;?</p>
            <p className="text-[12px] text-muted-foreground mb-4">
              {deleteTarget.type === 'folder'
                ? 'This folder and all its contents will be permanently deleted.'
                : 'This file will be permanently deleted.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1 rounded-md text-[12px] hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1 rounded-md text-[12px] bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   Grid View
   ================================================================ */

function GridView({
  items, selectedId, onSelect, onOpen, onContextMenu,
}: {
  items: FsNode[]
  selectedId: string | null
  onSelect: (node: FsNode) => void
  onOpen: (node: FsNode) => void
  onContextMenu: (e: React.MouseEvent, node?: FsNode) => void
}) {
  return (
    <div
      className="flex-1 overflow-auto scrollbar-thin p-3 grid grid-cols-5 gap-1 content-start auto-rows-min"
      onContextMenu={(e) => onContextMenu(e)}
    >
      {items.map((node) => {
        const Icon = FILE_ICON_MAP[node.kind]
        const color = FILE_COLOR_MAP[node.kind]
        return (
          <button
            key={node.id}
            onClick={() => onSelect(node)}
            onDoubleClick={() => onOpen(node)}
            onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e, node) }}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
              selectedId === node.id ? 'bg-mac-accent/15' : 'hover:bg-accent/50'
            )}
          >
            <Icon className={cn('h-10 w-10', color)} strokeWidth={1.3} />
            <span className="text-[11px] leading-tight text-center truncate max-w-full px-1">
              {node.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ================================================================
   List View
   ================================================================ */

function ListView({
  items, selectedId, onSelect, onOpen, onContextMenu,
}: {
  items: FsNode[]
  selectedId: string | null
  onSelect: (node: FsNode) => void
  onOpen: (node: FsNode) => void
  onContextMenu: (e: React.MouseEvent, node?: FsNode) => void
}) {
  return (
    <div className="flex-1 overflow-auto scrollbar-thin" onContextMenu={(e) => onContextMenu(e)}>
      <table className="w-full text-[12px]">
        <thead className="sticky top-0 bg-mac-window z-[1]">
          <tr className="text-left text-muted-foreground border-b border-mac-border/30">
            <th className="py-1.5 px-3 font-medium">Name</th>
            <th className="py-1.5 px-3 font-medium w-20 text-right">Size</th>
            <th className="py-1.5 px-3 font-medium w-20">Kind</th>
            <th className="py-1.5 px-3 font-medium w-24">Modified</th>
          </tr>
        </thead>
        <tbody>
          {items.map((node) => {
            const Icon = FILE_ICON_MAP[node.kind]
            const color = FILE_COLOR_MAP[node.kind]
            return (
              <tr
                key={node.id}
                onClick={() => onSelect(node)}
                onDoubleClick={() => onOpen(node)}
                onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e, node) }}
                className={cn(
                  'cursor-default transition-colors',
                  selectedId === node.id ? 'bg-mac-accent/15' : 'hover:bg-accent/50'
                )}
              >
                <td className="py-1 px-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4 shrink-0', color)} />
                    <span className="truncate">{node.name}</span>
                  </div>
                </td>
                <td className="py-1 px-3 text-muted-foreground text-right tabular-nums">
                  {node.type === 'folder' ? '--' : formatFileSize(node.size)}
                </td>
                <td className="py-1 px-3 text-muted-foreground capitalize">{node.kind}</td>
                <td className="py-1 px-3 text-muted-foreground tabular-nums">{node.modified}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
