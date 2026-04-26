import { useEffect } from 'react'
import {
  ChevronRight,
  Zap,
  GitBranch,
  Container,
  FileSearch,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSkillStore } from '@/store/useSkillStore'
import type { SkillDefinition } from '@/lib/terminal/types'

/* ================================================================
   SkillPanel — right sidebar for enabling/disabling AI skills
   ================================================================ */

interface SkillPanelProps {
  enabledSkillIds: string[]
  compact: boolean
  onToggleSkill: (skillId: string) => void
  onClose: () => void
}

/* Map skill icon names to Lucide components */
const ICON_MAP: Record<string, React.ReactNode> = {
  'git-branch': <GitBranch className="h-4 w-4" />,
  container: <Container className="h-4 w-4" />,
  'file-search': <FileSearch className="h-4 w-4" />,
  package: <Package className="h-4 w-4" />,
}

function SkillIcon({ icon }: { icon: string }) {
  return <>{ICON_MAP[icon] || <Zap className="h-4 w-4" />}</>
}

function SkillCard({
  skill,
  enabled,
  onToggle,
}: {
  skill: SkillDefinition
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      className={cn(
        'w-full text-left p-2.5 rounded-lg border transition-all',
        enabled
          ? 'border-[#89b4fa]/40 bg-[#89b4fa]/5'
          : 'border-[#313244] bg-transparent hover:border-[#45475a]',
      )}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'shrink-0',
            enabled ? 'text-[#89b4fa]' : 'text-[#6c7086]',
          )}
        >
          <SkillIcon icon={skill.icon} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#cdd6f4]">
              {skill.name}
            </span>
            <div
              className={cn(
                'w-7 h-4 rounded-full p-0.5 transition-colors',
                enabled ? 'bg-[#89b4fa]' : 'bg-[#45475a]',
              )}
            >
              <div
                className={cn(
                  'h-3 w-3 rounded-full bg-white transition-transform',
                  enabled ? 'translate-x-3' : 'translate-x-0',
                )}
              />
            </div>
          </div>
          <p className="text-[10px] text-[#6c7086] mt-0.5 leading-snug">
            {skill.description}
          </p>
        </div>
      </div>
    </button>
  )
}

export function SkillPanel({
  enabledSkillIds,
  compact,
  onToggleSkill,
  onClose,
}: SkillPanelProps) {
  const skills = useSkillStore((s) => s.skills)
  const loading = useSkillStore((s) => s.loading)
  const error = useSkillStore((s) => s.error)
  const loadSkills = useSkillStore((s) => s.loadSkills)

  useEffect(() => {
    if (skills.length === 0 && !loading) {
      loadSkills()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[#11111b] border-l border-[#313244]',
        compact ? 'w-[200px]' : 'w-[240px]',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#313244]">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-[#f9e2af]" />
          <span className="text-[12px] font-medium text-[#cdd6f4]">Skills</span>
        </div>
        <button
          className="p-1 rounded hover:bg-[#313244] text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
          onClick={onClose}
          title="收起面板"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Info */}
      <div className="px-3 py-2 border-b border-[#313244]/50">
        <p className="text-[10px] text-[#585b70] leading-snug">
          启用技能后，AI 将结合对应领域知识来生成更精准的命令。
        </p>
      </div>

      {/* Skill list */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center h-20 text-[11px] text-[#6c7086]">
            加载技能中...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-20 text-[11px] text-[#f38ba8] px-2 text-center">
            <span>{error}</span>
            <button
              className="mt-1.5 text-[#89b4fa] hover:underline"
              onClick={loadSkills}
            >
              重试
            </button>
          </div>
        ) : skills.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[11px] text-[#585b70]">
            暂无可用技能
          </div>
        ) : (
          skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              enabled={enabledSkillIds.includes(skill.id)}
              onToggle={() => onToggleSkill(skill.id)}
            />
          ))
        )}
      </div>

      {/* Footer: enabled count */}
      <div className="px-3 py-1.5 border-t border-[#313244] text-[10px] text-[#585b70]">
        已启用 {enabledSkillIds.length} / {skills.length} 个技能
      </div>
    </div>
  )
}
