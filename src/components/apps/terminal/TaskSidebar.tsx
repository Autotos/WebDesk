import { useCallback } from 'react'
import {
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Terminal,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/terminal/types'

/* ================================================================
   TaskSidebar — left sidebar showing the task queue
   ================================================================ */

interface TaskSidebarProps {
  tasks: Task[]
  activeTaskId: string | null
  compact: boolean
  onSelectTask: (id: string) => void
  onRemoveTask: (id: string) => void
  onClearTasks: () => void
  onClose: () => void
}

const STATUS_ICON: Record<Task['status'], React.ReactNode> = {
  pending: <Clock className="h-3 w-3 text-[#6c7086]" />,
  running: <Play className="h-3 w-3 text-[#89b4fa] fill-[#89b4fa]" />,
  success: <CheckCircle2 className="h-3 w-3 text-[#a6e3a1]" />,
  failed: <XCircle className="h-3 w-3 text-[#f38ba8]" />,
  cancelled: <XCircle className="h-3 w-3 text-[#6c7086]" />,
}

export function TaskSidebar({
  tasks,
  activeTaskId,
  compact,
  onSelectTask,
  onRemoveTask,
  onClearTasks,
  onClose,
}: TaskSidebarProps) {
  const handleRemove = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      onRemoveTask(id)
    },
    [onRemoveTask],
  )

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[#11111b] border-r border-[#313244]',
        compact ? 'w-[180px]' : 'w-[220px]',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#313244]">
        <span className="text-[12px] font-medium text-[#cdd6f4]">Tasks</span>
        <div className="flex items-center gap-1">
          {tasks.length > 0 && (
            <button
              className="p-1 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
              onClick={onClearTasks}
              title="清除全部"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button
            className="p-1 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
            onClick={onClose}
            title="收起侧栏"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#585b70] px-4 text-center">
            <Terminal className="h-6 w-6 mb-2 opacity-40" />
            <span className="text-[11px]">
              执行的命令和 AI 生成的任务将显示在这里
            </span>
          </div>
        ) : (
          <div className="py-1">
            {tasks.map((task) => (
              <button
                key={task.id}
                className={cn(
                  'w-full text-left px-3 py-1.5 flex items-start gap-2 transition-colors',
                  activeTaskId === task.id
                    ? 'bg-[#313244]/50'
                    : 'hover:bg-[#1e1e2e]/50',
                )}
                onClick={() => onSelectTask(task.id)}
              >
                <span className="mt-0.5 shrink-0">{STATUS_ICON[task.status]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {task.source === 'ai' && (
                      <Sparkles className="h-2.5 w-2.5 text-[#f9e2af] shrink-0" />
                    )}
                    <span className="text-[11px] text-[#cdd6f4] truncate">
                      {task.description}
                    </span>
                  </div>
                  <code className="text-[10px] text-[#6c7086] truncate block">
                    {task.command}
                  </code>
                </div>
                <button
                  className="mt-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#45475a] text-[#6c7086] hover:text-[#f38ba8] shrink-0"
                  onClick={(e) => handleRemove(e, task.id)}
                  title="移除"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
