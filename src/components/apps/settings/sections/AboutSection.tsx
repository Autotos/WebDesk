import { useSystemTheme } from '@/hooks/useSystemTheme'

const VERSION = '0.1.0'

interface InfoRow {
  label: string
  value: string
}

export function AboutSection() {
  const theme = useSystemTheme()
  const resolution = `${window.innerWidth} × ${window.innerHeight}`

  const rows: InfoRow[] = [
    { label: '系统名称', value: 'WebDesk' },
    { label: '版本', value: VERSION },
    { label: '当前平台', value: theme === 'mac' ? 'macOS 模式' : 'Android 模式' },
    { label: '屏幕分辨率', value: resolution },
    { label: '渲染引擎', value: 'React 18 + Vite' },
    { label: 'UI 框架', value: 'Tailwind CSS' },
    { label: '语言', value: 'TypeScript' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-[15px] font-semibold text-foreground">关于 WebDesk</h2>

      {/* Logo + name */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-mac-accent to-blue-400 flex items-center justify-center text-white text-[24px] font-bold shadow-md">
          W
        </div>
        <div>
          <p className="text-[16px] font-semibold text-foreground">WebDesk</p>
          <p className="text-[12px] text-muted-foreground">Web 版模拟桌面系统</p>
        </div>
      </div>

      {/* Info rows */}
      <div className="rounded-lg border border-mac-border overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-center justify-between px-4 py-2.5 ${
              i < rows.length - 1 ? 'border-b border-mac-border/50' : ''
            }`}
          >
            <span className="text-[12px] text-muted-foreground">{row.label}</span>
            <span className="text-[12px] text-foreground font-medium">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-2">技术栈</h3>
        <div className="flex flex-wrap gap-1.5">
          {['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Zustand', 'Framer Motion', 'Socket.IO', 'Monaco Editor', 'xterm.js'].map(
            (tech) => (
              <span
                key={tech}
                className="text-[11px] px-2 py-0.5 rounded-full bg-mac-accent/10 text-mac-accent"
              >
                {tech}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  )
}
