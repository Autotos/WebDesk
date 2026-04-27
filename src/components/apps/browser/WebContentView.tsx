import { useCallback, useEffect, useRef, useState } from 'react'
import { Globe, ExternalLink, ShieldAlert, WifiOff, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBrowserStore, type BrowserTab } from '@/store/useBrowserStore'

interface WebContentViewProps {
  tab: BrowserTab
}

/**
 * Builds the proxied URL for iframe embedding.
 * Routes through `/api/browser/proxy?url=...` which rewrites HTML
 * (injects `<base>` tag, fixes relative URLs, intercepts navigation).
 */
function getProxyUrl(url: string): string {
  return `/api/browser/proxy?url=${encodeURIComponent(url)}`
}

export function WebContentView({ tab }: WebContentViewProps) {
  const navigateTo = useBrowserStore((s) => s.navigateTo)
  const updateTab = useBrowserStore((s) => s.updateTab)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Simulated progress bar
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current)

    let progress = 10
    updateTab(tab.id, { loadProgress: progress })

    progressRef.current = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 90) {
        progress = 90
        if (progressRef.current) clearInterval(progressRef.current)
      }
      updateTab(tab.id, { loadProgress: Math.min(progress, 90) })
    }, 300)
  }, [tab.id, updateTab])

  const stopProgress = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current)
      progressRef.current = null
    }
  }, [])

  // Start progress when loading begins
  useEffect(() => {
    if (tab.isLoading && tab.url !== 'newtab') {
      setLoadError(null)
      startProgress()
    }
    return () => stopProgress()
  }, [tab.isLoading, tab.url, startProgress, stopProgress])

  const handleIframeLoad = useCallback(() => {
    stopProgress()
    updateTab(tab.id, {
      isLoading: false,
      loadProgress: 100,
      error: null,
    })

    // Reset progress to 0 after the bar fades out
    setTimeout(() => {
      updateTab(tab.id, { loadProgress: 0 })
    }, 400)
  }, [tab.id, updateTab, stopProgress])

  const handleIframeError = useCallback(() => {
    stopProgress()
    const errorMsg = 'Failed to load page. The site may block iframe embedding.'
    setLoadError(errorMsg)
    updateTab(tab.id, {
      isLoading: false,
      error: errorMsg,
      loadProgress: 0,
    })
  }, [tab.id, updateTab, stopProgress])

  // Listen for postMessage events from the proxied iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      // Only accept messages from our own origin (proxy serves from same origin)
      if (e.origin !== window.location.origin) return

      const data = e.data
      if (!data || typeof data !== 'object' || !data.type) return

      switch (data.type) {
        case 'webdesk-navigate':
          // The injected script intercepted a link click / form submit
          if (typeof data.url === 'string' && data.url) {
            navigateTo(data.url)
          }
          break

        case 'webdesk-title':
          // Update the tab title from the loaded page
          if (typeof data.title === 'string' && data.title) {
            updateTab(tab.id, { title: data.title })
          }
          break

        case 'webdesk-favicon':
          // Could be used later for tab favicon display
          break
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [tab.id, navigateTo, updateTab])

  // If there is an error from store or local state, show error page
  const error = tab.error || loadError

  if (error) {
    return <ErrorPage tab={tab} error={error} />
  }

  return (
    <div className="relative h-full w-full bg-white">
      {/* Progress bar */}
      {tab.loadProgress > 0 && tab.loadProgress < 100 && (
        <div className="absolute top-0 left-0 right-0 h-[2px] z-20 bg-black/5">
          <div
            className="h-full bg-mac-accent transition-all duration-300 ease-out"
            style={{ width: `${tab.loadProgress}%` }}
          />
        </div>
      )}

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        key={tab.url}
        src={getProxyUrl(tab.url)}
        className="w-full h-full border-none"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title={tab.title}
      />
    </div>
  )
}

/* ================================================================
   Error page component
   ================================================================ */

function ErrorPage({ tab, error }: { tab: BrowserTab; error: string }) {
  const reload = useBrowserStore((s) => s.reload)
  const updateTab = useBrowserStore((s) => s.updateTab)

  const handleRetry = useCallback(() => {
    updateTab(tab.id, { error: null })
    reload()
  }, [tab.id, updateTab, reload])

  const errorType = getErrorType(error)

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50/50 px-8">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center">
        {/* Icon */}
        <div
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center',
            errorType === 'blocked'
              ? 'bg-amber-50 text-amber-500'
              : errorType === 'network'
                ? 'bg-red-50 text-red-400'
                : 'bg-gray-100 text-gray-400'
          )}
        >
          {errorType === 'blocked' ? (
            <ShieldAlert className="w-7 h-7" />
          ) : errorType === 'network' ? (
            <WifiOff className="w-7 h-7" />
          ) : (
            <AlertTriangle className="w-7 h-7" />
          )}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-[14px] font-semibold text-foreground/80">
            {errorType === 'blocked'
              ? 'This page cannot be embedded'
              : errorType === 'network'
                ? 'Cannot reach this site'
                : 'Something went wrong'}
          </h3>
          <p className="text-[12px] text-foreground/40 leading-relaxed">
            {errorType === 'blocked'
              ? 'The website has security policies that prevent it from being displayed in an embedded browser.'
              : error}
          </p>
        </div>

        {/* URL */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/[0.03] max-w-full">
          <Globe className="w-3 h-3 text-foreground/30 shrink-0" />
          <span className="text-[11px] text-foreground/50 truncate">{tab.url}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRetry}
            className={cn(
              'px-4 py-2 rounded-lg text-[12px] font-medium',
              'bg-mac-accent text-white',
              'hover:brightness-110 active:scale-[0.98] transition-all'
            )}
          >
            Try Again
          </button>
          <a
            href={tab.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[12px] font-medium',
              'bg-black/[0.04] text-foreground/60',
              'hover:bg-black/[0.08] active:scale-[0.98] transition-all'
            )}
          >
            <ExternalLink className="w-3 h-3" />
            Open Externally
          </a>
        </div>
      </div>
    </div>
  )
}

function getErrorType(error: string): 'blocked' | 'network' | 'unknown' {
  const lower = error.toLowerCase()
  if (
    lower.includes('iframe') ||
    lower.includes('frame') ||
    lower.includes('embed') ||
    lower.includes('x-frame') ||
    lower.includes('csp')
  ) {
    return 'blocked'
  }
  if (
    lower.includes('network') ||
    lower.includes('reach') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('timeout')
  ) {
    return 'network'
  }
  return 'unknown'
}
