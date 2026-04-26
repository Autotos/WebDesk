import { useSystemTheme } from '@/hooks/useSystemTheme'
import { ExternalLink, Github, BookOpen, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ================================================================
   Helpers
   ================================================================ */

function getBrowserInfo(): string {
  const ua = navigator.userAgent
  if (ua.includes('Firefox/')) return `Firefox ${ua.split('Firefox/')[1]?.split(' ')[0] ?? ''}`
  if (ua.includes('Edg/')) return `Edge ${ua.split('Edg/')[1]?.split(' ')[0] ?? ''}`
  if (ua.includes('Chrome/')) return `Chrome ${ua.split('Chrome/')[1]?.split(' ')[0] ?? ''}`
  if (ua.includes('Safari/') && !ua.includes('Chrome'))
    return `Safari ${ua.split('Version/')[1]?.split(' ')[0] ?? ''}`
  return navigator.userAgent.slice(0, 30)
}

function getOSInfo(): string {
  const ua = navigator.userAgent
  if (ua.includes('Win')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return navigator.platform
}

function formatBuildTime(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/* ================================================================
   Info Row Component
   ================================================================ */

function InfoRow({
  label,
  value,
  isLast,
}: {
  label: string
  value: string
  isLast?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2.5',
        !isLast && 'border-b border-mac-border/50',
      )}
    >
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[12px] text-foreground font-medium">{value}</span>
    </div>
  )
}

/* ================================================================
   Link Button Component
   ================================================================ */

function LinkButton({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Github
  label: string
  href: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-mac-border hover:bg-accent/50 transition-colors group"
    >
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-mac-accent transition-colors shrink-0" />
      <span className="flex-1 text-[13px] text-foreground">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </a>
  )
}

/* ================================================================
   Main Export
   ================================================================ */

export function AboutSection() {
  const theme = useSystemTheme()
  const resolution = `${window.screen.width} x ${window.screen.height}`
  const version = __APP_VERSION__
  const buildTime = __BUILD_TIME__

  const infoRows: { label: string; value: string }[] = [
    { label: '系统名称', value: 'WebDesk' },
    { label: '版本', value: `v${version}` },
    { label: '构建时间', value: formatBuildTime(buildTime) },
    { label: '当前平台', value: theme === 'mac' ? 'macOS 模式' : 'Android 模式' },
    { label: '屏幕分辨率', value: resolution },
    { label: '浏览器', value: getBrowserInfo() },
    { label: '操作系统', value: getOSInfo() },
    { label: '渲染引擎', value: 'React 18 + Vite' },
    { label: 'UI 框架', value: 'Tailwind CSS' },
    { label: '语言', value: 'TypeScript' },
  ]

  const techStack = [
    'React',
    'TypeScript',
    'Vite',
    'Tailwind CSS',
    'Zustand',
    'Framer Motion',
    'Socket.IO',
    'Monaco Editor',
    'xterm.js',
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-[15px] font-semibold text-foreground">关于 WebDesk</h2>

      {/* Logo + name + version */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-mac-accent to-blue-400 flex items-center justify-center text-white text-[28px] font-bold shadow-lg">
          W
        </div>
        <div>
          <p className="text-[18px] font-semibold text-foreground">WebDesk</p>
          <p className="text-[12px] text-muted-foreground">Web 版模拟桌面系统</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            版本 {version} &middot; {formatBuildTime(buildTime)}
          </p>
        </div>
      </div>

      {/* System info rows */}
      <div className="rounded-lg border border-mac-border overflow-hidden">
        {infoRows.map((row, i) => (
          <InfoRow
            key={row.label}
            label={row.label}
            value={row.value}
            isLast={i === infoRows.length - 1}
          />
        ))}
      </div>

      {/* Tech stack */}
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-2">技术栈</h3>
        <div className="flex flex-wrap gap-1.5">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="text-[11px] px-2.5 py-0.5 rounded-full bg-mac-accent/10 text-mac-accent"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Links */}
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-2">链接</h3>
        <div className="space-y-2">
          <LinkButton
            icon={Github}
            label="GitHub 仓库"
            href="https://github.com/webdesk/webdesk"
          />
          <LinkButton
            icon={BookOpen}
            label="开发文档"
            href="https://github.com/webdesk/webdesk#readme"
          />
        </div>
      </div>

      {/* Copyright */}
      <div className="pt-4 border-t border-mac-border/50 text-center space-y-1">
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
          Made with <Heart className="h-3 w-3 text-mac-close" /> by WebDesk Team
        </p>
        <p className="text-[11px] text-muted-foreground">
          &copy; {new Date().getFullYear()} WebDesk. MIT License.
        </p>
      </div>
    </div>
  )
}
