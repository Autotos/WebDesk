import { useMemo, useCallback, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import hljs from 'highlight.js/lib/common'
import { cn } from '@/lib/utils'
import type { BeautifiedSegment } from '@/lib/terminal/beautifier/types'

/* ================================================================
   JsonRenderer — formatted + syntax-highlighted JSON
   ================================================================ */

interface JsonRendererProps {
  segment: BeautifiedSegment
  compact: boolean
}

export function JsonRenderer({ segment, compact }: JsonRendererProps) {
  const [copied, setCopied] = useState(false)

  const html = useMemo(() => {
    const formatted = (segment.meta?.formatted as string) || segment.content
    try {
      const result = hljs.highlight(formatted, { language: 'json', ignoreIllegals: true })
      // Add line numbers
      const lines = result.value.split('\n')
      return lines
        .map((line, i) => `<span class="line-numbers">${i + 1}</span>${line}`)
        .join('\n')
    } catch {
      return formatted
    }
  }, [segment.content, segment.meta])

  const handleCopy = useCallback(() => {
    const formatted = (segment.meta?.formatted as string) || segment.content
    navigator.clipboard.writeText(formatted).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [segment.content, segment.meta])

  return (
    <div className={cn('terminal-rich-code', compact ? 'mx-0 my-1' : 'mx-0 my-1.5')}>
      <span className="code-lang-label">JSON</span>
      <button
        className="absolute top-0 right-12 p-1 text-[#6c7086] hover:text-[#cdd6f4] opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={handleCopy}
        title="Copy JSON"
      >
        {copied ? <Check className="h-3 w-3 text-[#a6e3a1]" /> : <Copy className="h-3 w-3" />}
      </button>
      <pre className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
