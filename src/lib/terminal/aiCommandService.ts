/* ================================================================
   AI Command Generation Service
   Converts natural language input into executable shell commands.
   Uses the existing AI service infrastructure (chatCompletionStream).
   ================================================================ */

import { chatCompletionStream } from '@/lib/ai/aiService'
import type { ChatMessage } from '@/lib/ai/types'
import type { SkillDefinition, ServerEnvInfo } from './types'

/* ----------------------------------------------------------------
   Natural Language Detection
   Conservative: when uncertain, treat as shell command.
   ---------------------------------------------------------------- */

const SHELL_PREFIXES = [
  'ls', 'cd', 'pwd', 'cat', 'echo', 'grep', 'find', 'mkdir', 'rm', 'cp', 'mv',
  'touch', 'chmod', 'chown', 'tar', 'zip', 'unzip', 'curl', 'wget',
  'git', 'npm', 'npx', 'yarn', 'pnpm', 'node', 'python', 'python3', 'pip',
  'docker', 'docker-compose', 'kubectl', 'ssh', 'scp', 'rsync',
  'vim', 'nano', 'less', 'more', 'head', 'tail', 'wc', 'sort', 'uniq',
  'awk', 'sed', 'cut', 'tr', 'xargs', 'tee', 'diff', 'patch',
  'ps', 'kill', 'top', 'htop', 'df', 'du', 'free', 'uname', 'whoami',
  'which', 'where', 'man', 'history', 'export', 'env', 'set', 'source',
  'sudo', 'su', 'apt', 'yum', 'brew', 'dnf', 'pacman',
  'make', 'cmake', 'gcc', 'g++', 'cargo', 'go', 'rustc', 'javac', 'java',
  'systemctl', 'service', 'journalctl', 'crontab', 'at',
  'ping', 'traceroute', 'netstat', 'ss', 'ip', 'ifconfig', 'nslookup', 'dig',
  'mysql', 'psql', 'redis-cli', 'mongo', 'sqlite3',
]

const NL_PATTERNS = [
  /^(请|帮我|帮忙|麻烦|如何|怎么|怎样|能不能|可以|我想|我要|我需要)/,
  /^(help|please|how|what|can you|i want|i need|show me|tell me|explain)/i,
  /(一下|看看|检查|分析|查看|做|搞|弄|运行|执行|部署|安装|删除|创建|更新|修改|编辑|打开)/,
]

export function isNaturalLanguage(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed) return false

  // Explicit AI prefix
  if (trimmed.startsWith('/ai ') || trimmed.startsWith('/ai\t')) return true

  // Starts with known shell command → not NL
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase()
  if (SHELL_PREFIXES.includes(firstWord)) return false

  // Starts with ./ or / (path) or $ or ! → not NL
  if (/^[./$!]/.test(trimmed)) return false

  // Contains pipe, redirect, or semicolon → not NL
  if (/[|><;]/.test(trimmed)) return false

  // Matches NL patterns → yes
  if (NL_PATTERNS.some((p) => p.test(trimmed))) return true

  // Contains spaces and no special chars → likely NL
  if (trimmed.includes(' ') && !/^[a-zA-Z0-9._-]+\s/.test(trimmed)) return true

  // Default: treat as shell command (conservative)
  return false
}

/* ----------------------------------------------------------------
   System Prompt Builder — environment-aware
   ---------------------------------------------------------------- */

function buildEnvSection(env: ServerEnvInfo | null): string {
  if (!env) {
    return '操作系统：未知（请生成 POSIX 兼容命令）\n'
  }
  return [
    `操作系统：${env.osRelease} (${env.osType})`,
    `架构：${env.arch}`,
    `Shell：${env.shell}`,
    `主机名：${env.hostname}`,
  ].join('\n') + '\n'
}

function buildSystemPrompt(
  cwd: string,
  enabledSkills: SkillDefinition[],
  serverEnv: ServerEnvInfo | null,
): string {
  const envSection = buildEnvSection(serverEnv)
  const shellName = serverEnv?.shell || 'sh'
  const osType = serverEnv?.osType || 'Linux'

  let osHint = ''
  if (osType === 'Darwin') {
    osHint =
      '- 这是 macOS 系统，使用 BSD 风格的命令参数（如 ls -G 而不是 ls --color）\n' +
      '- 包管理器使用 brew\n'
  } else if (osType === 'Windows_NT') {
    osHint =
      '- 这是 Windows 系统，生成 PowerShell 或 cmd 兼容的命令\n' +
      '- 使用反斜杠路径分隔符或引号包裹路径\n'
  } else {
    osHint =
      '- 这是 Linux 系统，使用 GNU 风格的命令参数\n' +
      '- 包管理器可能是 apt、yum、dnf、pacman 等\n'
  }

  let prompt =
    `你是一个终端命令生成助手，运行在以下服务器环境中：\n\n` +
    `${envSection}\n` +
    `当前工作目录：${cwd}\n\n` +
    `重要约束：\n` +
    `- 你必须生成适配 ${shellName} shell 的命令\n` +
    osHint +
    `- 不要生成其他操作系统的命令\n\n` +
    '输出规则：\n' +
    '1. 输出严格 JSON 格式：{"tasks": [{"description": "简短描述", "command": "具体命令"}]}\n' +
    '2. 如果是复杂任务，拆分为多个步骤\n' +
    '3. 每个 command 必须是可直接在当前环境执行的 shell 命令\n' +
    '4. 对于破坏性操作（rm -rf、force push 等），在 description 中加上 [危险] 前缀\n' +
    '5. 不要输出 JSON 以外的内容，不要加 markdown 代码块标记\n'

  if (enabledSkills.length > 0) {
    prompt += '\n已启用的专业技能上下文：\n'
    for (const skill of enabledSkills) {
      prompt += `\n【${skill.name}】\n${skill.systemPrompt}\n`
    }
  }

  return prompt
}

/* ----------------------------------------------------------------
   Generate Commands from Natural Language
   ---------------------------------------------------------------- */

export interface GeneratedTask {
  description: string
  command: string
}

export async function generateCommandsFromNL(
  userInput: string,
  cwd: string,
  enabledSkills: SkillDefinition[],
  serverEnv?: ServerEnvInfo | null,
): Promise<GeneratedTask[]> {
  return generateCommandsFromNLStream(userInput, cwd, enabledSkills, serverEnv)
}

/**
 * Parse AI response text (possibly with markdown fences) into GeneratedTask[].
 */
function parseTasksFromContent(content: string, fallbackDesc: string): GeneratedTask[] {
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  try {
    const parsed = JSON.parse(jsonStr) as { tasks?: GeneratedTask[] }
    if (Array.isArray(parsed.tasks)) {
      return parsed.tasks.filter((t) => t.command && t.description)
    }
    if (Array.isArray(parsed)) {
      return (parsed as GeneratedTask[]).filter((t) => t.command && t.description)
    }
  } catch {
    if (content.trim()) {
      return [{ description: fallbackDesc, command: content.trim() }]
    }
  }

  return []
}

/**
 * Stream-based command generation from natural language.
 * Calls the AI streaming API, invokes `onChunk` as text arrives,
 * and returns the final parsed task list.
 */
export async function generateCommandsFromNLStream(
  userInput: string,
  cwd: string,
  enabledSkills: SkillDefinition[],
  serverEnv?: ServerEnvInfo | null,
  onChunk?: (textSoFar: string, delta: string) => void,
): Promise<GeneratedTask[]> {
  const cleanInput = userInput.replace(/^\/ai\s+/, '').trim()
  const systemPrompt = buildSystemPrompt(cwd, enabledSkills, serverEnv ?? null)

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: cleanInput },
  ]

  let accumulated = ''

  for await (const chunk of chatCompletionStream(messages)) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      accumulated += delta
      onChunk?.(accumulated, delta)
    }
  }

  return parseTasksFromContent(accumulated, cleanInput)
}
