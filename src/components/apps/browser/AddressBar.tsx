import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Lock,
  Unlock,
  Globe,
  Search,
  Star,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBrowserStore } from '@/store/useBrowserStore'

export function AddressBar() {
  const tabs = useBrowserStore((s) => s.tabs)
  const activeTabId = useBrowserStore((s) => s.activeTabId)
  const navigateTo = useBrowserStore((s) => s.navigateTo)
  const goBack = useBrowserStore((s) => s.goBack)
  const goForward = useBrowserStore((s) => s.goForward)
  const reload = useBrowserStore((s) => s.reload)
  const bookmarks = useBrowserStore((s) => s.bookmarks)
  const addBookmark = useBrowserStore((s) => s.addBookmark)
  const removeBookmark = useBrowserStore((s) => s.removeBookmark)

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isNewTab = activeTab?.url === 'newtab'
  const isLoading = activeTab?.isLoading ?? false
  const canGoBack = activeTab ? activeTab.historyIndex > 0 : false
  const canGoForward = activeTab
    ? activeTab.historyIndex < activeTab.history.length - 1
    : false

  // HTTPS detection
  const isHttps = activeTab?.url.startsWith('https://') ?? false
  const isHttp = activeTab?.url.startsWith('http://') && !isHttps

  // Bookmark state
  const isCurrentBookmarked =
    activeTab && activeTab.url !== 'newtab'
      ? bookmarks.some((b) => b.url === activeTab.url)
      : false

  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const displayUrl = activeTab?.url === 'newtab' ? '' : (activeTab?.url ?? '')

  const handleFocus = useCallback(() => {
    setIsEditing(true)
    setInputValue(displayUrl)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [displayUrl])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (inputValue.trim()) {
        navigateTo(inputValue.trim())
      }
      setIsEditing(false)
      inputRef.current?.blur()
    },
    [inputValue, navigateTo]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditing(false)
        setInputValue(displayUrl)
        inputRef.current?.blur()
      }
    },
    [displayUrl]
  )

  // Sync display URL when active tab changes
  useEffect(() => {
    if (!isEditing) {
      setInputValue(displayUrl)
    }
  }, [displayUrl, isEditing])

  const handleToggleBookmark = useCallback(() => {
    if (!activeTab || activeTab.url === 'newtab') return

    if (isCurrentBookmarked) {
      removeBookmark(activeTab.url)
    } else {
      let icon = 'W'
      try {
        icon = new URL(activeTab.url).hostname.replace('www.', '').charAt(0).toUpperCase()
      } catch { /* ignore */ }

      addBookmark({
        title: activeTab.title,
        url: activeTab.url,
        icon,
        color: 'bg-mac-accent',
      })
    }
  }, [activeTab, isCurrentBookmarked, addBookmark, removeBookmark])

  /** Show a nice display URL: strip protocol for display */
  const prettyUrl = (() => {
    if (!displayUrl) return ''
    try {
      const u = new URL(displayUrl)
      const host = u.hostname
      const path = u.pathname === '/' ? '' : u.pathname
      const search = u.search
      return `${host}${path}${search}`
    } catch {
      return displayUrl
    }
  })()

  return (
    <div className="flex items-center gap-1 h-[34px] px-2 os-chrome">
      {/* Navigation buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        <NavButton
          icon={ChevronLeft}
          disabled={!canGoBack}
          onClick={goBack}
          title="Back"
        />
        <NavButton
          icon={ChevronRight}
          disabled={!canGoForward}
          onClick={goForward}
          title="Forward"
        />
        {isLoading ? (
          <NavButton
            icon={X}
            onClick={() => {
              if (activeTabId) {
                useBrowserStore
                  .getState()
                  .updateTab(activeTabId, { isLoading: false, loadProgress: 0 })
              }
            }}
            title="Stop"
          />
        ) : (
          <NavButton icon={RotateCw} onClick={reload} title="Reload" />
        )}
      </div>

      {/* URL Bar */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'flex-1 flex items-center gap-2 h-[26px] px-2.5 rounded-md',
          'bg-black/[0.04] border border-transparent',
          'transition-all duration-150',
          isEditing &&
            'bg-white border-mac-accent/40 shadow-[0_0_0_2px_hsl(var(--mac-accent)/0.15)]'
        )}
      >
        {/* Left icon — security indicator */}
        <span className="shrink-0 flex items-center justify-center w-3.5">
          {isEditing ? (
            <Search className="w-3 h-3 text-foreground/30" />
          ) : isNewTab ? (
            <Search className="w-3 h-3 text-foreground/30" />
          ) : isLoading ? (
            <Loader2 className="w-3 h-3 text-mac-accent animate-spin" />
          ) : isHttps ? (
            <Lock className="w-3 h-3 text-green-500/70" />
          ) : isHttp ? (
            <Unlock className="w-3 h-3 text-foreground/30" />
          ) : (
            <Globe className="w-3 h-3 text-foreground/30" />
          )}
        </span>

        {/* Input */}
        <input
          ref={inputRef}
          data-browser-address-bar
          type="text"
          value={isEditing ? inputValue : prettyUrl}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search or enter website name"
          className={cn(
            'flex-1 bg-transparent text-[12px] outline-none min-w-0',
            'text-foreground/70 placeholder:text-foreground/30',
            isEditing && 'text-foreground',
            !isEditing && !isNewTab && 'text-center'
          )}
          spellCheck={false}
        />

        {/* Bookmark star (inside URL bar, right side) */}
        {!isNewTab && !isEditing && (
          <button
            type="button"
            onClick={handleToggleBookmark}
            className="shrink-0 flex items-center justify-center w-4 h-4"
            title={isCurrentBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
          >
            <Star
              className={cn(
                'w-3 h-3 transition-colors',
                isCurrentBookmarked
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-foreground/25 hover:text-foreground/50'
              )}
            />
          </button>
        )}
      </form>
    </div>
  )
}

function NavButton({
  icon: Icon,
  disabled,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  onClick?: () => void
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-md',
        'transition-colors duration-100',
        disabled
          ? 'text-foreground/15 cursor-default'
          : 'text-foreground/50 hover:text-foreground/80 hover:bg-black/[0.06] active:bg-black/[0.10]'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}
