import { useEffect, useCallback, useRef } from 'react'
import { ListTodo, Zap, Terminal, Monitor } from 'lucide-react'
import { getTerminalSocket } from '@/lib/terminal/socket'
import { useWarpTerminalStore, createTask } from '@/store/useWarpTerminalStore'
import { useSkillStore } from '@/store/useSkillStore'
import { useAIStore } from '@/store/useAIStore'
import { isNaturalLanguage, generateCommandsFromNLStream } from '@/lib/terminal/aiCommandService'
import type { CommandBlock as CommandBlockType, OutputChunk, ServerEnvInfo } from '@/lib/terminal/types'

import { BlockScrollArea } from './BlockScrollArea'
import { InputArea } from './InputArea'
import { TaskSidebar } from './TaskSidebar'
import { SkillPanel } from './SkillPanel'
import { XtermOverlay } from './XtermOverlay'
import { SudoPasswordPrompt } from './SudoPasswordPrompt'

/* ================================================================
   WarpTerminal — Three-column Warp-style terminal layout
   [TaskSidebar?] [Main: BlockScrollArea + InputArea] [SkillPanel?]
   ================================================================ */

interface WarpTerminalProps {
  compact?: boolean
}

let blockCounter = 0
function nextBlockId(): string {
  return `blk-${Date.now()}-${++blockCounter}`
}

export function WarpTerminal({ compact = false }: WarpTerminalProps) {
  const socketRef = useRef<ReturnType<typeof getTerminalSocket> | null>(null)
  const blockSessionReady = useRef(false)

  // Store selectors
  const mode = useWarpTerminalStore((s) => s.mode)
  const commandBlocks = useWarpTerminalStore((s) => s.commandBlocks)
  const tasks = useWarpTerminalStore((s) => s.tasks)
  const activeTaskId = useWarpTerminalStore((s) => s.activeTaskId)
  const taskSidebarVisible = useWarpTerminalStore((s) => s.taskSidebarVisible)
  const skillPanelVisible = useWarpTerminalStore((s) => s.skillPanelVisible)
  const enabledSkillIds = useWarpTerminalStore((s) => s.enabledSkillIds)
  const currentCwd = useWarpTerminalStore((s) => s.currentCwd)
  const isAIProcessing = useWarpTerminalStore((s) => s.isAIProcessing)
  const rawSessionId = useWarpTerminalStore((s) => s.rawSessionId)

  const addCommandBlock = useWarpTerminalStore((s) => s.addCommandBlock)
  const appendBlockOutput = useWarpTerminalStore((s) => s.appendBlockOutput)
  const completeBlock = useWarpTerminalStore((s) => s.completeBlock)
  const clearBlocks = useWarpTerminalStore((s) => s.clearBlocks)
  const switchToRawMode = useWarpTerminalStore((s) => s.switchToRawMode)
  const switchToBlockMode = useWarpTerminalStore((s) => s.switchToBlockMode)
  const setRawSessionId = useWarpTerminalStore((s) => s.setRawSessionId)
  const updateCwd = useWarpTerminalStore((s) => s.updateCwd)
  const setAIProcessing = useWarpTerminalStore((s) => s.setAIProcessing)

  const addTask = useWarpTerminalStore((s) => s.addTask)
  const addTasks = useWarpTerminalStore((s) => s.addTasks)
  const updateTaskStatus = useWarpTerminalStore((s) => s.updateTaskStatus)
  const removeTask = useWarpTerminalStore((s) => s.removeTask)
  const clearTasks = useWarpTerminalStore((s) => s.clearTasks)
  const setActiveTask = useWarpTerminalStore((s) => s.setActiveTask)

  const toggleTaskSidebar = useWarpTerminalStore((s) => s.toggleTaskSidebar)
  const toggleSkillPanel = useWarpTerminalStore((s) => s.toggleSkillPanel)
  const setTaskSidebarVisible = useWarpTerminalStore((s) => s.setTaskSidebarVisible)
  const setSkillPanelVisible = useWarpTerminalStore((s) => s.setSkillPanelVisible)
  const toggleSkill = useWarpTerminalStore((s) => s.toggleSkill)

  const aiEnabled = useAIStore((s) => s.enabled)

  const skills = useSkillStore((s) => s.skills)

  /* ----------------------------------------------------------------
     Socket + Block session setup
     ---------------------------------------------------------------- */

  useEffect(() => {
    const socket = getTerminalSocket()
    socketRef.current = socket

    // Create (or re-create) the block session on server
    const createSession = () => {
      blockSessionReady.current = false
      socket.emit('terminal:block-session-create', { sessionId: 'warp' })
    }

    // Create on first mount
    createSession()

    // Re-create after socket reconnects (server restart, network drop, etc.)
    socket.on('connect', createSession)

    const handleSessionCreated = (msg: { sessionId: string; cwd: string; env?: ServerEnvInfo }) => {
      blockSessionReady.current = true
      const cwd = useWarpTerminalStore.getState().currentCwd
      if (msg.cwd && !cwd) {
        updateCwd(msg.cwd)
      }
      if (msg.env) {
        useWarpTerminalStore.getState().setServerEnv(msg.env)
      }
    }

    const handleExecOutput = (msg: { commandId: string; type: 'stdout' | 'stderr'; data: string }) => {
      const chunk: OutputChunk = {
        type: msg.type,
        text: msg.data,
        timestamp: Date.now(),
      }
      appendBlockOutput(msg.commandId, chunk)
    }

    const handleExecDone = (msg: { commandId: string; exitCode: number; duration: number; cwd?: string }) => {
      const state = useWarpTerminalStore.getState()
      const block = state.commandBlocks.find((b) => b.id === msg.commandId)

      // Detect sudo password failure: check if output contains sudo password prompt errors
      if (msg.exitCode !== 0 && block) {
        const outputText = block.output.map((o) => o.text).join('')
        const isSudoFailure =
          outputText.includes('sudo: a password is required') ||
          outputText.includes('sudo: a terminal is required') ||
          outputText.includes('sudo：需要密码')

        if (isSudoFailure && !state.sudoPassword) {
          // Don't mark as completed yet — prompt for password and retry
          completeBlock(msg.commandId, msg.exitCode, msg.duration)
          const task = state.tasks.find((t) => t.commandBlockId === msg.commandId)
          if (task) {
            updateTaskStatus(task.id, 'failed', { completedAt: Date.now() })
          }
          // Set pending retry so the password prompt appears
          useWarpTerminalStore.getState().setPendingSudoRetry({
            command: block.command,
            taskId: task?.id,
          })
          return
        }
      }

      completeBlock(msg.commandId, msg.exitCode, msg.duration)
      if (msg.cwd) {
        updateCwd(msg.cwd)
      }

      // Update associated task status
      const task = state.tasks.find((t) => t.commandBlockId === msg.commandId)
      if (task) {
        updateTaskStatus(
          task.id,
          msg.exitCode === 0 ? 'success' : 'failed',
          { completedAt: Date.now() },
        )
      }
    }

    socket.on('terminal:block-session-created', handleSessionCreated)
    socket.on('terminal:exec-output', handleExecOutput)
    socket.on('terminal:exec-done', handleExecDone)

    return () => {
      socket.off('connect', createSession)
      socket.off('terminal:block-session-created', handleSessionCreated)
      socket.off('terminal:exec-output', handleExecOutput)
      socket.off('terminal:exec-done', handleExecDone)
      socket.emit('terminal:block-session-destroy')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ----------------------------------------------------------------
     Execute a command (block mode)
     ---------------------------------------------------------------- */

  const execCommand = useCallback(
    (command: string, taskId?: string) => {
      const socket = socketRef.current
      if (!socket) return

      const blockId = nextBlockId()
      const block: CommandBlockType = {
        id: blockId,
        command,
        taskId,
        output: [],
        status: 'running',
        startedAt: Date.now(),
        cwd: currentCwd || '~',
      }

      addCommandBlock(block)

      // Link task → block
      if (taskId) {
        updateTaskStatus(taskId, 'running', {
          commandBlockId: blockId,
          startedAt: Date.now(),
        })
      }

      socket.emit('terminal:exec', { commandId: blockId, command })
    },
    [currentCwd, addCommandBlock, updateTaskStatus],
  )

  /* ----------------------------------------------------------------
     Handle shell command submission
     ---------------------------------------------------------------- */

  const handleSubmitCommand = useCallback(
    (command: string) => {
      // If AI enabled and it looks like natural language (without /ai prefix),
      // handle it via AI path
      if (aiEnabled && isNaturalLanguage(command)) {
        handleSubmitAI(command)
        return
      }

      // Create a task for tracking
      const task = createTask(command, command, 'manual', currentCwd)
      addTask(task)
      execCommand(command, task.id)
    },
    [aiEnabled, currentCwd, addTask, execCommand], // eslint-disable-line react-hooks/exhaustive-deps
  )

  /* ----------------------------------------------------------------
     Handle AI natural language submission
     ---------------------------------------------------------------- */

  const handleSubmitAI = useCallback(
    async (input: string) => {
      if (!aiEnabled) return

      setAIProcessing(true)

      // Immediately create a "thinking" block so the user sees instant feedback
      const thinkingBlockId = nextBlockId()
      const thinkingBlock: CommandBlockType = {
        id: thinkingBlockId,
        command: input,
        output: [
          {
            type: 'system',
            text: 'AI 正在思考...\n',
            timestamp: Date.now(),
          },
        ],
        status: 'running',
        startedAt: Date.now(),
        cwd: currentCwd || '~',
      }
      addCommandBlock(thinkingBlock)

      try {
        const enabledSkills = skills.filter((s) => enabledSkillIds.includes(s.id))
        const serverEnv = useWarpTerminalStore.getState().serverEnv

        const generated = await generateCommandsFromNLStream(
          input,
          currentCwd,
          enabledSkills,
          serverEnv,
          // Stream callback: replace the thinking block's output with streaming text
          (textSoFar: string) => {
            useWarpTerminalStore.getState().updateBlockOutput(thinkingBlockId, [
              {
                type: 'system',
                text: textSoFar,
                timestamp: Date.now(),
              },
            ])
          },
        )

        if (generated.length === 0) {
          // No commands generated — mark block as done with a hint
          completeBlock(thinkingBlockId, 0, Date.now() - thinkingBlock.startedAt)
          appendBlockOutput(thinkingBlockId, {
            type: 'system',
            text: '\nAI 未能生成有效命令。请尝试更具体地描述您的需求。',
            timestamp: Date.now(),
          })
          return
        }

        // Show parsed commands summary in the thinking block
        const summary = generated
          .map((g, i) => `  ${i + 1}. ${g.description}\n     $ ${g.command}`)
          .join('\n')
        useWarpTerminalStore.getState().updateBlockOutput(thinkingBlockId, [
          {
            type: 'system',
            text: `AI 生成了 ${generated.length} 个命令：\n${summary}`,
            timestamp: Date.now(),
          },
        ])
        completeBlock(thinkingBlockId, 0, Date.now() - thinkingBlock.startedAt)

        // Create tasks from AI-generated commands
        const newTasks = generated.map((g) =>
          createTask(g.command, g.description, 'ai', currentCwd),
        )
        addTasks(newTasks)

        // Execute tasks sequentially
        for (const task of newTasks) {
          execCommand(task.command, task.id)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI 服务出错'
        useWarpTerminalStore.getState().updateBlockOutput(thinkingBlockId, [
          { type: 'stderr', text: `AI Error: ${msg}`, timestamp: Date.now() },
        ])
        completeBlock(thinkingBlockId, 1, Date.now() - thinkingBlock.startedAt)
      } finally {
        setAIProcessing(false)
      }
    },
    [aiEnabled, currentCwd, skills, enabledSkillIds, addCommandBlock, appendBlockOutput, completeBlock, addTasks, execCommand, setAIProcessing],
  )

  /* ----------------------------------------------------------------
     Mode switching
     ---------------------------------------------------------------- */

  const handleSwitchMode = useCallback(
    (newMode: 'block' | 'raw') => {
      if (newMode === 'raw') {
        const sid = `raw-${Date.now()}`
        setRawSessionId(sid)
        switchToRawMode()
      } else {
        switchToBlockMode()
      }
    },
    [setRawSessionId, switchToRawMode, switchToBlockMode],
  )

  const handleRawExit = useCallback(() => {
    switchToBlockMode()
    setRawSessionId(null)
  }, [switchToBlockMode, setRawSessionId])

  /* ----------------------------------------------------------------
     Rerun a command
     ---------------------------------------------------------------- */

  const handleRerun = useCallback(
    (command: string) => {
      handleSubmitCommand(command)
    },
    [handleSubmitCommand],
  )

  /* ----------------------------------------------------------------
     Handle clear
     ---------------------------------------------------------------- */

  const handleClear = useCallback(() => {
    clearBlocks()
  }, [clearBlocks])

  /* ----------------------------------------------------------------
     Sudo password handling
     ---------------------------------------------------------------- */

  const pendingSudoRetry = useWarpTerminalStore((s) => s.pendingSudoRetry)

  const handleSudoPasswordSubmit = useCallback(
    (password: string) => {
      const socket = socketRef.current
      if (!socket) return

      // Cache password in store and send to backend
      useWarpTerminalStore.getState().setSudoPassword(password)
      socket.emit('terminal:set-sudo-password', { password })

      // Retry the failed command
      const retry = useWarpTerminalStore.getState().pendingSudoRetry
      if (retry) {
        useWarpTerminalStore.getState().setPendingSudoRetry(null)
        const task = createTask(retry.command, retry.command, 'manual', currentCwd)
        addTask(task)
        execCommand(retry.command, task.id)
      }
    },
    [currentCwd, addTask, execCommand],
  )

  const handleSudoPasswordCancel = useCallback(() => {
    useWarpTerminalStore.getState().setPendingSudoRetry(null)
  }, [])

  /* ----------------------------------------------------------------
     Render
     ---------------------------------------------------------------- */

  return (
    <div className="flex h-full bg-[#1e1e2e]">
      {/* Task Sidebar (left) */}
      {taskSidebarVisible && !compact && (
        <TaskSidebar
          tasks={tasks}
          activeTaskId={activeTaskId}
          compact={compact}
          onSelectTask={setActiveTask}
          onRemoveTask={removeTask}
          onClearTasks={clearTasks}
          onClose={() => setTaskSidebarVisible(false)}
        />
      )}

      {/* Main content area (center) */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-2 py-1 bg-[#181825] border-b border-[#313244] shrink-0">
          <div className="flex items-center gap-1">
            {!taskSidebarVisible && !compact && (
              <button
                className="p-1 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
                onClick={toggleTaskSidebar}
                title="显示任务列表"
              >
                <ListTodo className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="text-[11px] text-[#6c7086] flex items-center gap-1">
              {mode === 'raw' ? (
                <>
                  <Monitor className="h-3 w-3" />
                  Raw Mode
                </>
              ) : (
                <>
                  <Terminal className="h-3 w-3" />
                  Block Mode
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {aiEnabled && !skillPanelVisible && (
              <button
                className="p-1 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#f9e2af] transition-colors"
                onClick={toggleSkillPanel}
                title="显示技能面板"
              >
                <Zap className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Block scroll area */}
        <BlockScrollArea
          blocks={commandBlocks}
          compact={compact}
          onRerun={handleRerun}
        />

        {/* Raw mode overlay */}
        {mode === 'raw' && rawSessionId && (
          <XtermOverlay
            sessionId={rawSessionId}
            visible={mode === 'raw'}
            onExit={handleRawExit}
          />
        )}

        {/* Sudo password prompt */}
        {pendingSudoRetry && (
          <SudoPasswordPrompt
            command={pendingSudoRetry.command}
            compact={compact}
            onSubmit={handleSudoPasswordSubmit}
            onCancel={handleSudoPasswordCancel}
          />
        )}

        {/* Input area */}
        <InputArea
          compact={compact}
          cwd={currentCwd || '~'}
          mode={mode}
          disabled={isAIProcessing}
          aiEnabled={aiEnabled}
          onSubmitCommand={handleSubmitCommand}
          onSubmitAI={handleSubmitAI}
          onSwitchMode={handleSwitchMode}
          onClear={handleClear}
        />
      </div>

      {/* Skill Panel (right) */}
      {skillPanelVisible && aiEnabled && (
        <SkillPanel
          enabledSkillIds={enabledSkillIds}
          compact={compact}
          onToggleSkill={toggleSkill}
          onClose={() => setSkillPanelVisible(false)}
        />
      )}
    </div>
  )
}
