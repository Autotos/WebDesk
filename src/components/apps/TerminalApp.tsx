import { lazy, Suspense } from 'react'
import { useSystemTheme } from '@/hooks/useSystemTheme'

const TerminalWindow = lazy(() =>
  import('./terminal/TerminalWindow').then((m) => ({ default: m.TerminalWindow })),
)

export function TerminalApp() {
  const theme = useSystemTheme()
  const compact = theme === 'android'
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full bg-[#1e1e2e] text-[#6c7086] text-[13px]">
          Loading terminal...
        </div>
      }
    >
      <TerminalWindow compact={compact} />
    </Suspense>
  )
}
