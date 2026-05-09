import { useCallback, useEffect, useState } from 'react'

const KEY = 'vibecheck:pins'

export function usePinnedEvents() {
  const [pinned, setPinned] = useState<string[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) ?? '[]')
      if (Array.isArray(stored)) {
        setPinned(stored.filter((v): v is string => typeof v === 'string'))
      }
    } catch {
      setPinned([])
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(KEY, JSON.stringify(pinned))
  }, [pinned])

  const isPinned = useCallback((uid: string) => pinned.includes(uid), [pinned])

  const togglePin = useCallback((uid: string) => {
    setPinned((prev) => (prev.includes(uid) ? prev.filter((v) => v !== uid) : [...prev, uid]))
  }, [])

  const clear = useCallback(() => setPinned([]), [])

  return { pinned, isPinned, togglePin, clear }
}
