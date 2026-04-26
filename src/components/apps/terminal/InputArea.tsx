import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { Send, Sparkles, Terminal, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTerminalSocket } from '@/lib/terminal/socket'
import type { TerminalMode } from '@/lib/terminal/types'

/* ================================================================
   InputArea — Command / AI input at the bottom of the terminal
   Supports Tab auto-completion via backend socket events.
   ================================================================ */

interface InputAreaProps {
  compact: boolean
  cwd: string
  mode: TerminalMode
  disabled: boolean
  aiEnabled: boolean
  onSubmitCommand: (command: string) => void
  onSubmitAI: (input: string) => void
  onSwitchMode: (mode: TerminalMode) => void
  onClear: () => void
}

export function InputArea({
  compact,
  cwd,
  mode,
  disabled,
  aiEnabled,
  onSubmitCommand,
  onSubmitAI,
  onSwitchMode,
  onClear,
}: InputAreaProps) {
  const [value, setValue] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [completionHint, setCompletionHint] = useState<string[] | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const completionPending = useRef(false)

  const isAIInput = aiEnabled && value.startsWith('/ai ')

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return

    // Clear completion hint
    setCompletionHint(null)

    // Built-in commands
    if (trimmed === '/raw') {
      onSwitchMode('raw')
      setValue('')
      return
    }
    if (trimmed === '/block') {
      onSwitchMode('block')
      setValue('')
      return
    }
    if (trimmed === '/clear') {
      onClear()
      setValue('')
      return
    }

    // Save to history
    setHistory((h) => {
      const next = [trimmed, ...h.filter((cmd) => cmd !== trimmed)]
      return next.slice(0, 100)
    })
    setHistoryIdx(-1)

    // Dispatch: AI or shell
    if (isAIInput) {
      onSubmitAI(trimmed)
    } else {
      onSubmitCommand(trimmed)
    }

    setValue('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, isAIInput, onSubmitCommand, onSubmitAI, onSwitchMode, onClear])

  /* ----------------------------------------------------------------
     Tab completion via socket
     ---------------------------------------------------------------- */

  const handleTabComplete = useCallback(() => {
    if (completionPending.current || !value || isAIInput) return

    completionPending.current = true
    const socket = getTerminalSocket()

    socket.emit(
      'terminal:complete',
      { input: value, cwd },
      (result: { completions: string[]; prefix: string }) => {
        completionPending.current = false

        if (!result.completions.length) return

        if (result.completions.length === 1) {
          // Single match: replace the prefix with the completion
          const completion = result.completions[0]
          const prefixStart = value.lastIndexOf(result.prefix)
          if (prefixStart >= 0) {
            const newValue = value.slice(0, prefixStart) + completion
            setValue(newValue)
          }
          setCompletionHint(null)
        } else {
          // Multiple matches: find common prefix and show hints
          const common = findCommonPrefix(result.completions)
          if (common.length > result.prefix.length) {
            const prefixStart = value.lastIndexOf(result.prefix)
            if (prefixStart >= 0) {
              const newValue = value.slice(0, prefixStart) + common
              setValue(newValue)
            }
          }
          setCompletionHint(result.completions)
        }
      },
    )
  }, [value, cwd, isAIInput])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab completion
      if (e.key === 'Tab') {
        e.preventDefault()
        handleTabComplete()
        return
      }

      // Clear completion hint on any other key
      if (completionHint) {
        setCompletionHint(null)
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
        return
      }

      // History navigation (only when at first/last line)
      if (e.key === 'ArrowUp' && !e.shiftKey) {
        const textarea = textareaRef.current
        if (textarea && textarea.selectionStart === 0) {
          e.preventDefault()
          const nextIdx = Math.min(historyIdx + 1, history.length - 1)
          if (nextIdx >= 0 && history[nextIdx]) {
            setHistoryIdx(nextIdx)
            setValue(history[nextIdx])
          }
        }
      }

      if (e.key === 'ArrowDown' && !e.shiftKey) {
        const textarea = textareaRef.current
        if (textarea && textarea.selectionEnd === textarea.value.length) {
          e.preventDefault()
          const nextIdx = historyIdx - 1
          if (nextIdx < 0) {
            setHistoryIdx(-1)
            setValue('')
          } else if (history[nextIdx]) {
            setHistoryIdx(nextIdx)
            setValue(history[nextIdx])
          }
        }
      }
    },
    [handleSubmit, handleTabComplete, completionHint, history, historyIdx],
  )

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    setCompletionHint(null)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  // Truncate cwd for display
  const displayCwd = compact
    ? cwd.split('/').slice(-1)[0] || '~'
    : cwd.replace(/^\/home\/[^/]+/, '~').replace(/^\/Users\/[^/]+/, '~')

  return (
    <div
      className={cn(
        'shrink-0 border-t border-[#313244] bg-[#181825]',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
      )}
    >
      {/* CWD badge */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <FolderOpen className="h-3 w-3 text-[#89b4fa] shrink-0" />
        <span className="text-[11px] text-[#89b4fa] font-mono truncate max-w-[300px]">
          {displayCwd}
        </span>
        {isAIInput && (
          <span className="flex items-center gap-0.5 text-[11px] text-[#f9e2af] ml-auto">
            <Sparkles className="h-3 w-3" />
            AI
          </span>
        )}
      </div>

      {/* Completion hints */}
      {completionHint && completionHint.length > 1 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1 px-1">
          {completionHint.map((item) => (
            <span
              key={item}
              className={cn(
                'text-[11px] font-mono',
                item.endsWith('/') ? 'text-[#89b4fa]' : 'text-[#a6adc8]',
              )}
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <div className="flex items-center text-[#6c7086] shrink-0 pb-0.5">
          {mode === 'raw' ? (
            <Terminal className="h-3.5 w-3.5" />
          ) : (
            <span className="text-[13px] font-mono font-bold text-[#a6e3a1]">$</span>
          )}
        </div>

        <textarea
          ref={textareaRef}
          className={cn(
            'flex-1 bg-transparent text-[#cdd6f4] text-[13px] font-mono',
            'resize-none outline-none placeholder:text-[#585b70]',
            'leading-[1.4] min-h-[20px] max-h-[120px]',
          )}
          rows={1}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            aiEnabled
              ? '输入命令，或用 /ai 开头输入自然语言... (Tab 补全)'
              : '输入命令... (Tab 补全)'
          }
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
        />

        <button
          className={cn(
            'shrink-0 p-1 rounded transition-colors',
            value.trim() && !disabled
              ? 'text-[#89b4fa] hover:bg-[#313244]'
              : 'text-[#45475a] cursor-not-allowed',
          )}
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
   Utility — find longest common prefix among strings
   ---------------------------------------------------------------- */

function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return ''
  let prefix = strings[0]
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
      if (!prefix) return ''
    }
  }
  return prefix
}
