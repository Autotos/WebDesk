import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FILE_ICON_MAP, FILE_COLOR_MAP, getFileKind } from '../finder/fileSystem'
import type { Tab } from './useCodeEditor'

interface EditorTabsProps {
  tabs: Tab[]
  activeTabId: string | null
  onSwitch: (id: string) => void
  onClose: (id: string) => void
  compact?: boolean
}

export function EditorTabs({ tabs, activeTabId, onSwitch, onClose, compact }: EditorTabsProps) {
  if (tabs.length === 0) return null

  return (
    <div className="flex items-center overflow-x-auto scrollbar-thin bg-mac-titlebar/50 border-b border-mac-border/30">
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId
        const kind = getFileKind(tab.name)
        const Icon = FILE_ICON_MAP[kind]
        const color = FILE_COLOR_MAP[kind]

        return (
          <div
            key={tab.id}
            className={cn(
              'group flex items-center gap-1.5 border-r border-mac-border/30 shrink-0 cursor-pointer',
              compact ? 'px-2.5 py-1.5 text-[12px]' : 'px-3 py-1.5 text-[12px]',
              isActive
                ? 'bg-mac-window'
                : 'bg-mac-titlebar/30 hover:bg-mac-titlebar/60',
            )}
            onClick={() => onSwitch(tab.id)}
          >
            <Icon className={cn('h-3.5 w-3.5 shrink-0', color)} />
            <span className="truncate max-w-[100px]">
              {tab.isDirty && <span className="text-mac-accent mr-0.5">&bull;</span>}
              {tab.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
              className={cn(
                'p-0.5 rounded hover:bg-accent transition-colors shrink-0',
                compact ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                isActive && 'opacity-100',
              )}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
