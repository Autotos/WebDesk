import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ================================================================
   Types
   ================================================================ */

export type AccentColorId = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'red'

export interface WallpaperOption {
  id: string
  label: string
  type: 'image' | 'gradient'
  value: string
}

export type FontFamilyId = 'system' | 'inter' | 'roboto' | 'jetbrains-mono' | 'noto-sans-sc'

export interface AccentColorDef {
  id: AccentColorId
  label: string
  hex: string
  macAccentHSL: string
  androidPrimaryHSL: string
}

export interface FontOption {
  id: FontFamilyId
  label: string
  value: string
  googleFont?: string
}

/* ================================================================
   Constants
   ================================================================ */

export const ACCENT_COLORS: AccentColorDef[] = [
  { id: 'blue', label: '蓝色', hex: '#007AFF', macAccentHSL: '211 100% 50%', androidPrimaryHSL: '217 89% 51%' },
  { id: 'purple', label: '紫色', hex: '#8B5CF6', macAccentHSL: '258 90% 66%', androidPrimaryHSL: '258 90% 66%' },
  { id: 'green', label: '绿色', hex: '#22C55E', macAccentHSL: '142 71% 45%', androidPrimaryHSL: '142 71% 45%' },
  { id: 'orange', label: '橙色', hex: '#F97316', macAccentHSL: '25 95% 53%', androidPrimaryHSL: '25 95% 53%' },
  { id: 'pink', label: '粉色', hex: '#EC4899', macAccentHSL: '330 81% 60%', androidPrimaryHSL: '330 81% 60%' },
  { id: 'red', label: '红色', hex: '#EF4444', macAccentHSL: '0 84% 60%', androidPrimaryHSL: '0 84% 60%' },
]

export const MAC_WALLPAPERS: WallpaperOption[] = [
  { id: 'mac-default', label: '默认', type: 'image', value: '/images/mac-wallpaper.png' },
  { id: 'mac-gradient-ocean', label: '海洋', type: 'gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'mac-gradient-sunset', label: '日落', type: 'gradient', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'mac-gradient-aurora', label: '极光', type: 'gradient', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'mac-gradient-forest', label: '森林', type: 'gradient', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'mac-gradient-midnight', label: '午夜', type: 'gradient', value: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%)' },
  { id: 'mac-gradient-warm', label: '暖沙', type: 'gradient', value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
]

export const ANDROID_WALLPAPERS: WallpaperOption[] = [
  { id: 'android-default', label: '默认', type: 'image', value: '/images/android-wallpaper.png' },
  { id: 'android-gradient-ocean', label: '海洋', type: 'gradient', value: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)' },
  { id: 'android-gradient-sunset', label: '日落', type: 'gradient', value: 'linear-gradient(180deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'android-gradient-aurora', label: '极光', type: 'gradient', value: 'linear-gradient(180deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'android-gradient-forest', label: '森林', type: 'gradient', value: 'linear-gradient(180deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'android-gradient-midnight', label: '午夜', type: 'gradient', value: 'linear-gradient(180deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%)' },
  { id: 'android-gradient-warm', label: '暖沙', type: 'gradient', value: 'linear-gradient(180deg, #f6d365 0%, #fda085 100%)' },
]

export const FONT_OPTIONS: FontOption[] = [
  { id: 'system', label: '系统默认', value: '' },
  { id: 'inter', label: 'Inter', value: "'Inter', sans-serif", googleFont: 'Inter:wght@400;500;600;700' },
  { id: 'roboto', label: 'Roboto', value: "'Roboto', sans-serif", googleFont: 'Roboto:wght@400;500;700' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', value: "'JetBrains Mono', monospace", googleFont: 'JetBrains+Mono:wght@400;500;700' },
  { id: 'noto-sans-sc', label: 'Noto Sans SC', value: "'Noto Sans SC', sans-serif", googleFont: 'Noto+Sans+SC:wght@400;500;700' },
]

/* ================================================================
   Helpers
   ================================================================ */

export function getWallpaperStyle(value: string): React.CSSProperties {
  if (value.startsWith('linear-gradient') || value.startsWith('radial-gradient')) {
    return { background: value }
  }
  return { backgroundImage: `url(${value})` }
}

/* ================================================================
   Defaults
   ================================================================ */

const DEFAULTS = {
  accentColor: 'blue' as AccentColorId,
  macWallpaper: '/images/mac-wallpaper.png',
  androidWallpaper: '/images/android-wallpaper.png',
  fontFamily: 'system' as FontFamilyId,
  fontSize: 14,
}

/* ================================================================
   Store
   ================================================================ */

interface SettingsState {
  accentColor: AccentColorId
  macWallpaper: string
  androidWallpaper: string
  fontFamily: FontFamilyId
  fontSize: number

  setAccentColor: (color: AccentColorId) => void
  setMacWallpaper: (value: string) => void
  setAndroidWallpaper: (value: string) => void
  setFontFamily: (family: FontFamilyId) => void
  setFontSize: (size: number) => void
  resetAll: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setAccentColor: (color) => set({ accentColor: color }),
      setMacWallpaper: (value) => set({ macWallpaper: value }),
      setAndroidWallpaper: (value) => set({ androidWallpaper: value }),
      setFontFamily: (family) => set({ fontFamily: family }),
      setFontSize: (size) => set({ fontSize: Math.max(12, Math.min(20, size)) }),
      resetAll: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'webdesk-settings',
      partialize: (state) => ({
        accentColor: state.accentColor,
        macWallpaper: state.macWallpaper,
        androidWallpaper: state.androidWallpaper,
        fontFamily: state.fontFamily,
        fontSize: state.fontSize,
      }),
    },
  ),
)
