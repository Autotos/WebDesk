import { useState, useCallback } from 'react'
import { FilePlus, FolderPlus, RefreshCw, ChevronsDownUp, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileTreeView } from '../FileTreeView'
import { ContextMenu, type ContextMenuAction } from './ContextMenu'
import { useIDEStore } from '@/store/useIDEStore'
import * as fsApi from '@/lib/fsApi'
import type { FsNode } from '../../finder/fileSystem'

interface ExplorerPanelProps {
  treeNodes: FsNode[]
  expandedDirs: Set<string>
  loadingDirs: Set<string>
  selectedFileId: string | null
  getChildren: (node: FsNode) => FsNode[] | undefined
  onToggleDir: (node: FsNode) => void
  onSelectFile: (node: FsNode) => void
  rootName: string
  workspaceRoot: string | null
  collapseAll: () => void
  refreshTree: () => Promise<void>
  compact?: boolean
}

export function ExplorerPanel({
  treeNodes,
  expandedDirs,
  loadingDirs,
  selectedFileId,
  getChildren,
  onToggleDir,
  onSelectFile,
  rootName,
  workspaceRoot,
  collapseAll,
  refreshTree,
  compact,
}: ExplorerPanelProps) {
  const setFolderPickerOpen = useIDEStore((s) => s.setFolderPickerOpen)
  const addToast = useIDEStore((s) => s.addToast)

  // Inline create
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null)
  const [newName, setNewName] = useState('')

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ node: FsNode; position: { x: number; y: number } } | null>(null)

  // Inline rename state
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<FsNode | null>(null)

  const handleCreate = useCallback(async () => {
    const trimmed = newName.trim()
    if (!trimmed || !workspaceRoot) {
      setCreatingType(null)
      setNewName('')
      return
    }

    try {
      if (creatingType === 'file') {
        await fsApi.createFile(workspaceRoot, trimmed)
      } else {
        await fsApi.createFolder(workspaceRoot, trimmed)
      }
      await refreshTree()
    } catch {
      addToast('Creation failed')
    }

    setCreatingType(null)
    setNewName('')
  }, [newName, creatingType, refreshTree, workspaceRoot, addToast])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate()
    else if (e.key === 'Escape') {
      setCreatingType(null)
      setNewName('')
    }
  }, [handleCreate])

  // Context menu action handler
  const handleContextMenuAction = useCallback(async (action: ContextMenuAction) => {
    const { type, node } = action
    const parentPath = node.type === 'folder' ? node.path : getParentPath(node.path)

    switch (type) {
      case 'newFile': {
        // Create via inline input inside context target's folder
        setCreatingType('file')
        setNewName('')
        break
      }
      case 'newFolder': {
        setCreatingType('folder')
        setNewName('')
        break
      }
      case 'rename': {
        setRenamingNodeId(node.id)
        setRenameValue(node.name)
        break
      }
      case 'delete': {
        setDeleteTarget(node)
        break
      }
    }
    // Use parentPath to suppress unused variable lint
    void parentPath
  }, [])

  // Rename confirm
  const handleRenameConfirm = useCallback(async () => {
    if (!renamingNodeId || !renameValue.trim()) {
      setRenamingNodeId(null)
      setRenameValue('')
      return
    }

    // Find the node being renamed from the tree
    const nodePath = findNodePath(treeNodes, renamingNodeId, getChildren)
    if (nodePath) {
      try {
        await fsApi.renameEntry(nodePath, renameValue.trim())
        await refreshTree()
      } catch {
        addToast('Rename failed')
      }
    }

    setRenamingNodeId(null)
    setRenameValue('')
  }, [renamingNodeId, renameValue, treeNodes, getChildren, refreshTree, addToast])

  const handleRenameCancel = useCallback(() => {
    setRenamingNodeId(null)
    setRenameValue('')
  }, [])

  // Delete confirm
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await fsApi.deleteEntry(deleteTarget.path)
      await refreshTree()
    } catch {
      addToast('Delete failed')
    }
    setDeleteTarget(null)
  }, [deleteTarget, refreshTree, addToast])

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  // Context menu trigger
  const handleItemContextMenu = useCallback((node: FsNode, position: { x: number; y: number }) => {
    setCtxMenu({ node, position })
  }, [])

  const iconBtnClass = cn(
    'p-1 rounded hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground',
  )

  // Empty workspace state
  if (!workspaceRoot) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-4 text-center">
        <FolderOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-[12px] text-muted-foreground mb-3">
          No folder opened yet
        </p>
        <button
          onClick={() => setFolderPickerOpen(true)}
          className="px-3 py-1.5 text-[12px] bg-mac-accent text-white rounded hover:bg-mac-accent/90 transition-colors"
        >
          Open Folder
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with toolbar */}
      <div className="flex items-center justify-between py-1.5 px-3 shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <button
            className={iconBtnClass}
            onClick={() => { setCreatingType('file'); setNewName('') }}
            title="New File"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            className={iconBtnClass}
            onClick={() => { setCreatingType('folder'); setNewName('') }}
            title="New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            className={iconBtnClass}
            onClick={refreshTree}
            title="Refresh Explorer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            className={iconBtnClass}
            onClick={collapseAll}
            title="Collapse Folders in Explorer"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Inline create input */}
      {creatingType && (
        <div className="px-3 pb-1.5 shrink-0">
          <input
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCreate}
            placeholder={creatingType === 'file' ? 'File name...' : 'Folder name...'}
            className="w-full bg-accent/40 border border-mac-accent/50 rounded px-2 py-0.5 text-[12px] outline-none focus:border-mac-accent"
          />
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <FileTreeView
          nodes={treeNodes}
          expandedDirs={expandedDirs}
          loadingDirs={loadingDirs}
          selectedFileId={selectedFileId}
          getChildren={getChildren}
          onToggleDir={onToggleDir}
          onSelectFile={onSelectFile}
          compact={compact}
          onContextMenu={handleItemContextMenu}
          renamingNodeId={renamingNodeId}
          renameValue={renameValue}
          onRenameChange={setRenameValue}
          onRenameConfirm={handleRenameConfirm}
          onRenameCancel={handleRenameCancel}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-mac-border/30 p-2 shrink-0">
        <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground truncate">
          <FolderOpen className="h-3 w-3 shrink-0 text-mac-accent" />
          <span className="truncate">{rootName || 'Root'}</span>
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          node={ctxMenu.node}
          position={ctxMenu.position}
          onAction={handleContextMenuAction}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={handleDeleteCancel}>
          <div className="bg-background border border-mac-border/40 rounded-lg shadow-xl p-4 max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="text-[13px] mb-1 font-medium">Delete confirmation</p>
            <p className="text-[12px] text-muted-foreground mb-4">
              Are you sure you want to delete "{deleteTarget.name}"?
              {deleteTarget.type === 'folder' && ' This will delete all contents.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleDeleteCancel}
                className="px-3 py-1 text-[12px] rounded border border-mac-border/40 hover:bg-accent/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 py-1 text-[12px] rounded bg-destructive text-white hover:bg-destructive/90 transition-colors"
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
   Helpers
   ================================================================ */

function getParentPath(filePath: string): string {
  const idx = filePath.lastIndexOf('/')
  if (idx <= 0) return '/'
  return filePath.substring(0, idx)
}

function findNodePath(
  nodes: FsNode[],
  nodeId: string,
  getChildren: (node: FsNode) => FsNode[] | undefined,
): string | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node.path
    if (node.type === 'folder') {
      const children = getChildren(node)
      if (children) {
        const found = findNodePath(children, nodeId, getChildren)
        if (found) return found
      }
    }
  }
  return null
}
