import { useEffect } from 'react'
import {
  useSettingsStore,
  ACCENT_COLORS,
  FONT_OPTIONS,
} from '@/store/useSettingsStore'

const SYSTEM_FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', Roboto, system-ui, sans-serif"

/** Loaded Google Font family names — prevents duplicate <link> injection. */
const loadedFonts = new Set<string>()

function loadGoogleFont(googleFont: string) {
  if (loadedFonts.has(googleFont)) return
  loadedFonts.add(googleFont)

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${googleFont}&display=swap`
  document.head.appendChild(link)
}

function applyAccentColor(accentColorId: string) {
  const def = ACCENT_COLORS.find((c) => c.id === accentColorId)
  if (!def) return
  const root = document.documentElement.style
  root.setProperty('--mac-accent', def.macAccentHSL)
  root.setProperty('--android-primary', def.androidPrimaryHSL)
}

function applyFont(fontFamilyId: string) {
  const def = FONT_OPTIONS.find((f) => f.id === fontFamilyId)
  if (!def) return

  if (def.googleFont) {
    loadGoogleFont(def.googleFont)
  }

  document.body.style.fontFamily = def.value || SYSTEM_FONT_STACK
}

function applyFontSize(size: number) {
  document.body.style.fontSize = `${size}px`
}

function applyAll() {
  const { accentColor, fontFamily, fontSize } = useSettingsStore.getState()
  applyAccentColor(accentColor)
  applyFont(fontFamily)
  applyFontSize(fontSize)
}

/**
 * Root-level hook — call once in App.tsx.
 * Subscribes to settings store and applies CSS side-effects to the DOM.
 */
export function useSettingsEffect() {
  useEffect(() => {
    // Apply current values immediately on mount
    applyAll()

    // Subscribe to future changes
    const unsub = useSettingsStore.subscribe((state, prevState) => {
      if (state.accentColor !== prevState.accentColor) {
        applyAccentColor(state.accentColor)
      }
      if (state.fontFamily !== prevState.fontFamily) {
        applyFont(state.fontFamily)
      }
      if (state.fontSize !== prevState.fontSize) {
        applyFontSize(state.fontSize)
      }
    })

    return unsub
  }, [])
}
