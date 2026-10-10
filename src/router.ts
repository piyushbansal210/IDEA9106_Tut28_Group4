import { useEffect, useState } from 'react'

// Tiny hash router: "#/artists/BTS" -> ['artists', 'BTS'].
const parse = () =>
  window.location.hash
    .replace(/^#\/?/, '')
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const onChange = () => {
      setRoute(parse())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export const href = (...parts: string[]) => `#/${parts.map(encodeURIComponent).join('/')}`

export const navigate = (...parts: string[]) => {
  window.location.hash = href(...parts)
}

// Query string after the route, e.g. "#/login?next=/shows/c1".
export const routeQuery = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '')

// Link to the login/register page that returns to `next` (e.g. "shows/c1") afterwards.
export const authHref = (mode: 'login' | 'register', next?: string) =>
  `${href(mode)}${next ? `?next=${encodeURIComponent(next)}` : ''}`
