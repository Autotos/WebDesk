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
}: {
  node: FsNode
  depth: number
} & Omit<FileTreeViewProps, 'nodes' | 'depth'>) {
  const isFolder = node.type === 'folder'
  const isExpanded = expandedDirs.has(node.id)
  const isLoading = loadingDirs.has(node.id)
  const isSelected = selectedFileId === node.id
  const children = isFolder ? getChildren(node) : undefined

  const Icon = FILE_ICON_MAP[node.kind]
  const color = FILE_COLOR_MAP[node.kind]

  const py = compact ? 'py-[3px]' : 'py-1.5'

  const handleClick = () => {
    if (isFolder) {
      onToggleDir(node)
    } else {
      onSelectFile(node)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
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
        <span className="truncate">{node.name}</span>
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
        />
      )}
    </div>
  )
}
