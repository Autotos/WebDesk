import { ChevronRight, Braces, Box, Type, Variable, Component } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BreadcrumbItem } from './MonacoEditor'

interface EditorBreadcrumbsProps {
  fileName: string
  breadcrumbs: BreadcrumbItem[]
  compact?: boolean
}

const SYMBOL_ICONS: Record<string, typeof Braces> = {
  function: Braces,
  class: Box,
  interface: Type,
  variable: Variable,
  component: Component,
}

const SYMBOL_COLORS: Record<string, string> = {
  function: 'text-amber-600',
  class: 'text-orange-500',
  interface: 'text-teal-600',
  variable: 'text-blue-600',
  component: 'text-purple-600',
}

export function EditorBreadcrumbs({ fileName, breadcrumbs, compact }: EditorBreadcrumbsProps) {
  return (
    <div className={cn(
      'flex items-center gap-0.5 border-b border-mac-border/20 bg-mac-titlebar/20 overflow-x-auto scrollbar-thin shrink-0',
      compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-0.5 text-[11px]',
    )}>
      <span className="text-muted-foreground/70 shrink-0">{fileName}</span>

      {breadcrumbs.map((item, i) => {
        const Icon = SYMBOL_ICONS[item.kind] ?? Braces
        const color = SYMBOL_COLORS[item.kind] ?? 'text-muted-foreground'

        return (
          <span key={i} className="flex items-center gap-0.5 shrink-0">
            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
            <Icon className={cn('h-3 w-3', color)} />
            <span className="text-foreground/80">{item.name}</span>
          </span>
        )
      })}
    </div>
  )
}
