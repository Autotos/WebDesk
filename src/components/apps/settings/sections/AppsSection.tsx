import { useState, useMemo } from 'react'
import {
  Search,
  ChevronLeft,
  Shield,
  Trash2,
  User,
  Package,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  APP_REGISTRY,
  PERMISSION_LABELS,
  type AppDefinition,
} from '@/components/apps/appRegistry'

/* ================================================================
   Filter Bar
   ================================================================ */

type FilterType = 'all' | 'enabled' | 'upcoming'

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'enabled', label: '已启用' },
  { id: 'upcoming', label: '即将推出' },
]

/* ================================================================
   App Detail View
   ================================================================ */

function AppDetail({
  app,
  onBack,
}: {
  app: AppDefinition
  onBack: () => void
}) {
  const implemented = app.component !== null
  const Icon = app.icon

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        className="flex items-center gap-1 text-mac-accent text-[13px] hover:underline"
        onClick={onBack}
      >
        <ChevronLeft className="h-4 w-4" />
        返回应用列表
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md',
            app.iconBg,
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-semibold text-foreground">{app.name}</h3>
            <span
              className={cn(
                'text-[11px] px-2 py-0.5 rounded-full',
                implemented
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {implemented ? '已启用' : '即将推出'}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-1">{app.description}</p>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-lg border border-mac-border overflow-hidden">
        <InfoRow icon={Package} label="版本" value={app.version} />
        <InfoRow icon={User} label="开发者" value={app.author} />
        <InfoRow
          icon={Info}
          label="类型"
          value={app.builtIn ? '内置应用' : '第三方应用'}
          isLast
        />
      </div>

      {/* Permissions */}
      <div>
        <h4 className="text-[13px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-muted-foreground" />
          权限
        </h4>
        {app.permissions.length === 0 ? (
          <p className="text-[12px] text-muted-foreground pl-5.5">此应用无需特殊权限</p>
        ) : (
          <div className="space-y-1.5">
            {app.permissions.map((perm) => (
              <div
                key={perm}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[12px] text-foreground">
                  {PERMISSION_LABELS[perm]}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-2">
          权限管理功能即将推出，届时可自定义应用权限。
        </p>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-mac-border/50">
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-mac-border text-muted-foreground cursor-not-allowed opacity-50"
          disabled
          title={app.builtIn ? '内置应用无法卸载' : '卸载功能即将推出'}
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-[13px]">
            {app.builtIn ? '内置应用无法卸载' : '卸载'}
          </span>
        </button>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  isLast,
}: {
  icon: typeof Package
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
      <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-[12px] text-foreground font-medium">{value}</span>
    </div>
  )
}

/* ================================================================
   Main Export
   ================================================================ */

export function AppsSection() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedApp, setSelectedApp] = useState<string | null>(null)

  const filteredApps = useMemo(() => {
    return APP_REGISTRY.filter((app) => {
      // Search match
      const q = search.toLowerCase()
      if (q && !app.name.toLowerCase().includes(q) && !app.description.toLowerCase().includes(q)) {
        return false
      }
      // Filter match
      if (filter === 'enabled' && app.component === null) return false
      if (filter === 'upcoming' && app.component !== null) return false
      return true
    })
  }, [search, filter])

  // Detail view
  const detail = selectedApp ? APP_REGISTRY.find((a) => a.id === selectedApp) : null
  if (detail) {
    return <AppDetail app={detail} onBack={() => setSelectedApp(null)} />
  }

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-foreground">已安装应用</h2>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="搜索应用..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/50 border border-mac-border/40 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-mac-accent/50 transition-shadow"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-0.5 bg-muted rounded-lg w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={cn(
              'px-3 py-1 text-[12px] rounded-md transition-all',
              filter === f.id
                ? 'bg-background text-foreground shadow-sm font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* App count */}
      <p className="text-[11px] text-muted-foreground">
        共 {filteredApps.length} 个应用
        {filter !== 'all' && ` (${FILTERS.find((f) => f.id === filter)?.label})`}
      </p>

      {/* App list */}
      {filteredApps.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[13px] text-muted-foreground">未找到匹配的应用</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredApps.map((app) => {
            const Icon = app.icon
            const implemented = app.component !== null

            return (
              <button
                key={app.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left"
                onClick={() => setSelectedApp(app.id)}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0',
                    app.iconBg,
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{app.name}</span>
                    <span className="text-[11px] text-muted-foreground">v{app.version}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{app.description}</p>
                </div>

                {/* Status badge */}
                <span
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full shrink-0',
                    implemented
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {implemented ? '已启用' : '即将推出'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
