import { useState, useEffect } from 'react'

export type SystemTheme = 'mac' | 'android'

const MOBILE_BREAKPOINT = 768

function getTheme(): SystemTheme {
  if (typeof window === 'undefined') return 'mac'
  return window.innerWidth < MOBILE_BREAKPOINT ? 'android' : 'mac'
}

export function useSystemTheme(): SystemTheme {
  const [theme, setTheme] = useState<SystemTheme>(getTheme)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'android' : 'mac')
    }

    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return theme
}
