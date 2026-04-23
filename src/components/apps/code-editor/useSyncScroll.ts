import { useRef, useEffect, useCallback } from 'react'
import type { editor as monacoEditor } from 'monaco-editor'

/* ================================================================
   useSyncScroll Hook

   Bidirectional scroll sync between Monaco Editor and Markdown Preview.
   Uses data-line attributes injected by markdown-it to map source lines
   to rendered DOM positions.
   ================================================================ */

interface UseSyncScrollOptions {
  /** The Monaco editor instance (null when not ready) */
  editor: monacoEditor.IStandaloneCodeEditor | null
  /** The preview scroll container element */
  previewEl: HTMLDivElement | null
  /** Whether sync should be active (only in split mode) */
  enabled: boolean
}

/**
 * Finds the two data-line-annotated elements that bracket a given source line.
 * Returns [before, after] where before.line <= targetLine <= after.line.
 */
function findBracketingElements(
  container: HTMLElement,
  targetLine: number,
): { el: HTMLElement; line: number }[] {
  const elements = container.querySelectorAll<HTMLElement>('[data-line]')
  const mapped: { el: HTMLElement; line: number }[] = []
  for (const el of elements) {
    const line = parseInt(el.dataset.line!, 10)
    if (!isNaN(line)) mapped.push({ el, line })
  }
  if (mapped.length === 0) return []

  // Sort by line number (should already be in order, but be safe)
  mapped.sort((a, b) => a.line - b.line)

  // Find bracketing pair
  let before = mapped[0]
  let after = mapped[mapped.length - 1]

  for (let i = 0; i < mapped.length; i++) {
    if (mapped[i].line <= targetLine) {
      before = mapped[i]
    }
    if (mapped[i].line >= targetLine) {
      after = mapped[i]
      break
    }
  }

  return [before, after]
}

/**
 * Given a preview container, find the source line number visible at the
 * container's scroll top position.
 */
function getTopVisibleLine(container: HTMLElement): number {
  const containerTop = container.scrollTop
  const elements = container.querySelectorAll<HTMLElement>('[data-line]')

  let bestEl: HTMLElement | null = null
  let bestLine = 0
  let bestDist = Infinity

  for (const el of elements) {
    const line = parseInt(el.dataset.line!, 10)
    if (isNaN(line)) continue
    // Element top relative to scroll container
    const elTop = el.offsetTop - container.offsetTop
    const dist = Math.abs(elTop - containerTop)
    if (dist < bestDist) {
      bestDist = dist
      bestEl = el
      bestLine = line
    }
    // If we've passed the viewport top, the previous was the best
    if (elTop > containerTop + 50) break
  }

  // Interpolate within the element for smoother scrolling
  if (bestEl) {
    const elTop = bestEl.offsetTop - container.offsetTop
    const elHeight = bestEl.offsetHeight
    const endLine = parseInt(bestEl.dataset.endLine ?? '', 10) || bestLine
    if (elHeight > 0 && endLine > bestLine) {
      const progress = Math.max(0, Math.min(1, (containerTop - elTop) / elHeight))
      return bestLine + progress * (endLine - bestLine)
    }
  }

  return bestLine
}

export function useSyncScroll({ editor, previewEl, enabled }: UseSyncScrollOptions) {
  // Lock to prevent feedback loops: 'editor' | 'preview' | null
  const syncSourceRef = useRef<'editor' | 'preview' | null>(null)
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  // Set the lock and auto-release after 80ms
  const acquireLock = useCallback((source: 'editor' | 'preview') => {
    syncSourceRef.current = source
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    lockTimerRef.current = setTimeout(() => {
      syncSourceRef.current = null
    }, 80)
  }, [])

  // Editor scroll → Preview scroll
  useEffect(() => {
    if (!editor || !previewEl || !enabled) return

    const disposable = editor.onDidScrollChange(() => {
      // Don't trigger if preview is the scroll source
      if (syncSourceRef.current === 'preview') return

      acquireLock('editor')

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const visibleRange = editor.getVisibleRanges()
        if (!visibleRange.length) return
        const topLine = visibleRange[0].startLineNumber

        const bracket = findBracketingElements(previewEl, topLine)
        if (bracket.length < 2) return

        const [before, after] = bracket
        const beforeTop = before.el.offsetTop - previewEl.offsetTop
        const afterTop = after.el.offsetTop - previewEl.offsetTop

        if (before.line === after.line) {
          previewEl.scrollTop = beforeTop
        } else {
          // Interpolate between the two elements
          const fraction = (topLine - before.line) / (after.line - before.line)
          previewEl.scrollTop = beforeTop + fraction * (afterTop - beforeTop)
        }
      })
    })

    return () => {
      disposable.dispose()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [editor, previewEl, enabled, acquireLock])

  // Preview scroll → Editor scroll
  useEffect(() => {
    if (!editor || !previewEl || !enabled) return

    let rafId: number | null = null

    const handleScroll = () => {
      // Don't trigger if editor is the scroll source
      if (syncSourceRef.current === 'editor') return

      acquireLock('preview')

      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const line = getTopVisibleLine(previewEl)
        if (line > 0) {
          editor.revealLineNearTop(Math.round(line), 0 /* Smooth */)
        }
      })
    }

    previewEl.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      previewEl.removeEventListener('scroll', handleScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [editor, previewEl, enabled, acquireLock])

  // Cleanup lock timer
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    }
  }, [])
}
