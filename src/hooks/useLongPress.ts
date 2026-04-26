import { useRef, useCallback } from 'react'

interface UseLongPressOptions {
  delay?: number
  onLongPress: (e: React.TouchEvent) => void
}

export function useLongPress({ delay = 500, onLongPress }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const movedRef = useRef(false)
  const firedRef = useRef(false)

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      movedRef.current = false
      firedRef.current = false
      timerRef.current = setTimeout(() => {
        firedRef.current = true
        onLongPress(e)
      }, delay)
    },
    [delay, onLongPress],
  )

  const onTouchMove = useCallback(() => {
    if (timerRef.current && !movedRef.current) {
      movedRef.current = true
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      // Prevent click if long press fired
      if (firedRef.current) {
        e.preventDefault()
      }
    },
    [],
  )

  return { onTouchStart, onTouchMove, onTouchEnd }
}
