import { Files, Search, GitBranch, BookOpen, Play, Blocks, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIDEStore, type SidePanelId } from '@/store/useIDEStore'

interface ActivityItem {
  id: SidePanelId
  icon: LucideIcon
  label: string
}

const ACTIVITY_ITEMS: ActivityItem[] = [
  { id: 'explorer', icon: Files, label: 'Explorer' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'scm', icon: GitBranch, label: 'Source Control' },
  { id: 'wiki', icon: BookOpen, label: 'Repo Wiki' },
  { id: 'debug', icon: Play, label: 'Run and Debug' },
  { id: 'extensions', icon: Blocks, label: 'Extensions' },
]

interface ActivityBarProps {
  compact?: boolean
}

export function ActivityBar({ compact }: ActivityBarProps) {
  const activeSidePanel = useIDEStore((s) => s.activeSidePanel)
  const toggleSidePanel = useIDEStore((s) => s.toggleSidePanel)

  if (compact) {
    // Mobile: horizontal bar
    return (
      <div className="flex items-center border-b border-mac-border/30 bg-mac-sidebar/60 shrink-0">
        {ACTIVITY_ITEMS.map((item) => {
          const isActive = activeSidePanel === item.id
          return (
            <button
              key={item.id}
              onClick={() => toggleSidePanel(item.id)}
              className={cn(
                'flex-1 flex items-center justify-center py-2 transition-colors relative',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground/50 hover:text-muted-foreground',
              )}
              title={item.label}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {isActive && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-mac-accent rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // Desktop: vertical bar
  return (
    <div className="w-12 shrink-0 bg-mac-titlebar/40 flex flex-col items-center py-1 border-r border-mac-border/30">
      {ACTIVITY_ITEMS.map((item) => {
        const isActive = activeSidePanel === item.id
        return (
          <button
            key={item.id}
            onClick={() => toggleSidePanel(item.id)}
            className={cn(
              'relative w-full flex items-center justify-center h-11 transition-colors',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground/50 hover:text-muted-foreground',
            )}
            title={item.label}
          >
            {isActive && (
              <span className="absolute left-0 top-1/4 bottom-1/4 w-[2px] bg-mac-accent rounded-r-full" />
            )}
            <item.icon className="h-5 w-5" />
          </button>
        )
      })}
    </div>
  )
}
