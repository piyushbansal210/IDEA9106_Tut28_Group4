import { useEffect, useState } from 'react'

// useState that is saved to localStorage so data survives a page refresh.
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage unavailable (e.g. private mode) – keep in-memory state only
    }
  }, [key, value])

  return [value, setValue] as const
}
