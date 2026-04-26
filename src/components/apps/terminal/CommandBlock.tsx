import { useMemo, useCallback, useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  RotateCcw,
  Clock,
  Code2,
  Sparkles,
} from 'lucide-react'
import { AnsiUp } from 'ansi_up'
import { cn } from '@/lib/utils'
import type { CommandBlock as CommandBlockType } from '@/lib/terminal/types'
import { getOrCompute } from '@/lib/terminal/beautifier/cache'
import { RichOutput } from './renderers/RichOutput'

/* ================================================================
   CommandBlock — renders a single command execution block
   Shows: command line, ANSI-rendered output, status badge, duration
   ================================================================ */

const ansiUp = new AnsiUp()
ansiUp.use_classes = false

interface CommandBlockProps {
  block: CommandBlockType
  compact: boolean
  onRerun?: (command: string) => void
}

export function CommandBlock({ block, compact, onRerun }: CommandBlockProps) {
  const [viewMode, setViewMode] = useState<'raw' | 'rich'>('rich')

  const outputHtml = useMemo(() => {
    if (block.output.length === 0) return ''
    const raw = block.output.map((c) => c.text).join('')
    return ansiUp.ansi_to_html(raw)
  }, [block.output])

  const beautifiedResult = useMemo(() => {
    if (block.status === 'running' || block.output.length === 0) {
      return { segments: [], hasRichContent: false }
    }
    const raw = block.output.map((c) => c.text).join('')
    return getOrCompute(block.id, block.command, raw)
  }, [block.id, block.output, block.status, block.command])

  const showRich = block.status !== 'running' && viewMode === 'rich' && beautifiedResult.hasRichContent

  const handleCopy = useCallback(() => {
    const text = block.output.map((c) => c.text).join('')
    navigator.clipboard.writeText(text).catch(() => {})
  }, [block.output])

  const handleCopyCommand = useCallback(() => {
    navigator.clipboard.writeText(block.command).catch(() => {})
  }, [block.command])

  const durationStr = useMemo(() => {
    if (block.duration == null) return null
    if (block.duration < 1000) return `${block.duration}ms`
    return `${(block.duration / 1000).toFixed(1)}s`
  }, [block.duration])

  const statusIcon =
    block.status === 'running' ? (
      <Loader2 className="h-3.5 w-3.5 text-[#89b4fa] animate-spin" />
    ) : block.status === 'done' ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-[#a6e3a1]" />
    ) : (
      <XCircle className="h-3.5 w-3.5 text-[#f38ba8]" />
    )

  return (
    <div
      className={cn(
        'group rounded-lg border transition-colors',
        block.status === 'running'
          ? 'border-[#89b4fa]/30 bg-[#1e1e2e]'
          : block.status === 'error'
            ? 'border-[#f38ba8]/20 bg-[#1e1e2e]'
            : 'border-[#313244] bg-[#1e1e2e]',
        compact ? 'mx-1.5 mb-1.5' : 'mx-3 mb-2',
      )}
    >
      {/* Command header */}
      <div
        className={cn(
          'flex items-center gap-2 border-b border-[#313244]/50',
          compact ? 'px-2 py-1' : 'px-3 py-1.5',
        )}
      >
        {statusIcon}
        <code className="flex-1 text-[12px] font-mono text-[#cdd6f4] truncate select-all">
          <span className="text-[#a6e3a1] mr-1.5">$</span>
          {block.command}
        </code>

        {/* Meta: duration + view toggle + actions */}
        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {durationStr && (
            <span className="flex items-center gap-0.5 text-[10px] text-[#6c7086]">
              <Clock className="h-2.5 w-2.5" />
              {durationStr}
            </span>
          )}
          {/* Raw/Rich toggle */}
          {block.status !== 'running' && beautifiedResult.hasRichContent && (
            <button
              className={cn(
                'p-0.5 rounded hover:bg-[#313244] transition-colors',
                viewMode === 'rich' ? 'text-[#f9e2af]' : 'text-[#6c7086] hover:text-[#cdd6f4]',
              )}
              title={viewMode === 'rich' ? '切换到原始输出' : '切换到美化视图'}
              onClick={() => setViewMode((m) => (m === 'rich' ? 'raw' : 'rich'))}
            >
              {viewMode === 'rich' ? <Sparkles className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
            </button>
          )}
          <button
            className="p-0.5 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#cdd6f4]"
            title="复制命令"
            onClick={handleCopyCommand}
          >
            <Copy className="h-3 w-3" />
          </button>
          {onRerun && block.status !== 'running' && (
            <button
              className="p-0.5 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#cdd6f4]"
              title="重新执行"
              onClick={() => onRerun(block.command)}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Output area */}
      {(outputHtml || block.status === 'running' || showRich) && (
        <div className="relative group/output">
          {showRich ? (
            <RichOutput result={beautifiedResult} compact={compact} />
          ) : (
            <pre
              className={cn(
                'overflow-x-auto text-[12px] font-mono leading-[1.45] text-[#cdd6f4] whitespace-pre-wrap break-all',
                compact ? 'px-2 py-1.5 max-h-[200px]' : 'px-3 py-2 max-h-[400px]',
                'overflow-y-auto scrollbar-thin',
              )}
              dangerouslySetInnerHTML={{ __html: outputHtml }}
            />
          )}

          {/* Copy output button */}
          {block.output.length > 0 && (
            <button
              className="absolute top-1 right-1 p-1 rounded bg-[#313244]/80 text-[#6c7086] hover:text-[#cdd6f4] opacity-0 group-hover/output:opacity-100 transition-opacity"
              title="复制输出"
              onClick={handleCopy}
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Exit code footer for errors */}
      {block.status === 'error' && block.exitCode != null && (
        <div className="px-3 py-1 border-t border-[#f38ba8]/10 text-[10px] text-[#f38ba8]">
          Exit code: {block.exitCode}
        </div>
      )}
    </div>
  )
}
