import { forwardRef } from 'react'
import 'github-markdown-css/github-markdown-light.css'
import 'highlight.js/styles/github.css'

interface MarkdownPreviewProps {
  html: string
  compact?: boolean
}

export const MarkdownPreview = forwardRef<HTMLDivElement, MarkdownPreviewProps>(
  function MarkdownPreview({ html, compact }, ref) {
    return (
      <div
        ref={ref}
        className={`flex-1 overflow-auto scrollbar-thin bg-mac-window ${compact ? 'p-4' : 'p-6'}`}
      >
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    )
  },
)
