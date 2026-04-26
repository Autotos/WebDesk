import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { BeautifiedSegment, TableMeta } from '@/lib/terminal/beautifier/types'

/* ================================================================
   TableRenderer — HTML table with zebra striping and alignment
   ================================================================ */

const MAX_DISPLAY_ROWS = 200

interface TableRendererProps {
  segment: BeautifiedSegment
  compact: boolean
}

export function TableRenderer({ segment, compact }: TableRendererProps) {
  const tableMeta = segment.meta as unknown as TableMeta | undefined

  const { headers, displayRows, omittedCount } = useMemo(() => {
    if (!tableMeta) return { headers: [], displayRows: [], omittedCount: 0 }
    const rows = tableMeta.rows
    const display = rows.slice(0, MAX_DISPLAY_ROWS)
    return {
      headers: tableMeta.headers,
      displayRows: display,
      omittedCount: Math.max(0, rows.length - MAX_DISPLAY_ROWS),
    }
  }, [tableMeta])

  if (!tableMeta || headers.length === 0) return null

  const alignments = tableMeta.alignments

  return (
    <div className={cn('overflow-x-auto', compact ? 'px-1 py-1' : 'px-2 py-1.5')}>
      <table className="terminal-rich-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={alignments[i] === 'right' ? 'col-right' : ''}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className={alignments[ci] === 'right' ? 'col-right' : ''}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {omittedCount > 0 && (
        <div className="text-[10px] text-[#6c7086] text-center py-1">
          ... 省略 {omittedCount} 行
        </div>
      )}
    </div>
  )
}
