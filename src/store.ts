import { useCallback, useEffect, useState } from 'react'
import type { Artist, Booking, Concert, User } from './types'
import type { TakenSeats } from './seats'
import { api } from './api'

// All data the pages need, loaded from the API.
export function useStore() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [artists, setArtists] = useState<Artist[]>([])
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [taken, setTaken] = useState<TakenSeats>({})
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [a, c, t] = await Promise.all([api.artists(), api.concerts(), api.taken()])
      setArtists(a)
      setConcerts(c)
      setTaken(t)
      setError('')
    } catch (err) {
      setError(`Could not reach the server: ${(err as Error).message}`)
    }
  }, [])

  const refreshBookings = useCallback(async () => {
    setBookings(await api.bookings().catch(() => []))
  }, [])

  useEffect(() => {
    Promise.all([api.me().then(setUser), refresh()]).then(() => setReady(true))
  }, [refresh])

  useEffect(() => {
    if (user) refreshBookings()
    else setBookings([])
  }, [user, refreshBookings])

  const reload = useCallback(() => Promise.all([refresh(), refreshBookings()]), [refresh, refreshBookings])

  const logout = async () => {
    await api.logout()
    setUser(null)
  }

  return { user, setUser, logout, ready, artists, concerts, taken, bookings, error, reload }
}

export type Store = ReturnType<typeof useStore>
