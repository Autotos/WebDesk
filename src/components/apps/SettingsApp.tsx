import { lazy, Suspense } from 'react'
import { useSystemTheme } from '@/hooks/useSystemTheme'

const MacSettings = lazy(() =>
  import('./settings/MacSettings').then((m) => ({ default: m.MacSettings })),
)
const AndroidSettings = lazy(() =>
  import('./settings/AndroidSettings').then((m) => ({ default: m.AndroidSettings })),
)

export function SettingsApp() {
  const theme = useSystemTheme()
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full bg-background text-muted-foreground text-[13px]">
          Loading settings...
        </div>
      }
    >
      {theme === 'mac' ? <MacSettings /> : <AndroidSettings />}
    </Suspense>
  )
}
