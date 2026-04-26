import {
  FolderOpen,
  Code,
  Settings,
  Image,
  Calculator,
  Music,
  Terminal,
  Globe,
  type LucideIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { FinderApp } from './FinderApp'
import { CodeEditorApp } from './CodeEditorApp'
import { TerminalApp } from './TerminalApp'
import { SettingsApp } from './SettingsApp'

export interface AppDefinition {
  id: string
  name: string
  icon: LucideIcon
  iconBg: string
  component: ComponentType | null
}

export const APP_REGISTRY: AppDefinition[] = [
  {
    id: 'finder',
    name: 'Finder',
    icon: FolderOpen,
    iconBg: 'bg-mac-accent',
    component: FinderApp,
  },
  {
    id: 'code-editor',
    name: 'Code',
    icon: Code,
    iconBg: 'bg-android-primary',
    component: CodeEditorApp,
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: Terminal,
    iconBg: 'bg-foreground',
    component: TerminalApp,
  },
  {
    id: 'browser',
    name: 'Browser',
    icon: Globe,
    iconBg: 'bg-mac-maximize',
    component: null,
  },
  {
    id: 'photos',
    name: 'Photos',
    icon: Image,
    iconBg: 'bg-mac-minimize',
    component: null,
  },
  {
    id: 'music',
    name: 'Music',
    icon: Music,
    iconBg: 'bg-mac-close',
    component: null,
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: Calculator,
    iconBg: 'bg-muted-foreground',
    component: null,
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    iconBg: 'bg-muted-foreground',
    component: SettingsApp,
  },
]

export const DOCK_APPS = APP_REGISTRY.filter((a) =>
  ['finder', 'code-editor', 'terminal', 'browser', 'music', 'settings'].includes(a.id)
)

export function getApp(id: string) {
  return APP_REGISTRY.find((a) => a.id === id)
}
