import { useEffect, useState } from 'react'

// useState that is saved to localStorage (or sessionStorage) so data survives a page refresh.
// `initial` may be a function, computed only when nothing is stored yet (used for one-off migrations and seeds).
export function usePersistentState<T>(key: string, initial: T | (() => T), session = false) {
  const [value, setValue] = useState<T>(() => {
    const stored = readStored<T | undefined>(key, undefined, session)
    return stored !== undefined ? stored : initial instanceof Function ? initial() : initial
  })

  useEffect(() => {
    writeStored(key, value, session)
  }, [key, value, session])

  return [value, setValue] as const
}

export function readStored<T>(key: string, fallback: T, session = false): T {
  try {
    const raw = (session ? sessionStorage : localStorage).getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStored(key: string, value: unknown, session = false) {
  try {
    ;(session ? sessionStorage : localStorage).setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (e.g. private mode) – keep in-memory state only
  }
}

export const STORAGE_PREFIX = 'quickseat:v2:'
