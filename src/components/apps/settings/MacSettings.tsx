import { useState } from 'react'
import { Palette, LayoutGrid, Bot, Info, Wrench, type LucideIcon } from 'lucide-react'
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

export function MacSettings() {
  const [activeSection, setActiveSection] = useState<SectionId>('personalization')
  const ActiveComponent = SECTION_MAP[activeSection]

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-[200px] shrink-0 bg-mac-sidebar/80 border-r border-mac-border/40 flex flex-col">
        <div className="px-3 pt-3 pb-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            设置
          </span>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                  isActive
                    ? 'bg-mac-accent/15 text-mac-accent font-medium'
                    : 'text-foreground/70 hover:bg-accent',
                )}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-auto scrollbar-thin p-6">
        <ActiveComponent />
      </main>
    </div>
  )
}
