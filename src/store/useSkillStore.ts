import { create } from 'zustand'
import type { SkillDefinition } from '@/lib/terminal/types'
import { fetchSkills } from '@/lib/terminal/skillService'

/* ================================================================
   Skill Store — fetched from backend /api/skills
   Enabled state is managed by useWarpTerminalStore.enabledSkillIds
   ================================================================ */

interface SkillState {
  skills: SkillDefinition[]
  loading: boolean
  error: string | null
  loadSkills: () => Promise<void>
}

export const useSkillStore = create<SkillState>()((set) => ({
  skills: [],
  loading: false,
  error: null,

  loadSkills: async () => {
    set({ loading: true, error: null })
    try {
      const skills = await fetchSkills()
      set({ skills, loading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load skills'
      set({ error: message, loading: false })
    }
  },
}))
