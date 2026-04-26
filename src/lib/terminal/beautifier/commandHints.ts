/* ================================================================
   Command Hints — map command names to detector hint categories
   ================================================================ */

import type { DetectorHint } from './types'

/** Extract the base command from a full command string (strip sudo, env, pipes) */
export function extractBaseCommand(command: string): string {
  let cmd = command.trim()

  // Strip leading env assignments (FOO=bar ...)
  cmd = cmd.replace(/^(?:\S+=\S+\s+)+/, '')

  // Strip sudo prefix
  cmd = cmd.replace(/^sudo\s+(?:-\S+\s+)*/, '')

  // Take only the part before the first pipe
  const pipeIdx = cmd.indexOf('|')
  if (pipeIdx > 0) cmd = cmd.substring(0, pipeIdx).trim()

  // Take only the part before && or ;
  cmd = cmd.split(/\s*(?:&&|;)\s*/)[0]

  return cmd.trim()
}

/** Pattern-based mapping from command string to detector hints */
const HINT_RULES: Array<{ test: RegExp; hints: DetectorHint[] }> = [
  // Git
  { test: /^git\s+status\b/, hints: ['git-status'] },
  { test: /^git\s+diff\b/, hints: ['diff'] },
  { test: /^git\s+show\b/, hints: ['diff'] },
  { test: /^git\s+log\b.*\s-p\b/, hints: ['diff'] },
  { test: /^git\s+log\b/, hints: ['log'] },

  // Table-like commands
  { test: /^ls\s+.*-[^\s]*l/, hints: ['table'] },
  { test: /^ll\b/, hints: ['table'] },
  { test: /^ps\s+(aux|ef|-ef|-aux)\b/, hints: ['table'] },
  { test: /^docker\s+(ps|images)\b/, hints: ['table'] },
  { test: /^docker\s+container\s+ls\b/, hints: ['table'] },
  { test: /^df\b/, hints: ['table'] },
  { test: /^du\b/, hints: ['table'] },
  { test: /^mount\b/, hints: ['table'] },
  { test: /^lsblk\b/, hints: ['table'] },
  { test: /^netstat\b/, hints: ['table'] },
  { test: /^ss\b/, hints: ['table'] },
  { test: /^lsof\b/, hints: ['table'] },
  { test: /^ip\s+(addr|link|route)\b/, hints: ['table'] },
  { test: /^lshw\b/, hints: ['table'] },

  // JSON
  { test: /^cat\s+.*\.json\b/, hints: ['json'] },
  { test: /^jq\b/, hints: ['json'] },
  { test: /^python3?\s+-m\s+json\.tool\b/, hints: ['json'] },
  { test: /^curl\b.*\.json\b/, hints: ['json'] },

  // Progress
  { test: /^npm\s+(install|i|ci)\b/, hints: ['progress'] },
  { test: /^yarn\s+(add|install)\b/, hints: ['progress'] },
  { test: /^pnpm\s+(install|add)\b/, hints: ['progress'] },
  { test: /^pip3?\s+install\b/, hints: ['progress'] },
  { test: /^apt(-get)?\s+(install|update|upgrade)\b/, hints: ['progress'] },
  { test: /^brew\s+install\b/, hints: ['progress'] },
  { test: /^wget\b/, hints: ['progress'] },
  { test: /^curl\s.*-[^\s]*[oO]\b/, hints: ['progress'] },

  // Log
  { test: /^tail\b/, hints: ['log'] },
  { test: /^journalctl\b/, hints: ['log'] },
  { test: /^dmesg\b/, hints: ['log'] },
]

/** Get detector hints for a given command string */
export function getCommandHints(command: string): DetectorHint[] {
  const base = extractBaseCommand(command)
  for (const rule of HINT_RULES) {
    if (rule.test.test(base)) return rule.hints
  }
  return []
}
