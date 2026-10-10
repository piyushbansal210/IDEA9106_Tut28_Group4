import { useSyncExternalStore } from 'react'
import type { ArtistId } from './types'
import { readStored, writeStored } from './storage'
import { contrast, themes, themeTokens } from './color'

export { contrast, themes, themeTokens }
export type { Theme } from './color'

export const artistThemes: Record<ArtistId, string> = {
  'taylor-swift': 'earth-red',
  bts: 'honey-ginger',
  'charlie-puth': 'orange-rust',
}

interface ThemeState {
  chosen: string
  matchArtist: boolean
  artistOverride: string | null
}

const KEY = 'quickseat:theme'
// Read by the inline script in index.html so the saved colour is painted before React loads.
const TOKENS_KEY = 'quickseat:theme-tokens'

let state: ThemeState = { ...readStored(KEY, { chosen: 'noir', matchArtist: false }), artistOverride: null }
const listeners = new Set<() => void>()

export const activeThemeId = (s: ThemeState = state) => (s.matchArtist && s.artistOverride) || s.chosen

function apply() {
  const theme = themes.find((t) => t.id === activeThemeId()) ?? themes[0]
  const tokens = themeTokens(theme.swatch)
  const root = document.documentElement
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v))
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens['--nav-bg'])
  writeStored(TOKENS_KEY, tokens)
  if (import.meta.env.DEV) {
    console.debug(`[theme] ${theme.name}: nav text contrast ${contrast(tokens['--nav-bg'], tokens['--nav-fg']).toFixed(2)}:1`)
  }
}

function update(patch: Partial<ThemeState>) {
  state = { ...state, ...patch }
  if ('chosen' in patch || 'matchArtist' in patch) writeStored(KEY, { chosen: state.chosen, matchArtist: state.matchArtist })
  apply()
  listeners.forEach((l) => l())
}

export const setTheme = (id: string) => update({ chosen: id })
export const setMatchArtist = (on: boolean) => update({ matchArtist: on })
export const setArtistOverride = (artistId: ArtistId | null) => {
  const next = artistId ? artistThemes[artistId] : null
  if (next !== state.artistOverride) update({ artistOverride: next })
}

export function useTheme() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

apply()
