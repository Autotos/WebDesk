import { useState, useCallback, useEffect } from 'react'
import { ChevronRight, ChevronDown, FolderOpen, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as fsApi from '@/lib/fsApi'
import type { FsNode } from '../../finder/fileSystem'

interface FolderPickerDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (path: string) => void
}

export function FolderPickerDialog({ open, onClose, onSelect }: FolderPickerDialogProps) {
  const [roots, setRoots] = useState<FsNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [children, setChildren] = useState<Map<string, FsNode[]>>(new Map())
  const [loading, setLoading] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [rootLoading, setRootLoading] = useState(false)

  // Load root directories on open
  useEffect(() => {
    if (!open) return
    setRootLoading(true)
    setSelected(null)
    setExpanded(new Set())
    setChildren(new Map())
    fsApi.listDirectory('/').then((result) => {
      setRoots(result.entries.filter((n) => n.type === 'folder'))
    }).catch(() => {
      // ignore
    }).finally(() => setRootLoading(false))
  }, [open])

  const toggleExpand = useCallback(async (node: FsNode) => {
    if (expanded.has(node.path)) {
      setExpanded((prev) => {
        const next = new Set(prev)
        next.delete(node.path)
        return next
      })
      return
    }

    if (!children.has(node.path)) {
      setLoading((prev) => new Set(prev).add(node.path))
      try {
        const result = await fsApi.listDirectory(node.path)
        setChildren((prev) => new Map(prev).set(node.path, result.entries.filter((n) => n.type === 'folder')))
      } catch {
        // ignore
      } finally {
        setLoading((prev) => {
          const next = new Set(prev)
          next.delete(node.path)
          return next
        })
      }
    }

    setExpanded((prev) => new Set(prev).add(node.path))
  }, [expanded, children])

  const handleConfirm = useCallback(() => {
    if (selected) {
      onSelect(selected)
      onClose()
    }
  }, [selected, onSelect, onClose])

  // Select root directory itself
  const handleSelectRoot = useCallback(() => {
    setSelected('/')
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background border border-mac-border/40 rounded-lg shadow-2xl w-[420px] max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-mac-border/30">
          <span className="text-[13px] font-medium">Open Folder</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-auto p-2 min-h-[200px]">
          {rootLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Root entry (home directory) */}
              <button
                className={cn(
                  'w-full flex items-center gap-1.5 px-2 py-1 text-[12px] rounded transition-colors',
                  selected === '/' ? 'bg-mac-accent/15 text-mac-accent' : 'hover:bg-accent/50',
                )}
                onClick={handleSelectRoot}
              >
                <FolderOpen className="h-3.5 w-3.5 text-mac-accent shrink-0" />
                <span className="truncate font-medium">~ (Home)</span>
              </button>

              {roots.map((node) => (
                <FolderNode
                  key={node.id}
                  node={node}
                  depth={1}
                  expanded={expanded}
                  loading={loading}
                  children={children}
                  selected={selected}
                  onToggle={toggleExpand}
                  onSelect={setSelected}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-mac-border/30">
          <span className="text-[11px] text-muted-foreground truncate max-w-[240px]">
            {selected || 'Select a folder'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-[12px] rounded border border-mac-border/40 hover:bg-accent/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selected}
              className={cn(
                'px-3 py-1 text-[12px] rounded transition-colors',
                selected
                  ? 'bg-mac-accent text-white hover:bg-mac-accent/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              Open
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   Internal folder tree node
   ================================================================ */

function FolderNode({
  node,
  depth,
  expanded,
  loading,
  children,
  selected,
  onToggle,
  onSelect,
}: {
  node: FsNode
  depth: number
  expanded: Set<string>
  loading: Set<string>
  children: Map<string, FsNode[]>
  selected: string | null
  onToggle: (node: FsNode) => void
  onSelect: (path: string) => void
}) {
  const isExpanded = expanded.has(node.path)
  const isLoading = loading.has(node.path)
  const isSelected = selected === node.path
  const childNodes = children.get(node.path)

  return (
    <div>
      <button
        className={cn(
          'w-full flex items-center gap-1 text-[12px] py-1 rounded transition-colors',
          isSelected ? 'bg-mac-accent/15 text-mac-accent' : 'hover:bg-accent/50',
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={() => {
          onSelect(node.path)
          onToggle(node)
        }}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 shrink-0 text-muted-foreground animate-spin" />
        ) : isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-mac-accent" />
        <span className="truncate">{node.name}</span>
      </button>

      {isExpanded && childNodes && childNodes.map((child) => (
        <FolderNode
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          loading={loading}
          children={children}
          selected={selected}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
