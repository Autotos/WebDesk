import { useMemo, useCallback, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import hljs from 'highlight.js/lib/common'
import { cn } from '@/lib/utils'
import type { BeautifiedSegment } from '@/lib/terminal/beautifier/types'

/* ================================================================
   CodeBlockRenderer — syntax-highlighted code with line numbers
   ================================================================ */

interface CodeBlockRendererProps {
  segment: BeautifiedSegment
  compact: boolean
}

export function CodeBlockRenderer({ segment, compact }: CodeBlockRendererProps) {
  const [copied, setCopied] = useState(false)

  const { html, language } = useMemo(() => {
    const code = segment.content
    const lang = segment.language || ''
    let highlighted: string
    let detectedLang = lang

    if (lang && hljs.getLanguage(lang)) {
      try {
        const result = hljs.highlight(code, { language: lang, ignoreIllegals: true })
        highlighted = result.value
      } catch {
        highlighted = hljs.highlightAuto(code).value
        detectedLang = 'text'
      }
    } else {
      const result = hljs.highlightAuto(code)
      highlighted = result.value
      detectedLang = result.language || 'text'
    }

    // Add line numbers
    const lines = highlighted.split('\n')
    const numbered = lines
      .map((line, i) => `<span class="line-numbers">${i + 1}</span>${line}`)
      .join('\n')

    return { html: numbered, language: detectedLang }
  }, [segment.content, segment.language])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(segment.content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [segment.content])

  return (
    <div className={cn('terminal-rich-code', compact ? 'mx-0 my-1' : 'mx-0 my-1.5')}>
      <span className="code-lang-label">{language}</span>
      <button
        className="absolute top-0 right-12 p-1 text-[#6c7086] hover:text-[#cdd6f4] opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={handleCopy}
        title="Copy code"
      >
        {copied ? <Check className="h-3 w-3 text-[#a6e3a1]" /> : <Copy className="h-3 w-3" />}
      </button>
      <pre className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
