import { useState, useRef, useEffect, useMemo } from 'react'
import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import hljs from 'highlight.js/lib/common'

/* ================================================================
   Types
   ================================================================ */

export type MarkdownViewMode = 'edit' | 'preview' | 'split'

/* ================================================================
   markdown-it plugin: inject data-line on block-level tokens
   ================================================================ */

function injectLineNumbers(md: MarkdownIt) {
  // RenderRule: (tokens, idx, options, env, self) => string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function injectAttr(tokens: Token[], idx: number, options: any, _env: any, self: any): string {
    const token = tokens[idx]
    if (token.map) {
      token.attrSet('data-line', String(token.map[0]))
      token.attrSet('data-end-line', String(token.map[1]))
    }
    return self.renderToken(tokens, idx, options)
  }

  // Override renderer for block-level OPENING tags (nesting=1) and void elements.
  // NOTE: code_block and fence are nesting=0 with tag "code" — overriding their
  // renderers with renderToken() would produce unclosed <code> tags, causing
  // cascading relative font-size issues. They are handled via core rule below.
  const blockTypes = [
    'paragraph_open',
    'heading_open',
    'bullet_list_open',
    'ordered_list_open',
    'blockquote_open',
    'table_open',
    'hr',
  ] as const

  for (const type of blockTypes) {
    md.renderer.rules[type] = injectAttr
  }

  // For code_block and fence, inject data-line at the token level so the
  // default renderers (which produce proper <pre><code>...</code></pre>)
  // pick up the attributes via renderAttrs().
  md.core.ruler.push('inject_line_numbers', (state) => {
    for (const token of state.tokens) {
      if ((token.type === 'code_block' || token.type === 'fence') && token.map) {
        token.attrSet('data-line', String(token.map[0]))
        token.attrSet('data-end-line', String(token.map[1]))
      }
    }
  })
}

/* ================================================================
   useMarkdownPreview Hook
   
   Manages view mode state and debounced markdown → HTML rendering.
   ================================================================ */

export function useMarkdownPreview(
  content: string,
  language: string,
  compact: boolean,
) {
  const isMarkdown = language === 'markdown'
  const defaultMode: MarkdownViewMode = compact ? 'preview' : 'split'

  const [viewMode, setViewMode] = useState<MarkdownViewMode>(defaultMode)
  const [renderedHtml, setRenderedHtml] = useState('')

  // Track whether this is the first render since isMarkdown became true
  const isFirstRenderRef = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Create markdown-it instance once
  const md = useMemo(() => {
    const instance = MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
          } catch { /* fallback */ }
        }
        try {
          return hljs.highlightAuto(code).value
        } catch { /* fallback */ }
        return ''
      },
    })
    injectLineNumbers(instance)
    return instance
  }, [])

  // Reset view mode when switching to a markdown tab
  useEffect(() => {
    if (isMarkdown) {
      setViewMode(defaultMode)
      isFirstRenderRef.current = true
    } else {
      setRenderedHtml('')
    }
  }, [isMarkdown, defaultMode])

  // Debounced rendering
  useEffect(() => {
    if (!isMarkdown || viewMode === 'edit') {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    const delay = isFirstRenderRef.current ? 0 : 300
    isFirstRenderRef.current = false

    timerRef.current = setTimeout(() => {
      setRenderedHtml(md.render(content))
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [content, isMarkdown, viewMode, md])

  return { viewMode, setViewMode, renderedHtml, isMarkdown }
}
