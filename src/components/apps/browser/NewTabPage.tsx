import { useState, useCallback, useRef } from 'react'
import { Search, Sparkles, ArrowRight, Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBrowserStore, type QuickLink, type Bookmark } from '@/store/useBrowserStore'

const SEARCH_ENGINES = [
  { id: 'google', name: 'Google', icon: 'G', color: 'bg-blue-500', prefix: 'https://www.google.com/search?q=' },
  { id: 'baidu', name: 'Baidu', icon: 'B', color: 'bg-blue-600', prefix: 'https://www.baidu.com/s?wd=' },
  { id: 'bing', name: 'Bing', icon: 'b', color: 'bg-cyan-600', prefix: 'https://www.bing.com/search?q=' },
  { id: 'github', name: 'GitHub', icon: '', color: 'bg-gray-800', prefix: 'https://github.com/search?q=' },
]

export function NewTabPage() {
  const navigateTo = useBrowserStore((s) => s.navigateTo)
  const quickLinks = useBrowserStore((s) => s.quickLinks)
  const bookmarks = useBrowserStore((s) => s.bookmarks)
  const removeBookmark = useBrowserStore((s) => s.removeBookmark)
  const searchEngine = useBrowserStore((s) => s.searchEngine)
  const setSearchEngine = useBrowserStore((s) => s.setSearchEngine)

  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!query.trim()) return

      const engine = SEARCH_ENGINES.find((e) => e.id === searchEngine)
      const q = query.trim()

      if (q.includes('.') && !q.includes(' ')) {
        navigateTo(q)
      } else if (engine) {
        navigateTo(`${engine.prefix}${encodeURIComponent(q)}`)
      }
    },
    [query, searchEngine, navigateTo]
  )

  const handleQuickLinkClick = useCallback(
    (link: QuickLink) => {
      navigateTo(link.url)
    },
    [navigateTo]
  )

  const handleBookmarkClick = useCallback(
    (bookmark: Bookmark) => {
      navigateTo(bookmark.url)
    },
    [navigateTo]
  )

  return (
    <div className="h-full w-full flex flex-col items-center overflow-y-auto bg-gradient-to-b from-white via-white to-gray-50/80">
      {/* Spacer */}
      <div className="flex-[2]" />

      {/* Search engine selector */}
      <div className="flex items-center gap-3 mb-6">
        {SEARCH_ENGINES.map((engine) => (
          <button
            key={engine.id}
            onClick={() => {
              setSearchEngine(engine.id)
              inputRef.current?.focus()
            }}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center',
              'text-[13px] font-semibold text-white transition-all duration-200',
              engine.color,
              searchEngine === engine.id
                ? 'ring-2 ring-offset-2 ring-mac-accent scale-110 shadow-md'
                : 'opacity-60 hover:opacity-90 hover:scale-105'
            )}
            title={engine.name}
          >
            {engine.icon}
          </button>
        ))}
      </div>

      {/* AI Super Search Box */}
      <form onSubmit={handleSubmit} className="w-full max-w-[540px] px-6 mb-8">
        <div
          className={cn(
            'relative flex items-center gap-3 h-[48px] px-4 rounded-2xl',
            'bg-white border transition-all duration-200',
            isFocused
              ? 'border-mac-accent/30 shadow-[0_2px_20px_rgba(0,0,0,0.08),0_0_0_3px_hsl(var(--mac-accent)/0.1)]'
              : 'border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)]',
            'hover:shadow-[0_2px_16px_rgba(0,0,0,0.07)]'
          )}
        >
          <span className="shrink-0 text-foreground/25">
            {query.trim() ? (
              <Search className="w-[18px] h-[18px]" />
            ) : (
              <Sparkles className="w-[18px] h-[18px] text-mac-accent/50" />
            )}
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search anything or enter a URL..."
            className={cn(
              'flex-1 bg-transparent text-[15px] outline-none',
              'text-foreground placeholder:text-foreground/25'
            )}
            autoFocus
          />

          {query.trim() && (
            <button
              type="submit"
              className={cn(
                'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center',
                'bg-mac-accent text-white',
                'hover:brightness-110 active:scale-95 transition-all duration-150'
              )}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-foreground/20 mt-2.5 tracking-wide">
          AI-powered search with {SEARCH_ENGINES.find((e) => e.id === searchEngine)?.name}
        </p>
      </form>

      {/* Quick Links Grid */}
      <div className="w-full max-w-[480px] px-6">
        <div className="grid grid-cols-4 gap-x-6 gap-y-4">
          {quickLinks.slice(0, 8).map((link) => (
            <button
              key={link.id}
              onClick={() => handleQuickLinkClick(link)}
              className="group flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  'w-[46px] h-[46px] rounded-xl flex items-center justify-center',
                  'text-white text-[17px] font-semibold',
                  'transition-all duration-200',
                  'group-hover:scale-110 group-hover:shadow-md group-active:scale-95',
                  link.color
                )}
              >
                {link.icon}
              </span>
              <span className="text-[11px] text-foreground/45 group-hover:text-foreground/70 transition-colors truncate max-w-[60px]">
                {link.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bookmarks Section */}
      {bookmarks.length > 0 && (
        <div className="w-full max-w-[480px] px-6 mt-8">
          <div className="flex items-center gap-1.5 mb-3">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-medium text-foreground/35 uppercase tracking-wider">
              Bookmarks
            </span>
          </div>
          <div className="grid grid-cols-4 gap-x-6 gap-y-4">
            {bookmarks.slice(0, 8).map((bm) => (
              <div key={bm.id} className="group relative flex flex-col items-center gap-1.5">
                <button
                  onClick={() => handleBookmarkClick(bm)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      'w-[46px] h-[46px] rounded-xl flex items-center justify-center',
                      'text-white text-[17px] font-semibold',
                      'transition-all duration-200',
                      'group-hover:scale-110 group-hover:shadow-md group-active:scale-95',
                      bm.color
                    )}
                  >
                    {bm.icon}
                  </span>
                  <span className="text-[11px] text-foreground/45 group-hover:text-foreground/70 transition-colors truncate max-w-[60px]">
                    {bm.title}
                  </span>
                </button>
                {/* Remove bookmark */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeBookmark(bm.url)
                  }}
                  className={cn(
                    'absolute -top-1 -right-1 w-4 h-4 rounded-full',
                    'bg-black/60 text-white flex items-center justify-center',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    'hover:bg-black/80'
                  )}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom spacer */}
      <div className="flex-[3]" />
    </div>
  )
}
