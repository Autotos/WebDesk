/* ================================================================
   Skills REST API
   Reads skill definitions from ~/.webdesk/skills/ JSON files.
   Seeds default built-in skills on first run.
   ================================================================ */

import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

/* ----------------------------------------------------------------
   Skill File Type
   ---------------------------------------------------------------- */

interface SkillFile {
  id: string
  name: string
  description: string
  icon: string
  keywords: string[]
  systemPrompt: string
  builtIn: boolean
}

/* ----------------------------------------------------------------
   Paths
   ---------------------------------------------------------------- */

const SKILLS_DIR = path.join(os.homedir(), '.webdesk', 'skills')

/* ----------------------------------------------------------------
   Default Skills (seeded on first run)
   ---------------------------------------------------------------- */

const DEFAULT_SKILLS: SkillFile[] = [
  {
    id: 'git-helper',
    name: 'Git Helper',
    description: 'Git 工作流命令生成与问题诊断',
    icon: 'git-branch',
    keywords: ['git', 'commit', 'branch', 'merge', 'rebase', 'stash', 'push', 'pull'],
    systemPrompt:
      '你是一个 Git 专家。当用户描述 Git 操作时，生成精确的 shell 命令。' +
      '优先使用安全操作（如 git stash 而非 git reset --hard）。' +
      '对于破坏性操作（如 force push、reset --hard），必须在命令前加上警告注释。' +
      '如果用户遇到 Git 错误，分析原因并给出修复命令。',
    builtIn: true,
  },
  {
    id: 'docker-deploy',
    name: 'Docker Deploy',
    description: 'Docker 容器与编排管理',
    icon: 'container',
    keywords: ['docker', 'container', 'image', 'compose', 'build', 'run', 'deploy'],
    systemPrompt:
      '你是一个 Docker 和容器化专家。当用户描述部署或容器管理需求时，生成 Docker CLI 命令。' +
      '支持 docker compose、Dockerfile 构建、镜像管理、容器生命周期操作。' +
      '注意安全实践：不要在命令中暴露敏感信息，使用环境变量传递密钥。',
    builtIn: true,
  },
  {
    id: 'log-analyzer',
    name: 'Log Analyzer',
    description: '日志搜索与分析工具',
    icon: 'file-search',
    keywords: ['log', 'grep', 'tail', 'awk', 'sed', 'error', 'debug', 'trace'],
    systemPrompt:
      '你是一个日志分析专家。当用户需要搜索、过滤或分析日志时，生成 grep/awk/sed/tail 等命令。' +
      '支持常见日志格式（JSON 日志、syslog、nginx/apache access log）。' +
      '对于大文件，优先使用流式处理命令（如 tail -f、grep --line-buffered）。',
    builtIn: true,
  },
  {
    id: 'npm-scripts',
    name: 'NPM Scripts',
    description: 'Node.js / npm 工作流助手',
    icon: 'package',
    keywords: ['npm', 'node', 'yarn', 'pnpm', 'package', 'install', 'build', 'test', 'lint'],
    systemPrompt:
      '你是一个 Node.js 和 npm 工作流专家。当用户描述包管理、构建、测试等需求时，生成对应命令。' +
      '智能检测包管理器（npm/yarn/pnpm）。' +
      '支持常见操作：安装依赖、运行脚本、版本管理、发布包。',
    builtIn: true,
  },
]

/* ----------------------------------------------------------------
   Seed Default Skills
   ---------------------------------------------------------------- */

function ensureSkillsDir(): void {
  fs.mkdirSync(SKILLS_DIR, { recursive: true })
}

function seedDefaultSkills(): void {
  ensureSkillsDir()

  for (const skill of DEFAULT_SKILLS) {
    const filePath = path.join(SKILLS_DIR, `${skill.id}.json`)
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(skill, null, 2), 'utf-8')
    }
  }
}

/* ----------------------------------------------------------------
   Read All Skills
   ---------------------------------------------------------------- */

function readAllSkills(): SkillFile[] {
  ensureSkillsDir()
  seedDefaultSkills()

  const files = fs.readdirSync(SKILLS_DIR).filter((f) => f.endsWith('.json'))
  const skills: SkillFile[] = []

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(SKILLS_DIR, file), 'utf-8')
      const skill = JSON.parse(raw) as SkillFile
      if (skill.id && skill.name && skill.systemPrompt) {
        skills.push(skill)
      }
    } catch {
      // Skip malformed skill files
    }
  }

  return skills
}

/* ----------------------------------------------------------------
   Router Factory
   ---------------------------------------------------------------- */

export function createSkillRouter(): Router {
  const router = Router()

  // GET /api/skills — list all available skills
  router.get('/', (_req, res) => {
    try {
      const skills = readAllSkills()
      res.json(skills)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read skills'
      console.error('[skills]', message)
      res.status(500).json({ error: message })
    }
  })

  return router
}
