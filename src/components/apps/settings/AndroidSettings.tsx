import { useState } from 'react'
import {
  Palette,
  LayoutGrid,
  Bot,
  Info,
  Wrench,
  ChevronRight,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PersonalizationSection } from './sections/PersonalizationSection'
import { AppsSection } from './sections/AppsSection'
import { AboutSection } from './sections/AboutSection'
import { SystemSection } from './sections/SystemSection'
import { AISection } from './sections/AISection'

/* ================================================================
   Navigation Config
   ================================================================ */

type SectionId = 'personalization' | 'apps' | 'ai' | 'about' | 'system'

interface NavItem {
  id: SectionId
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { id: 'personalization', label: '个性化', icon: Palette },
  { id: 'apps', label: '应用', icon: LayoutGrid },
  { id: 'ai', label: 'AI 服务', icon: Bot },
  { id: 'about', label: '关于', icon: Info },
  { id: 'system', label: '系统管理', icon: Wrench },
]

const SECTION_MAP: Record<SectionId, React.ComponentType> = {
  personalization: PersonalizationSection,
  apps: AppsSection,
  ai: AISection,
  about: AboutSection,
  system: SystemSection,
}

/* ================================================================
   Main Export
   ================================================================ */

export function AndroidSettings() {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null)

  // Detail view
  if (activeSection) {
    const ActiveComponent = SECTION_MAP[activeSection]
    const activeItem = NAV_ITEMS.find((n) => n.id === activeSection)

    return (
      <div className="h-full flex flex-col bg-android-surface">
        {/* Back header */}
        <div className="flex items-center h-11 px-3 shrink-0 border-b border-border/50">
          <button
            className="flex items-center gap-1 text-android-primary text-[13px]"
            onClick={() => setActiveSection(null)}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>返回</span>
          </button>
          <span className="flex-1 text-center text-[14px] font-semibold text-foreground -ml-10">
            {activeItem?.label}
          </span>
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-auto p-4">
          <ActiveComponent />
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="h-full bg-android-surface overflow-auto">
      <div className="p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl',
                'active:bg-accent/60 transition-colors text-left',
              )}
              onClick={() => setActiveSection(item.id)}
            >
              <div className="w-9 h-9 rounded-full bg-android-secondary flex items-center justify-center shrink-0">
                <Icon className="h-4.5 w-4.5 text-android-primary" />
              </div>
              <span className="flex-1 text-[14px] text-foreground">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
