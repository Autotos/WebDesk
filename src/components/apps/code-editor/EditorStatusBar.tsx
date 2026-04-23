import { GitBranch, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLanguageDisplayName } from './syntaxHighlighter'

interface EditorStatusBarProps {
  language: string
  cursorPos: { line: number; col: number }
  isDirty: boolean
  compact?: boolean
}

export function EditorStatusBar({
  language,
  cursorPos,
  isDirty,
  compact,
}: EditorStatusBarProps) {
  const displayName = getLanguageDisplayName(language)

  return (
    <div className={cn(
      'flex items-center justify-between shrink-0 bg-mac-accent text-mac-topbar-text',
      compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-0.5 text-[11px]',
    )}>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" /> main
        </span>
        <span className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> 0
        </span>
        {isDirty && (
          <span className="opacity-80">Modified</span>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {compact ? (
          <span>{displayName.length > 6 ? language.toUpperCase().slice(0, 4) : displayName}</span>
        ) : (
          <span>{displayName}</span>
        )}
        <span>UTF-8</span>
        {compact ? (
          <span>Ln {cursorPos.line}:{cursorPos.col}</span>
        ) : (
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        )}
      </div>
    </div>
  )
}
