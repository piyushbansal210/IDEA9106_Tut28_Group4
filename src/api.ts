import type { Artist, Booking, Concert, User } from './types'
import type { TakenSeats } from './seats'

const TOKEN_KEY = 'tix:token'

export class ApiError extends Error {
  status: number
  // The form field the server says is wrong, if any.
  field?: string
  constructor(status: number, message: string, field?: string) {
    super(message)
    this.status = status
    this.field = field
  }
}

export interface NewShow {
  arenaId: string
  date: string
  ticketLimit: number
}

export interface NewTour {
  artist: string
  title: string
  description: string
  shows: NewShow[]
  // Used only when the artist doesn't exist yet.
  genre?: string
  bio?: string
  imageUrl?: string
}

export interface Registration {
  name: string
  email: string
  username: string
  password: string
}

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage unavailable (e.g. private mode) – user will need to log in again after refresh
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.field)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

async function authenticate(path: string, body: object) {
  const { token, user } = await request<{ token: string; user: User }>('POST', path, body)
  setToken(token)
  return user
}

export const api = {
  login: (username: string, password: string) => authenticate('/auth/login', { username, password }),
  register: (details: Registration) => authenticate('/auth/register', details),
  logout: async () => {
    await request('POST', '/auth/logout').catch(() => {})
    setToken(null)
  },
  // Restore the session from a saved token, if it is still valid.
  me: async () => {
    if (!getToken()) return null
    try {
      return await request<User>('GET', '/auth/me')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setToken(null)
      return null
    }
  },

  artists: () => request<Artist[]>('GET', '/artists'),
  saveArtist: (artist: Artist) => request<Artist>('PUT', `/artists/${encodeURIComponent(artist.name)}`, artist),

  concerts: () => request<Concert[]>('GET', '/concerts'),
  taken: () => request<TakenSeats>('GET', '/concerts/taken'),
  addTour: (tour: NewTour) => request<Concert[]>('POST', '/concerts', tour),
  updateConcert: (concert: Concert) => request<Concert>('PUT', `/concerts/${concert.id}`, concert),
  deleteConcert: (id: string) => request<void>('DELETE', `/concerts/${id}`),

  bookings: () => request<Booking[]>('GET', '/bookings'),
  book: (concertId: string, seats: string[]) => request<Booking>('POST', '/bookings', { concertId, seats }),
}
