import { useEffect, useRef } from 'react'
import { FilePlus, FolderPlus, Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FsNode } from '../../finder/fileSystem'

export interface ContextMenuAction {
  type: 'newFile' | 'newFolder' | 'delete' | 'rename'
  node: FsNode
}

interface ContextMenuProps {
  node: FsNode
  position: { x: number; y: number }
  onAction: (action: ContextMenuAction) => void
  onClose: () => void
}

const FILE_ITEMS = [
  { type: 'newFile' as const, label: 'New File', icon: FilePlus },
  { type: 'newFolder' as const, label: 'New Folder', icon: FolderPlus },
  { type: 'rename' as const, label: 'Rename', icon: Pencil },
  { type: 'delete' as const, label: 'Delete File', icon: Trash2, danger: true },
]

const FOLDER_ITEMS = [
  { type: 'newFile' as const, label: 'New File', icon: FilePlus },
  { type: 'newFolder' as const, label: 'New Folder', icon: FolderPlus },
  { type: 'rename' as const, label: 'Rename', icon: Pencil },
  { type: 'delete' as const, label: 'Delete Folder', icon: Trash2, danger: true },
]

export function ContextMenu({ node, position, onAction, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click / scroll
  useEffect(() => {
    const handleClose = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleScroll = () => onClose()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClose)
    document.addEventListener('touchstart', handleClose)
    document.addEventListener('scroll', handleScroll, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClose)
      document.removeEventListener('touchstart', handleClose)
      document.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Clamp position to viewport
  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const el = menuRef.current

    if (rect.right > window.innerWidth) {
      el.style.left = `${window.innerWidth - rect.width - 4}px`
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${window.innerHeight - rect.height - 4}px`
    }
  }, [position])

  const items = node.type === 'folder' ? FOLDER_ITEMS : FILE_ITEMS

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[160px] bg-popover border border-mac-border/40 rounded-md shadow-lg py-1"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item) => (
        <button
          key={item.type}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors',
            item.danger
              ? 'hover:bg-destructive/10 hover:text-destructive'
              : 'hover:bg-mac-accent hover:text-white',
          )}
          onClick={() => {
            onAction({ type: item.type, node })
            onClose()
          }}
        >
          <item.icon className="h-3.5 w-3.5 shrink-0" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
