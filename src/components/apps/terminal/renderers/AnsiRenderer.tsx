import { useMemo, useCallback } from 'react'
import { AnsiUp } from 'ansi_up'
import { cn } from '@/lib/utils'
import { injectFilePathLinks } from '@/lib/terminal/beautifier/detectors'
import type { BeautifiedSegment } from '@/lib/terminal/beautifier/types'

/* ================================================================
   AnsiRenderer — fallback renderer using ansi_up
   Also injects clickable file path links into the output.
   ================================================================ */

const ansiUp = new AnsiUp()
ansiUp.use_classes = false

interface AnsiRendererProps {
  segment: BeautifiedSegment
  compact: boolean
}

export function AnsiRenderer({ segment, compact }: AnsiRendererProps) {
  const html = useMemo(() => {
    if (!segment.raw) return ''
    const base = ansiUp.ansi_to_html(segment.raw)
    return injectFilePathLinks(base)
  }, [segment.raw])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('terminal-file-path')) {
      const path = target.dataset.path
      if (path) {
        navigator.clipboard.writeText(path).catch(() => {})
        // Brief visual feedback
        target.style.color = '#a6e3a1'
        setTimeout(() => { target.style.color = '' }, 600)
      }
    }
  }, [])

  if (!html) return null

  return (
    <pre
      className={cn(
        'overflow-x-auto text-[12px] font-mono leading-[1.45] text-[#cdd6f4] whitespace-pre-wrap break-all',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
      )}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
    />
  )
}
