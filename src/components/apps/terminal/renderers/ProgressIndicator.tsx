import type { BeautifiedSegment, ProgressMeta } from '@/lib/terminal/beautifier/types'

/* ================================================================
   ProgressIndicator — simple progress bar for download/install
   ================================================================ */

interface ProgressIndicatorProps {
  segment: BeautifiedSegment
}

export function ProgressIndicator({ segment }: ProgressIndicatorProps) {
  const meta = segment.meta as unknown as ProgressMeta | undefined
  if (!meta) return null

  const hasPercent = meta.percent != null

  return (
    <div className="terminal-rich-progress px-3 py-1">
      <div className="progress-track">
        {hasPercent ? (
          <div
            className="progress-fill"
            style={{ width: `${meta.percent}%` }}
          />
        ) : (
          <div className="progress-fill-indeterminate" />
        )}
      </div>
      {hasPercent && (
        <span className="progress-label">{meta.percent}%</span>
      )}
      {meta.label && !hasPercent && (
        <span className="progress-label">{meta.label}</span>
      )}
    </div>
  )
}
