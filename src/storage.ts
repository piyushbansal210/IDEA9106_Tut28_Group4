import { useEffect, useState } from 'react'

// useState that is saved to localStorage (or sessionStorage) so data survives a page refresh.
export function usePersistentState<T>(key: string, initial: T, session = false) {
  const [value, setValue] = useState<T>(() => readStored(key, initial, session))

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
