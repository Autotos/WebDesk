import type { LucideIcon } from 'lucide-react'

interface PlaceholderPanelProps {
  icon: LucideIcon
  title: string
  description: string
}

export function PlaceholderPanel({ icon: Icon, title, description }: PlaceholderPanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/30 mb-3" />
      <p className="text-[13px] font-medium text-muted-foreground/60 mb-1">{title}</p>
      <p className="text-[11px] text-muted-foreground/40">{description}</p>
    </div>
  )
}
