import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { BeautifiedSegment, GitStatusEntry } from '@/lib/terminal/beautifier/types'

/* ================================================================
   GitStatusRenderer — semantic coloring for git status output
   ================================================================ */

const COLOR_MAP: Record<GitStatusEntry['color'], string> = {
  green: 'text-[#a6e3a1]',
  yellow: 'text-[#f9e2af]',
  red: 'text-[#f38ba8]',
  blue: 'text-[#89b4fa]',
  gray: 'text-[#6c7086]',
}

const STATUS_LABELS: Record<string, string> = {
  modified: 'M',
  'new file': 'A',
  deleted: 'D',
  renamed: 'R',
  M: 'M',
  A: 'A',
  D: 'D',
  R: 'R',
  '??': '?',
  '?': '?',
  C: 'C',
  U: 'U',
  MM: 'MM',
  AM: 'AM',
}

interface GitStatusRendererProps {
  segment: BeautifiedSegment
  compact: boolean
}

export function GitStatusRenderer({ segment, compact }: GitStatusRendererProps) {
  const entries = (segment.meta?.entries as GitStatusEntry[]) || []

  const handleCopyFile = useCallback((file: string) => {
    navigator.clipboard.writeText(file).catch(() => {})
  }, [])

  if (entries.length === 0) {
    // Fallback: render as plain text with semantic coloring on known keywords
    return <GitStatusTextRenderer content={segment.content} compact={compact} />
  }

  return (
    <div className={cn('text-[12px] font-mono leading-[1.6]', compact ? 'px-2 py-1' : 'px-3 py-2')}>
      {entries.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className={cn(
              'inline-block w-6 text-center font-semibold',
              COLOR_MAP[entry.color],
            )}
          >
            {STATUS_LABELS[entry.status] || entry.status}
          </span>
          <span
            className={cn('cursor-pointer hover:underline', COLOR_MAP[entry.color])}
            title={`Click to copy: ${entry.file}`}
            onClick={() => handleCopyFile(entry.file)}
          >
            {entry.file}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Fallback: highlight known keywords in plain text */
function GitStatusTextRenderer({ content, compact }: { content: string; compact: boolean }) {
  const lines = content.split('\n')
  return (
    <pre
      className={cn(
        'overflow-x-auto text-[12px] font-mono leading-[1.45] text-[#cdd6f4] whitespace-pre-wrap break-all',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
      )}
    >
      {lines.map((line, i) => {
        let color = ''
        if (/\bmodified\b/.test(line)) color = 'text-[#f9e2af]'
        else if (/\bnew file\b/.test(line)) color = 'text-[#a6e3a1]'
        else if (/\bdeleted\b/.test(line)) color = 'text-[#f38ba8]'
        else if (/\brenamed\b/.test(line)) color = 'text-[#89b4fa]'
        else if (/\bUntracked\b/.test(line)) color = 'text-[#6c7086]'

        return (
          <span key={i} className={color}>
            {line}
            {i < lines.length - 1 ? '\n' : ''}
          </span>
        )
      })}
    </pre>
  )
}
