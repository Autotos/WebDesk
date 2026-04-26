import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { ShieldAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ================================================================
   SudoPasswordPrompt — inline password input for sudo authentication
   Appears when a command fails because sudo needs a password.
   ================================================================ */

interface SudoPasswordPromptProps {
  command: string
  compact: boolean
  onSubmit: (password: string) => void
  onCancel: () => void
}

export function SudoPasswordPrompt({
  command,
  compact,
  onSubmit,
  onCancel,
}: SudoPasswordPromptProps) {
  const [password, setPassword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(() => {
    if (!password) return
    onSubmit(password)
    setPassword('')
  }, [password, onSubmit])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    },
    [handleSubmit, onCancel],
  )

  return (
    <div
      className={cn(
        'shrink-0 border-t border-[#f9e2af]/30 bg-[#1e1e2e]',
        compact ? 'px-2 py-2' : 'px-3 py-2.5',
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <ShieldAlert className="h-3.5 w-3.5 text-[#f9e2af] shrink-0" />
        <span className="text-[11px] text-[#f9e2af]">
          需要 sudo 密码来执行此命令
        </span>
        <button
          className="ml-auto p-0.5 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#cdd6f4]"
          onClick={onCancel}
          title="取消"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="text-[11px] text-[#6c7086] font-mono truncate mb-2">
        $ {command}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[#cdd6f4] shrink-0">Password:</span>
        <input
          ref={inputRef}
          type="password"
          className={cn(
            'flex-1 bg-[#313244] text-[#cdd6f4] text-[13px] font-mono',
            'rounded px-2 py-1 outline-none',
            'border border-[#45475a] focus:border-[#f9e2af]/50',
            'placeholder:text-[#585b70]',
          )}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入 sudo 密码后回车..."
          autoComplete="off"
        />
        <button
          className={cn(
            'shrink-0 px-3 py-1 rounded text-[12px] transition-colors',
            password
              ? 'bg-[#f9e2af] text-[#1e1e2e] hover:bg-[#f9e2af]/80'
              : 'bg-[#313244] text-[#585b70] cursor-not-allowed',
          )}
          onClick={handleSubmit}
          disabled={!password}
        >
          确认
        </button>
      </div>
      <div className="text-[10px] text-[#585b70] mt-1.5">
        密码仅在当前终端会话中缓存，关闭终端后自动清除。按 Esc 取消。
      </div>
    </div>
  )
}
