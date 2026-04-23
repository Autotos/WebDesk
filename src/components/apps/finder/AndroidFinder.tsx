import { useState } from 'react'
import {
  ChevronRight,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FILE_ICON_MAP,
  FILE_COLOR_MAP,
  formatFileSize,
  type FsNode,
} from './fileSystem'
import { useFileSystem } from '@/hooks/useFileSystem'
import { FilePreview } from './FilePreview'

export function AndroidFinder() {
  const fs = useFileSystem()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewNode, setPreviewNode] = useState<FsNode | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  // New folder / file dialog
  const [showNewDialog, setShowNewDialog] = useState<'folder' | 'file' | null>(null)
  const [newName, setNewName] = useState('')

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FsNode | null>(null)

  /* ---- Actions ---- */
  const handleItemTap = async (node: FsNode) => {
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

  // Full-screen preview
  if (previewNode) {
    return (
      <FilePreview
        node={previewNode}
        fs={fs}
        onClose={() => setPreviewNode(null)}
        compact
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-android-surface">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] bg-android-primary/10 text-android-primary">
          <FolderOpen className="h-4 w-4" />
          {fs.rootName}
        </div>

        <div className="flex-1" />

        {/* Overflow menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg active:bg-accent/60 transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border/50 rounded-xl shadow-lg py-1 min-w-[160px]">
                <button
                  onClick={() => { setShowNewDialog('folder'); setShowMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-[13px] active:bg-accent/60 flex items-center gap-3"
                >
                  <FolderPlus className="h-4 w-4" /> New Folder
                </button>
                <button
                  onClick={() => { setShowNewDialog('file'); setShowMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-[13px] active:bg-accent/60 flex items-center gap-3"
                >
                  <FilePlus className="h-4 w-4" /> New File
                </button>
                <div className="h-px bg-border/30 my-1" />
                <button
                  onClick={() => { fs.refresh(); setShowMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-[13px] active:bg-accent/60 flex items-center gap-3"
                >
                  <RefreshCw className="h-4 w-4" /> Refresh
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumb bar */}
      {fs.breadcrumbs.length > 0 && (
        <div className="flex items-center gap-0.5 px-4 py-2 overflow-x-auto shrink-0 border-b border-border/40">
          {fs.breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center shrink-0">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 mx-0.5 text-muted-foreground/40" />}
              <button
                onClick={() => handleBreadcrumbClick(i)}
                className={cn(
                  'text-[13px] px-1.5 py-0.5 rounded-md transition-colors truncate max-w-[100px]',
                  i === fs.breadcrumbs.length - 1
                    ? 'text-android-primary font-semibold'
                    : 'text-muted-foreground active:bg-accent'
                )}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Error banner */}
      {fs.error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-[13px] text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{fs.error}</span>
        </div>
      )}

      {/* File list */}
      {fs.loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : fs.entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
          <p>Empty folder</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {fs.entries.map((node) => {
            const Icon = FILE_ICON_MAP[node.kind]
            const color = FILE_COLOR_MAP[node.kind]
            return (
              <div
                key={node.id}
                className={cn(
                  'flex items-center gap-3.5 px-4 py-3',
                  'border-b border-border/30 transition-colors',
                  selectedId === node.id
                    ? 'bg-android-primary/8'
                    : 'active:bg-accent/60'
                )}
              >
                <button
                  className="flex-1 flex items-center gap-3.5 text-left min-w-0"
                  onClick={() => handleItemTap(node)}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      node.type === 'folder' ? 'bg-mac-accent/10' : 'bg-accent'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', color)} strokeWidth={1.5} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-foreground truncate">{node.name}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {node.type === 'folder' ? 'Folder' : formatFileSize(node.size)}
                      {node.modified && (
                        <>
                          <span className="mx-1.5">&middot;</span>
                          {node.modified}
                        </>
                      )}
                    </p>
                  </div>

                  {node.type === 'folder' && (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                </button>

                {selectedId === node.id && (
                  <button
                    onClick={() => setDeleteTarget(node)}
                    className="p-2 rounded-lg active:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom info */}
      <div className="px-4 py-2 border-t border-border/40 text-[12px] text-muted-foreground shrink-0 flex items-center gap-2">
        <span>{fs.entries.length} items</span>
      </div>

      {/* New dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={() => setShowNewDialog(null)}>
          <div className="bg-background border-t sm:border border-border/50 rounded-t-2xl sm:rounded-2xl shadow-xl p-5 w-full sm:w-80" onClick={(e) => e.stopPropagation()}>
            <p className="text-[15px] font-medium mb-4">
              New {showNewDialog === 'folder' ? 'Folder' : 'File'}
            </p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSubmit()}
              placeholder={showNewDialog === 'folder' ? 'Folder name' : 'filename.txt'}
              className="w-full px-4 py-2.5 rounded-xl bg-accent/50 border border-border/30 text-[14px] outline-none focus:border-android-primary/50"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNewDialog(null)} className="px-4 py-2 rounded-xl text-[13px] active:bg-accent transition-colors">Cancel</button>
              <button onClick={handleCreateSubmit} disabled={!newName.trim()} className="px-4 py-2 rounded-xl text-[13px] bg-android-primary text-white active:bg-android-primary/80 transition-colors disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={() => setDeleteTarget(null)}>
          <div className="bg-background border-t sm:border border-border/50 rounded-t-2xl sm:rounded-2xl shadow-xl p-5 w-full sm:w-80" onClick={(e) => e.stopPropagation()}>
            <p className="text-[15px] font-medium mb-2">Delete &ldquo;{deleteTarget.name}&rdquo;?</p>
            <p className="text-[13px] text-muted-foreground mb-4">
              {deleteTarget.type === 'folder'
                ? 'This folder and all its contents will be permanently deleted.'
                : 'This file will be permanently deleted.'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl text-[13px] active:bg-accent transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-xl text-[13px] bg-red-500 text-white active:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
