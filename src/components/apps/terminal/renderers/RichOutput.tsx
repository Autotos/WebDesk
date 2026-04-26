import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { BeautifiedResult } from '@/lib/terminal/beautifier/types'
import '@/styles/hljs-catppuccin-mocha.css'

import { AnsiRenderer } from './AnsiRenderer'
import { CodeBlockRenderer } from './CodeBlockRenderer'
import { JsonRenderer } from './JsonRenderer'
import { TableRenderer } from './TableRenderer'
import { DiffRenderer } from './DiffRenderer'
import { GitStatusRenderer } from './GitStatusRenderer'
import { LogRenderer } from './LogRenderer'
import { ProgressIndicator } from './ProgressIndicator'

/* ================================================================
   RichOutput — segment router that dispatches to sub-renderers
   ================================================================ */

interface RichOutputProps {
  result: BeautifiedResult
  compact: boolean
}

export const RichOutput = memo(function RichOutput({ result, compact }: RichOutputProps) {
  if (result.segments.length === 0) return null

  return (
    <div
      className={cn(
        'terminal-rich overflow-y-auto scrollbar-thin',
        compact ? 'max-h-[200px]' : 'max-h-[400px]',
      )}
    >
      {result.segments.map((segment, i) => {
        switch (segment.type) {
          case 'code':
            return <CodeBlockRenderer key={i} segment={segment} compact={compact} />
          case 'json':
            return <JsonRenderer key={i} segment={segment} compact={compact} />
          case 'table':
            return <TableRenderer key={i} segment={segment} compact={compact} />
          case 'diff':
            return <DiffRenderer key={i} segment={segment} compact={compact} />
          case 'git-status':
            return <GitStatusRenderer key={i} segment={segment} compact={compact} />
          case 'log':
            return <LogRenderer key={i} segment={segment} compact={compact} />
          case 'progress':
            return <ProgressIndicator key={i} segment={segment} />
          case 'ansi':
          default:
            return <AnsiRenderer key={i} segment={segment} compact={compact} />
        }
      })}
    </div>
  )
})
