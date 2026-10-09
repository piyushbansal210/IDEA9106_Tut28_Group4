import { useSyncExternalStore } from 'react'

// Tiny hash router: "#/tour/eras-encore?demo=1" → { path: '/tour/eras-encore', parts: [...], query }.
export interface Route {
  path: string
  parts: string[]
  query: URLSearchParams
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

const getHash = () => window.location.hash

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/'
  const [path, search = ''] = raw.split('?')
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(search) }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash)
  return parseRoute(hash)
}

export function navigate(path: string, { keepQuery = false } = {}) {
  const current = parseRoute(window.location.hash)
  const query = keepQuery && current.query.toString() ? `?${current.query}` : ''
  window.location.hash = path + query
  window.scrollTo({ top: 0 })
}

export const href = (path: string) => `#${path}`

// Demo controls are enabled with ?demo=1 either in the page URL or inside the hash.
export const isDemo = () =>
  new URLSearchParams(window.location.search).get('demo') === '1' || parseRoute(window.location.hash).query.get('demo') === '1'
