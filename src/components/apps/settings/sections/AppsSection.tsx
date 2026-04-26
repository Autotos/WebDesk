import { cn } from '@/lib/utils'
import { APP_REGISTRY } from '@/components/apps/appRegistry'

export function AppsSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-foreground">已安装应用</h2>

      <div className="space-y-1">
        {APP_REGISTRY.map((app) => {
          const Icon = app.icon
          const implemented = app.component !== null

          return (
            <div
              key={app.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors"
            >
              {/* Icon */}
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0',
                  app.iconBg,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Name */}
              <span className="flex-1 text-[13px] text-foreground">{app.name}</span>

              {/* Status badge */}
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
          )
        })}
      </div>
    </div>
  )
}
