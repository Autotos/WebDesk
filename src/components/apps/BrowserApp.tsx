import { lazy, Suspense } from 'react'

const BrowserLayout = lazy(() =>
  import('./browser/BrowserLayout').then((m) => ({ default: m.BrowserLayout }))
)

export function BrowserApp() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full bg-mac-window text-muted-foreground text-[13px]">
          Loading browser...
        </div>
      }
    >
      <BrowserLayout />
    </Suspense>
  )
}
