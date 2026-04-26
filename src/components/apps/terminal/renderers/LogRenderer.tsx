import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { BeautifiedSegment, LogLine } from '@/lib/terminal/beautifier/types'

/* ================================================================
   LogRenderer — log output with level-based coloring
   ================================================================ */

const LEVEL_STYLES: Record<LogLine['level'], string> = {
  error: 'bg-[#f38ba8]/15 text-[#f38ba8]',
  warn: 'text-[#f9e2af]',
  info: 'text-[#94e2d5]',
  debug: 'text-[#6c7086]',
}

const LEVEL_BADGE: Record<LogLine['level'], { text: string; cls: string }> = {
  error: { text: 'ERROR', cls: 'bg-[#f38ba8] text-[#1e1e2e]' },
  warn: { text: 'WARN', cls: 'bg-[#f9e2af] text-[#1e1e2e]' },
  info: { text: 'INFO', cls: 'bg-[#94e2d5] text-[#1e1e2e]' },
  debug: { text: 'DEBUG', cls: 'bg-[#45475a] text-[#6c7086]' },
}

interface LogRendererProps {
  segment: BeautifiedSegment
  compact: boolean
}

export function LogRenderer({ segment, compact }: LogRendererProps) {
  const logLines = (segment.meta?.lines as LogLine[]) || []

  const rendered = useMemo(() => {
    if (logLines.length === 0) {
      // Fallback: try to color lines by matching keywords
      return segment.content.split('\n').map((text, i) => {
        let level: LogLine['level'] = 'debug'
        if (/\b(ERROR|FATAL)\b/i.test(text)) level = 'error'
        else if (/\bWARN(ING)?\b/i.test(text)) level = 'warn'
        else if (/\bINFO\b/i.test(text)) level = 'info'
        return { key: i, level, text }
      })
    }
    return logLines.map((ll, i) => ({ key: i, level: ll.level, text: ll.text }))
  }, [logLines, segment.content])

  return (
    <div className={cn('text-[12px] font-mono leading-[1.5]', compact ? 'px-1 py-1' : 'px-2 py-1.5')}>
      {rendered.map((line) => {
        const badge = LEVEL_BADGE[line.level]
        return (
          <div
            key={line.key}
            className={cn(
              'flex items-start gap-1.5 px-1 rounded-sm',
              LEVEL_STYLES[line.level],
            )}
          >
            <span
              className={cn(
                'shrink-0 inline-block text-[9px] font-bold px-1 rounded mt-0.5',
                badge.cls,
              )}
            >
              {badge.text}
            </span>
            <span className="whitespace-pre-wrap break-all">{line.text}</span>
          </div>
        )
      })}
    </div>
  )
}
