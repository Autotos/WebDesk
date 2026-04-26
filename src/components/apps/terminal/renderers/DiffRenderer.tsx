import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { BeautifiedSegment, DiffMeta } from '@/lib/terminal/beautifier/types'

/* ================================================================
   DiffRenderer — colored diff output with +/- line highlighting
   ================================================================ */

interface DiffRendererProps {
  segment: BeautifiedSegment
  compact: boolean
}

export function DiffRenderer({ segment, compact }: DiffRendererProps) {
  const diffMeta = segment.meta as unknown as DiffMeta | undefined

  const renderedLines = useMemo(() => {
    const lines = segment.content.split('\n')
    return lines.map((line, i) => {
      let cls = 'diff-line'
      if (/^diff\s+--git/.test(line) || /^(---|\+\+\+)\s/.test(line)) {
        cls += ' diff-header'
      } else if (/^@@/.test(line)) {
        cls += ' diff-hunk'
      } else if (/^\+/.test(line)) {
        cls += ' diff-add'
      } else if (/^-/.test(line)) {
        cls += ' diff-del'
      }
      return { key: i, cls, text: line }
    })
  }, [segment.content])

  return (
    <div className={cn('terminal-rich-diff', compact ? 'px-1 py-1' : 'px-2 py-1.5')}>
      {renderedLines.map((l) => (
        <div key={l.key} className={l.cls}>
          {l.text}
        </div>
      ))}
      {diffMeta && (diffMeta.additions > 0 || diffMeta.deletions > 0) && (
        <div className="flex items-center gap-3 mt-1 px-2 text-[10px]">
          {diffMeta.additions > 0 && (
            <span className="text-[#a6e3a1]">+{diffMeta.additions}</span>
          )}
          {diffMeta.deletions > 0 && (
            <span className="text-[#f38ba8]">-{diffMeta.deletions}</span>
          )}
        </div>
      )}
    </div>
  )
}
