import { useState } from 'react'
import { Check, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSystemTheme } from '@/hooks/useSystemTheme'
import {
  useSettingsStore,
  ACCENT_COLORS,
  MAC_WALLPAPERS,
  ANDROID_WALLPAPERS,
  FONT_OPTIONS,
  getWallpaperStyle,
  type AccentColorId,
  type FontFamilyId,
} from '@/store/useSettingsStore'

/* ================================================================
   Section: Accent Color
   ================================================================ */

function AccentColorPicker() {
  const accentColor = useSettingsStore((s) => s.accentColor)
  const setAccentColor = useSettingsStore((s) => s.setAccentColor)

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-foreground mb-3">强调色</h3>
      <div className="flex flex-wrap gap-3">
        {ACCENT_COLORS.map((c) => (
          <button
            key={c.id}
            title={c.label}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-all',
              'ring-offset-2 ring-offset-background',
              accentColor === c.id ? 'ring-2' : 'hover:scale-110',
            )}
            style={{
              backgroundColor: c.hex,
              ...(accentColor === c.id ? { '--tw-ring-color': c.hex } as React.CSSProperties : {}),
            }}
            onClick={() => setAccentColor(c.id as AccentColorId)}
          >
            {accentColor === c.id && <Check className="h-4 w-4 text-white drop-shadow" />}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ================================================================
   Section: Wallpaper Gallery
   ================================================================ */

function WallpaperGallery() {
  const theme = useSystemTheme()
  const [activeTab, setActiveTab] = useState<'mac' | 'android'>(theme === 'mac' ? 'mac' : 'android')
  const macWallpaper = useSettingsStore((s) => s.macWallpaper)
  const androidWallpaper = useSettingsStore((s) => s.androidWallpaper)
  const setMacWallpaper = useSettingsStore((s) => s.setMacWallpaper)
  const setAndroidWallpaper = useSettingsStore((s) => s.setAndroidWallpaper)

  const wallpapers = activeTab === 'mac' ? MAC_WALLPAPERS : ANDROID_WALLPAPERS
  const currentValue = activeTab === 'mac' ? macWallpaper : androidWallpaper
  const setter = activeTab === 'mac' ? setMacWallpaper : setAndroidWallpaper

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-foreground mb-3">壁纸</h3>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 p-0.5 bg-muted rounded-lg w-fit">
        {(['mac', 'android'] as const).map((tab) => (
          <button
            key={tab}
            className={cn(
              'px-3 py-1 text-[12px] rounded-md transition-all',
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'mac' ? 'Mac 壁纸' : 'Android 壁纸'}
          </button>
        ))}
      </div>

      {/* Wallpaper grid */}
      <div className="grid grid-cols-3 gap-3">
        {wallpapers.map((wp) => {
          const isSelected = currentValue === wp.value
          return (
            <button
              key={wp.id}
              className={cn(
                'relative rounded-lg overflow-hidden transition-all',
                'aspect-[16/10] bg-muted',
                'ring-offset-2 ring-offset-background',
                isSelected
                  ? 'ring-2 ring-mac-accent'
                  : 'hover:ring-1 hover:ring-mac-border',
              )}
              onClick={() => setter(wp.value)}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={getWallpaperStyle(wp.value)}
              />
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check className="h-5 w-5 text-white drop-shadow" />
                </div>
              )}
              <span className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-black/40 px-1.5 py-0.5 truncate">
                {wp.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Wallpaper Store placeholder */}
      <div className="mt-4 p-4 rounded-lg border border-dashed border-mac-border bg-muted/50 flex items-center gap-3">
        <Store className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <p className="text-[12px] font-medium text-foreground">壁纸商城</p>
          <p className="text-[11px] text-muted-foreground">即将推出 — 从商城下载更多精美壁纸</p>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   Section: Font Settings
   ================================================================ */

function FontSettings() {
  const fontFamily = useSettingsStore((s) => s.fontFamily)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const setFontFamily = useSettingsStore((s) => s.setFontFamily)
  const setFontSize = useSettingsStore((s) => s.setFontSize)

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-foreground mb-3">字体</h3>

      {/* Font family */}
      <label className="block text-[12px] text-muted-foreground mb-1.5">字体族</label>
      <div className="grid gap-1.5 mb-4">
        {FONT_OPTIONS.map((f) => (
          <button
            key={f.id}
            className={cn(
              'flex items-center px-3 py-2 rounded-lg text-[13px] transition-colors text-left',
              fontFamily === f.id
                ? 'bg-mac-accent/15 text-mac-accent font-medium'
                : 'hover:bg-accent text-foreground',
            )}
            onClick={() => setFontFamily(f.id as FontFamilyId)}
          >
            <span className="flex-1" style={f.value ? { fontFamily: f.value } : undefined}>
              {f.label}
            </span>
            {fontFamily === f.id && <Check className="h-3.5 w-3.5 shrink-0" />}
          </button>
        ))}
      </div>

      {/* Font size */}
      <label className="block text-[12px] text-muted-foreground mb-1.5">
        字体大小: {fontSize}px
      </label>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-muted-foreground">12</span>
        <input
          type="range"
          min={12}
          max={20}
          step={1}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="flex-1 h-1.5 accent-[hsl(var(--mac-accent))] cursor-pointer"
        />
        <span className="text-[11px] text-muted-foreground">20</span>
      </div>
    </div>
  )
}

/* ================================================================
   Main Export
   ================================================================ */

export function PersonalizationSection() {
  return (
    <div className="space-y-8">
      <h2 className="text-[15px] font-semibold text-foreground">个性化</h2>
      <AccentColorPicker />
      <WallpaperGallery />
      <FontSettings />
    </div>
  )
}
