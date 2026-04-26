import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CommandBlock } from './CommandBlock'
import type { CommandBlock as CommandBlockType } from '@/lib/terminal/types'

/* ================================================================
   BlockScrollArea — scrollable list of CommandBlock elements
   Auto-scrolls to the bottom when new blocks or output arrive.
   ================================================================ */

interface BlockScrollAreaProps {
  blocks: CommandBlockType[]
  compact: boolean
  onRerun?: (command: string) => void
}

export function BlockScrollArea({ blocks, compact, onRerun }: BlockScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  // Track whether user is scrolled to bottom
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 40
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }

  // Auto-scroll when blocks change (only if user was at bottom)
  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [blocks])

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        'flex-1 min-h-0 overflow-y-auto scrollbar-thin',
        compact ? 'pt-1.5' : 'pt-2',
      )}
    >
      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-[#585b70] select-none">
          <span className="text-[13px]">Warp Terminal</span>
          <span className="text-[11px] mt-1">
            输入命令开始，或用 <code className="text-[#89b4fa]">/ai</code> 调用 AI
          </span>
        </div>
      ) : (
        blocks.map((block) => (
          <CommandBlock
            key={block.id}
            block={block}
            compact={compact}
            onRerun={onRerun}
          />
        ))
      )}
    </div>
  )
}
