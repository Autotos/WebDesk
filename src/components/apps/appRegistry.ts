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

export type AppPermission =
  | 'filesystem'
  | 'network'
  | 'terminal'
  | 'system-settings'
  | 'storage'

export const PERMISSION_LABELS: Record<AppPermission, string> = {
  filesystem: '文件系统访问',
  network: '网络访问',
  terminal: '终端访问',
  'system-settings': '系统设置',
  storage: '本地存储',
}

export interface AppDefinition {
  id: string
  name: string
  icon: LucideIcon
  iconBg: string
  component: ComponentType | null
  description: string
  version: string
  author: string
  permissions: AppPermission[]
  builtIn: boolean
}

export const APP_REGISTRY: AppDefinition[] = [
  {
    id: 'finder',
    name: 'Finder',
    icon: FolderOpen,
    iconBg: 'bg-mac-accent',
    component: FinderApp,
    description: '文件管理器，支持浏览、创建、删除和管理文件与文件夹。',
    version: '1.0.0',
    author: 'WebDesk',
    permissions: ['filesystem', 'storage'],
    builtIn: true,
  },
  {
    id: 'code-editor',
    name: 'Code',
    icon: Code,
    iconBg: 'bg-android-primary',
    component: CodeEditorApp,
    description: 'VS Code 风格的代码编辑器，支持语法高亮、多标签页和 Markdown 实时预览。',
    version: '1.0.0',
    author: 'WebDesk',
    permissions: ['filesystem', 'network', 'storage'],
    builtIn: true,
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: Terminal,
    iconBg: 'bg-foreground',
    component: TerminalApp,
    description: '全功能终端模拟器，基于 xterm.js 和 node-pty 实现的服务端终端。',
    version: '1.0.0',
    author: 'WebDesk',
    permissions: ['terminal', 'network'],
    builtIn: true,
  },
  {
    id: 'browser',
    name: 'Browser',
    icon: Globe,
    iconBg: 'bg-mac-maximize',
    component: null,
    description: '内置网页浏览器，支持在 WebDesk 中浏览网页。',
    version: '0.0.1',
    author: 'WebDesk',
    permissions: ['network'],
    builtIn: true,
  },
  {
    id: 'photos',
    name: 'Photos',
    icon: Image,
    iconBg: 'bg-mac-minimize',
    component: null,
    description: '照片查看与管理工具，支持图片浏览和基本编辑。',
    version: '0.0.1',
    author: 'WebDesk',
    permissions: ['filesystem', 'storage'],
    builtIn: true,
  },
  {
    id: 'music',
    name: 'Music',
    icon: Music,
    iconBg: 'bg-mac-close',
    component: null,
    description: '音乐播放器，支持播放本地和在线音乐。',
    version: '0.0.1',
    author: 'WebDesk',
    permissions: ['filesystem', 'network', 'storage'],
    builtIn: true,
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: Calculator,
    iconBg: 'bg-muted-foreground',
    component: null,
    description: '计算器工具，支持基础运算和科学计算。',
    version: '0.0.1',
    author: 'WebDesk',
    permissions: [],
    builtIn: true,
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    iconBg: 'bg-muted-foreground',
    component: SettingsApp,
    description: '系统设置中心，管理个性化、应用、系统信息和数据。',
    version: '1.0.0',
    author: 'WebDesk',
    permissions: ['system-settings', 'storage'],
    builtIn: true,
  },
]

export const DOCK_APPS = APP_REGISTRY.filter((a) =>
  ['finder', 'code-editor', 'terminal', 'browser', 'music', 'settings'].includes(a.id)
)

export function getApp(id: string) {
  return APP_REGISTRY.find((a) => a.id === id)
}
