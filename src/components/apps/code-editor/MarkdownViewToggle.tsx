import { Code, Eye, Columns2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MarkdownViewMode } from './useMarkdownPreview'

interface MarkdownViewToggleProps {
  viewMode: MarkdownViewMode
  onViewModeChange: (mode: MarkdownViewMode) => void
  compact?: boolean
  isMarkdown: boolean
}

export function MarkdownViewToggle({
  viewMode,
  onViewModeChange,
  compact,
  isMarkdown,
}: MarkdownViewToggleProps) {
  if (!isMarkdown) return null

  const modes: { mode: MarkdownViewMode; icon: typeof Code; label: string }[] = [
    { mode: 'edit', icon: Code, label: 'Edit' },
    ...(compact ? [] : [{ mode: 'split' as const, icon: Columns2, label: 'Split' }]),
    { mode: 'preview', icon: Eye, label: 'Preview' },
  ]

  return (
    <div className="flex items-center justify-end gap-0.5 px-2 py-1 bg-mac-titlebar/30 border-b border-mac-border/30">
      {modes.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          title={label}
          onClick={() => onViewModeChange(mode)}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors',
            viewMode === mode
              ? 'bg-mac-accent/15 text-mac-accent'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
