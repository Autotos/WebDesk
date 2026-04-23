import { AlertTriangle } from 'lucide-react'

interface ConflictBannerProps {
  tabId: string
  onResolve: (tabId: string, action: 'reload' | 'keep') => void
}

export function ConflictBanner({ tabId, onResolve }: ConflictBannerProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border-b border-amber-500/30 text-[12px] text-amber-700 dark:text-amber-300 shrink-0">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate">This file was modified externally</span>
      <button
        onClick={() => onResolve(tabId, 'reload')}
        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 font-medium transition-colors"
      >
        Reload
      </button>
      <button
        onClick={() => onResolve(tabId, 'keep')}
        className="px-2 py-0.5 rounded hover:bg-amber-500/10 opacity-70 hover:opacity-100 transition-colors"
      >
        Keep Mine
      </button>
    </div>
  )
}
