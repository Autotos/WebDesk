import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useIDEStore } from '@/store/useIDEStore'

const TOAST_DURATION = 3000

export function ToastContainer() {
  const toasts = useIDEStore((s) => s.toasts)
  const removeToast = useIDEStore((s) => s.removeToast)

  useEffect(() => {
    if (toasts.length === 0) return

    const timers = toasts.map((t) => {
      const elapsed = Date.now() - t.timestamp
      const remaining = Math.max(0, TOAST_DURATION - elapsed)
      return setTimeout(() => removeToast(t.id), remaining)
    })

    return () => timers.forEach(clearTimeout)
  }, [toasts, removeToast])

  if (toasts.length === 0) return null

  return (
    <div className="absolute bottom-10 right-3 z-50 flex flex-col gap-1.5 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-2 bg-foreground/90 text-background text-[12px] pl-3 pr-1.5 py-1.5 rounded-md shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200"
        >
          <span className="truncate max-w-[220px]">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-0.5 rounded hover:bg-background/20 transition-colors shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
