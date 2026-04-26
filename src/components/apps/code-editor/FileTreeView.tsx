import { useCallback, useRef } from 'react'
import { ChevronRight, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type FsNode, FILE_ICON_MAP, FILE_COLOR_MAP } from '../finder/fileSystem'

interface FileTreeViewProps {
  nodes: FsNode[]
  depth?: number
  expandedDirs: Set<string>
  loadingDirs: Set<string>
  selectedFileId: string | null
  getChildren: (node: FsNode) => FsNode[] | undefined
  onToggleDir: (node: FsNode) => void
  onSelectFile: (node: FsNode) => void
  compact?: boolean
  onContextMenu?: (node: FsNode, position: { x: number; y: number }) => void
  renamingNodeId?: string | null
  renameValue?: string
  onRenameChange?: (value: string) => void
  onRenameConfirm?: () => void
  onRenameCancel?: () => void
}

export function FileTreeView({
  nodes,
  depth = 0,
  expandedDirs,
  loadingDirs,
  selectedFileId,
  getChildren,
  onToggleDir,
  onSelectFile,
  compact,
  onContextMenu,
  renamingNodeId,
  renameValue,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
}: FileTreeViewProps) {
  return (
    <div>
      {nodes.map(node => (
        <FileTreeItem
          key={node.id}
          node={node}
          depth={depth}
          expandedDirs={expandedDirs}
          loadingDirs={loadingDirs}
          selectedFileId={selectedFileId}
          getChildren={getChildren}
          onToggleDir={onToggleDir}
          onSelectFile={onSelectFile}
          compact={compact}
          onContextMenu={onContextMenu}
          renamingNodeId={renamingNodeId}
          renameValue={renameValue}
          onRenameChange={onRenameChange}
          onRenameConfirm={onRenameConfirm}
          onRenameCancel={onRenameCancel}
        />
      ))}
    </div>
  )
}

function FileTreeItem({
  node,
  depth,
  expandedDirs,
  loadingDirs,
  selectedFileId,
  getChildren,
  onToggleDir,
  onSelectFile,
  compact,
  onContextMenu,
  renamingNodeId,
  renameValue,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
}: {
  node: FsNode
  depth: number
} & Omit<FileTreeViewProps, 'nodes' | 'depth'>) {
  const isFolder = node.type === 'folder'
  const isExpanded = expandedDirs.has(node.id)
  const isLoading = loadingDirs.has(node.id)
  const isSelected = selectedFileId === node.id
  const isRenaming = renamingNodeId === node.id
  const children = isFolder ? getChildren(node) : undefined

  const Icon = FILE_ICON_MAP[node.kind]
  const color = FILE_COLOR_MAP[node.kind]

  const py = compact ? 'py-[3px]' : 'py-1.5'

  // Long press for mobile
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const movedRef = useRef(false)
  const firedRef = useRef(false)

  const handleClick = () => {
    if (isFolder) {
      onToggleDir(node)
    } else {
      onSelectFile(node)
    }
  }

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu?.(node, { x: e.clientX, y: e.clientY })
  }, [node, onContextMenu])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    movedRef.current = false
    firedRef.current = false
    const touch = e.touches[0]
    const pos = { x: touch.clientX, y: touch.clientY }
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      onContextMenu?.(node, pos)
    }, 500)
  }, [node, onContextMenu])

  const handleTouchMove = useCallback(() => {
    if (timerRef.current && !movedRef.current) {
      movedRef.current = true
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (firedRef.current) {
      e.preventDefault()
    }
  }, [])

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onRenameConfirm?.()
    else if (e.key === 'Escape') onRenameCancel?.()
  }, [onRenameConfirm, onRenameCancel])

  return (
    <div>
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={onContextMenu ? handleTouchStart : undefined}
        onTouchMove={onContextMenu ? handleTouchMove : undefined}
        onTouchEnd={onContextMenu ? handleTouchEnd : undefined}
        className={cn(
          'w-full flex items-center gap-1 text-left transition-colors',
          compact ? 'text-[12px]' : 'text-[13px]',
          py,
          isSelected && !isFolder
            ? 'bg-mac-accent/15 text-mac-accent'
            : 'hover:bg-accent/50 active:bg-accent/50',
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
      >
        {isFolder ? (
          isLoading ? (
            <Loader2 className="h-3 w-3 shrink-0 text-muted-foreground animate-spin" />
          ) : isExpanded ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon className={cn('h-3.5 w-3.5 shrink-0', color)} />
        {isRenaming ? (
          <input
            type="text"
            autoFocus
            value={renameValue ?? ''}
            onChange={(e) => onRenameChange?.(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={() => onRenameConfirm?.()}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-accent/40 border border-mac-accent/50 rounded px-1 py-0 text-inherit outline-none focus:border-mac-accent"
          />
        ) : (
          <span className="truncate">{node.name}</span>
        )}
      </button>

      {isFolder && isExpanded && children && (
        <FileTreeView
          nodes={children}
          depth={depth + 1}
          expandedDirs={expandedDirs}
          loadingDirs={loadingDirs}
          selectedFileId={selectedFileId}
          getChildren={getChildren}
          onToggleDir={onToggleDir}
          onSelectFile={onSelectFile}
          compact={compact}
          onContextMenu={onContextMenu}
          renamingNodeId={renamingNodeId}
          renameValue={renameValue}
          onRenameChange={onRenameChange}
          onRenameConfirm={onRenameConfirm}
          onRenameCancel={onRenameCancel}
        />
      )}
    </div>
  )
}
