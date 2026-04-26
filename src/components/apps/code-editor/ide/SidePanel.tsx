import { useCallback, useRef, useEffect } from 'react'
import { Search, GitBranch, BookOpen, Play, Blocks } from 'lucide-react'
import { useIDEStore } from '@/store/useIDEStore'
import { ExplorerPanel } from './ExplorerPanel'
import { PlaceholderPanel } from './PlaceholderPanel'
import type { FsNode } from '../../finder/fileSystem'

/* ================================================================
   Placeholder config for non-explorer panels
   ================================================================ */

const PANEL_PLACEHOLDERS = {
  search: { icon: Search, title: 'Search', description: 'Global search coming soon' },
  scm: { icon: GitBranch, title: 'Source Control', description: 'Git integration coming soon' },
  wiki: { icon: BookOpen, title: 'Repo Wiki', description: 'Wiki coming soon' },
  debug: { icon: Play, title: 'Run and Debug', description: 'Debugger coming soon' },
  extensions: { icon: Blocks, title: 'Extensions', description: 'Extension marketplace coming soon' },
} as const

/* ================================================================
   SidePanel Component
   ================================================================ */

interface SidePanelProps {
  // Explorer data (from useCodeEditor)
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

export function SidePanel({
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
}: SidePanelProps) {
  const activeSidePanel = useIDEStore((s) => s.activeSidePanel)
  const sidePanelWidth = useIDEStore((s) => s.sidePanelWidth)
  const setSidePanelWidth = useIDEStore((s) => s.setSidePanelWidth)

  // Resize handle logic
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = sidePanelWidth
    e.preventDefault()
  }, [sidePanelWidth])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      setSidePanelWidth(startWidth.current + delta)
    }

    const handleMouseUp = () => {
      isDragging.current = false
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [setSidePanelWidth])

  if (!activeSidePanel) return null

  const panelStyle = compact ? undefined : { width: sidePanelWidth }

  return (
    <div
      className="shrink-0 bg-mac-sidebar/90 border-r border-mac-border/30 flex flex-col relative overflow-hidden"
      style={panelStyle}
    >
      {/* Panel content */}
      {activeSidePanel === 'explorer' ? (
        <ExplorerPanel
          treeNodes={treeNodes}
          expandedDirs={expandedDirs}
          loadingDirs={loadingDirs}
          selectedFileId={selectedFileId}
          getChildren={getChildren}
          onToggleDir={onToggleDir}
          onSelectFile={onSelectFile}
          rootName={rootName}
          workspaceRoot={workspaceRoot}
          collapseAll={collapseAll}
          refreshTree={refreshTree}
          compact={compact}
        />
      ) : (
        <PlaceholderPanel
          icon={PANEL_PLACEHOLDERS[activeSidePanel].icon}
          title={PANEL_PLACEHOLDERS[activeSidePanel].title}
          description={PANEL_PLACEHOLDERS[activeSidePanel].description}
        />
      )}

      {/* Resize handle (desktop only) */}
      {!compact && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-mac-accent/30 active:bg-mac-accent/50 transition-colors"
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  )
}
