/* ================================================================
   Skill Service — REST client for /api/skills
   ================================================================ */

import type { SkillDefinition } from './types'

export async function fetchSkills(): Promise<SkillDefinition[]> {
  const res = await fetch('/api/skills')
  if (!res.ok) {
    throw new Error(`Failed to fetch skills: ${res.status}`)
  }
  return res.json() as Promise<SkillDefinition[]>
}
