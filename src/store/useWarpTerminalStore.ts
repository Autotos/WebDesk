import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, TaskStatus, CommandBlock, OutputChunk, TerminalMode, ServerEnvInfo } from '@/lib/terminal/types'
import { clearBeautifyCache } from '@/lib/terminal/beautifier/cache'

/* ================================================================
   Warp Terminal Store
   Manages task queue, command blocks, mode, layout preferences.
   Replaces useTerminalAppStore for the standalone terminal app.
   ================================================================ */

let counter = 0
function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++counter}`
}

/* ----------------------------------------------------------------
   State Interface
   ---------------------------------------------------------------- */

interface WarpTerminalState {
  // Layout (persisted)
  taskSidebarVisible: boolean
  skillPanelVisible: boolean
  enabledSkillIds: string[]

  // Mode
  mode: TerminalMode
  blockSessionId: string | null
  rawSessionId: string | null

  // Command blocks
  commandBlocks: CommandBlock[]

  // Task queue
  tasks: Task[]
  activeTaskId: string | null

  // AI
  isAIProcessing: boolean

  // Server environment (from backend block-session-created)
  serverEnv: ServerEnvInfo | null

  // Sudo password (in-memory only, never persisted)
  sudoPassword: string | null
  pendingSudoRetry: { command: string; taskId?: string } | null

  // CWD
  currentCwd: string

  // Layout actions
  toggleTaskSidebar: () => void
  toggleSkillPanel: () => void
  setTaskSidebarVisible: (v: boolean) => void
  setSkillPanelVisible: (v: boolean) => void

  // Session actions
  setBlockSessionId: (id: string | null) => void
  setRawSessionId: (id: string | null) => void

  // Mode actions
  switchToRawMode: () => void
  switchToBlockMode: () => void

  // Command block actions
  addCommandBlock: (block: CommandBlock) => void
  appendBlockOutput: (blockId: string, chunk: OutputChunk) => void
  updateBlockOutput: (blockId: string, output: OutputChunk[]) => void
  completeBlock: (blockId: string, exitCode: number, duration: number) => void
  clearBlocks: () => void

  // Task actions
  addTask: (task: Task) => void
  addTasks: (tasks: Task[]) => void
  updateTaskStatus: (id: string, status: TaskStatus, extra?: Partial<Task>) => void
  removeTask: (id: string) => void
  clearTasks: () => void
  setActiveTask: (id: string | null) => void

  // AI
  setAIProcessing: (v: boolean) => void

  // Server environment
  setServerEnv: (env: ServerEnvInfo) => void

  // Sudo
  setSudoPassword: (password: string) => void
  clearSudoPassword: () => void
  setPendingSudoRetry: (retry: { command: string; taskId?: string } | null) => void

  // Skills
  toggleSkill: (skillId: string) => void

  // CWD
  updateCwd: (cwd: string) => void
}

/* ----------------------------------------------------------------
   Store
   ---------------------------------------------------------------- */

export const useWarpTerminalStore = create<WarpTerminalState>()(
  persist(
    (set, get) => ({
      // Layout
      taskSidebarVisible: true,
      skillPanelVisible: false,
      enabledSkillIds: [],

      // Mode
      mode: 'block',
      blockSessionId: null,
      rawSessionId: null,

      // Command blocks
      commandBlocks: [],

      // Tasks
      tasks: [],
      activeTaskId: null,

      // AI
      isAIProcessing: false,

      // Server environment
      serverEnv: null,

      // Sudo
      sudoPassword: null,
      pendingSudoRetry: null,

      // CWD
      currentCwd: '',

      // Layout actions
      toggleTaskSidebar: () => set((s) => ({ taskSidebarVisible: !s.taskSidebarVisible })),
      toggleSkillPanel: () => set((s) => ({ skillPanelVisible: !s.skillPanelVisible })),
      setTaskSidebarVisible: (v) => set({ taskSidebarVisible: v }),
      setSkillPanelVisible: (v) => set({ skillPanelVisible: v }),

      // Session actions
      setBlockSessionId: (id) => set({ blockSessionId: id }),
      setRawSessionId: (id) => set({ rawSessionId: id }),

      // Mode actions
      switchToRawMode: () => set({ mode: 'raw' }),
      switchToBlockMode: () => set({ mode: 'block' }),

      // Command block actions
      addCommandBlock: (block) =>
        set((s) => ({ commandBlocks: [...s.commandBlocks, block] })),

      appendBlockOutput: (blockId, chunk) =>
        set((s) => ({
          commandBlocks: s.commandBlocks.map((b) =>
            b.id === blockId ? { ...b, output: [...b.output, chunk] } : b,
          ),
        })),

      updateBlockOutput: (blockId, output) =>
        set((s) => ({
          commandBlocks: s.commandBlocks.map((b) =>
            b.id === blockId ? { ...b, output } : b,
          ),
        })),

      completeBlock: (blockId, exitCode, duration) =>
        set((s) => ({
          commandBlocks: s.commandBlocks.map((b) =>
            b.id === blockId
              ? { ...b, exitCode, duration, status: exitCode === 0 ? 'done' : 'error' }
              : b,
          ),
        })),

      clearBlocks: () => {
        clearBeautifyCache()
        set({ commandBlocks: [] })
      },

      // Task actions
      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),

      addTasks: (tasks) => set((s) => ({ tasks: [...s.tasks, ...tasks] })),

      updateTaskStatus: (id, status, extra) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, status, ...extra } : t,
          ),
        })),

      removeTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
        })),

      clearTasks: () => set({ tasks: [], activeTaskId: null }),

      setActiveTask: (id) => set({ activeTaskId: id }),

      // AI
      setAIProcessing: (v) => set({ isAIProcessing: v }),

      // Server environment
      setServerEnv: (env) => set({ serverEnv: env }),

      // Sudo
      setSudoPassword: (password) => set({ sudoPassword: password }),
      clearSudoPassword: () => set({ sudoPassword: null, pendingSudoRetry: null }),
      setPendingSudoRetry: (retry) => set({ pendingSudoRetry: retry }),

      // Skills
      toggleSkill: (skillId) => {
        const current = get().enabledSkillIds
        const next = current.includes(skillId)
          ? current.filter((id) => id !== skillId)
          : [...current, skillId]
        set({ enabledSkillIds: next })
      },

      // CWD
      updateCwd: (cwd) => set({ currentCwd: cwd }),
    }),
    {
      name: 'webdesk-warp-terminal',
      partialize: (state) => ({
        taskSidebarVisible: state.taskSidebarVisible,
        skillPanelVisible: state.skillPanelVisible,
        enabledSkillIds: state.enabledSkillIds,
      }),
    },
  ),
)

/* ----------------------------------------------------------------
   Helper — create a Task object
   ---------------------------------------------------------------- */

export function createTask(
  command: string,
  description: string,
  source: 'manual' | 'ai',
  cwd?: string,
): Task {
  return {
    id: nextId('task'),
    description,
    command,
    cwd,
    status: 'pending',
    createdAt: Date.now(),
    source,
  }
}
