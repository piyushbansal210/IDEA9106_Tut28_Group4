import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Arena, Artist, Booking, SaleStatus, Show, TicketPlan, Tour, User, Waitlist } from './types'
import { arenas, artists, seedShows, seedTours, seedUsers } from './data'
import { STORAGE_PREFIX as P, usePersistentState } from './storage'
import { getShowStatus } from './sale'

export interface ToastItem {
  id: number
  message: string
}

type LoginTab = 'login' | 'signup'

interface LoginRequest {
  tab: LoginTab
  reason?: string
}

export interface RegisterInput {
  name: string
  email: string
  username: string
  password: string
}

interface Store {
  now: number
  user: User | null
  login: (identifier: string, password: string) => string | null
  register: (input: RegisterInput) => string | null
  logout: () => void
  loginRequest: LoginRequest | null
  openLogin: (tab?: LoginTab, reason?: string) => void
  closeLogin: () => void
  requireLogin: (reason: string, action: () => void) => void
  setPaymentSaved: (saved: boolean) => void

  tours: Tour[]
  shows: Show[]
  artistOf: (tour: Tour) => Artist
  arenaOf: (show: Show) => Arena
  tourOf: (show: Show) => Tour
  statusOf: (show: Show) => SaleStatus
  findShow: (id: string | undefined) => Show | undefined
  findTour: (id: string | undefined) => Tour | undefined

  search: string
  setSearch: (q: string) => void
  city: string
  setCity: (c: string) => void

  bookings: Booking[]
  book: (b: Omit<Booking, 'id' | 'createdAt' | 'username'>) => Booking | null
  waitlists: Waitlist[]
  joinWaitlist: (showId: string, place?: number) => Waitlist | null
  planFor: (showId: string) => TicketPlan | undefined
  planOf: (username: string, showId: string) => TicketPlan | undefined
  users: User[]
  savePlan: (plan: TicketPlan) => void

  toasts: ToastItem[]
  toast: (message: string) => void
  dismissToast: (id: number) => void

  updateTour: (id: string, patch: Partial<Tour>) => void
  updateShow: (id: string, patch: Partial<Show>) => void
  addShow: (show: Omit<Show, 'id'>) => void
  deleteShow: (id: string) => void
  resetDemo: () => void
}

const StoreContext = createContext<Store | null>(null)

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const [users, setUsers] = usePersistentState<User[]>(`${P}users`, seedUsers)
  const [session, setSession] = usePersistentState<string | null>(`${P}session`, null)
  const [bookings, setBookings] = usePersistentState<Booking[]>(`${P}bookings`, [])
  const [waitlists, setWaitlists] = usePersistentState<Waitlist[]>(`${P}waitlists`, [])
  const [plans, setPlans] = usePersistentState<Record<string, TicketPlan>>(`${P}plans`, {})
  // Admin edits are stored as patches on top of the seed data, so seeded sale times stay relative to now.
  const [tourEdits, setTourEdits] = usePersistentState<Record<string, Partial<Tour>>>(`${P}tour-edits`, {})
  const [showEdits, setShowEdits] = usePersistentState<Record<string, Partial<Show>>>(`${P}show-edits`, {})
  const [addedShows, setAddedShows] = usePersistentState<Show[]>(`${P}added-shows`, [])
  const [deletedShows, setDeletedShows] = usePersistentState<string[]>(`${P}deleted-shows`, [])

  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [loginRequest, setLoginRequest] = useState<LoginRequest | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const user = users.find((u) => u.username === session) ?? null
  // Refs let actions queued behind the login modal see the user who just logged in.
  const userRef = useRef(user)
  userRef.current = user
  const pendingAction = useRef<(() => void) | null>(null)

  const toast = useCallback((message: string) => {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), message }])
  }, [])
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const finishLogin = useCallback(
    (u: User) => {
      userRef.current = u
      setSession(u.username)
      setLoginRequest(null)
      toast(`You're logged in as ${u.name}.`)
      const action = pendingAction.current
      pendingAction.current = null
      action?.()
    },
    [setSession, toast],
  )

  const login = useCallback(
    (identifier: string, password: string) => {
      const id = identifier.trim().toLowerCase()
      const u = users.find((x) => (x.username.toLowerCase() === id || x.email.toLowerCase() === id) && x.password === password)
      if (!u) return 'That username/email and password don\'t match. Check them and try again.'
      finishLogin(u)
      return null
    },
    [users, finishLogin],
  )

  const register = useCallback(
    (input: RegisterInput) => {
      const username = input.username.trim()
      if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) return 'That username is taken. Try another.'
      if (users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) return 'An account with that email already exists. Log in instead.'
      const u: User = { username, password: input.password, role: 'customer', name: input.name.trim(), email: input.email.trim() }
      setUsers((list) => [...list, u])
      finishLogin(u)
      return null
    },
    [users, setUsers, finishLogin],
  )

  const tours = useMemo(() => seedTours.map((t) => ({ ...t, ...tourEdits[t.id] })), [tourEdits])
  const shows = useMemo(
    () =>
      [...seedShows, ...addedShows]
        .filter((s) => !deletedShows.includes(s.id))
        .map((s) => ({ ...s, ...showEdits[s.id] }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [addedShows, deletedShows, showEdits],
  )

  const openLogin = useCallback((tab: LoginTab = 'login', reason?: string) => setLoginRequest({ tab, reason }), [])

  const planKey = (showId: string) => `${userRef.current?.username ?? 'guest'}:${showId}`

  const store: Store = {
    now,
    user,
    login,
    register,
    logout: () => {
      setSession(null)
      toast('You\'ve logged out.')
    },
    loginRequest,
    openLogin,
    closeLogin: () => {
      pendingAction.current = null
      setLoginRequest(null)
    },
    requireLogin: (reason, action) => {
      if (userRef.current) return action()
      pendingAction.current = action
      setLoginRequest({ tab: 'login', reason })
    },
    setPaymentSaved: (saved) =>
      setUsers((list) => list.map((u) => (u.username === userRef.current?.username ? { ...u, paymentSaved: saved } : u))),

    tours,
    shows,
    artistOf: (tour) => artists.find((a) => a.id === tour.artistId)!,
    arenaOf: (show) => arenas.find((a) => a.id === show.arenaId) ?? arenas[0],
    tourOf: (show) => tours.find((t) => t.id === show.tourId)!,
    statusOf: (show) => getShowStatus(show, now),
    findShow: (id) => shows.find((s) => s.id === id),
    findTour: (id) => tours.find((t) => t.id === id),

    search,
    setSearch,
    city,
    setCity,

    bookings,
    book: (b) => {
      const u = userRef.current
      if (!u) return null
      const taken = new Set(bookings.filter((x) => x.showId === b.showId).flatMap((x) => x.seats))
      if (b.seats.some((s) => !s.includes(':GA') && taken.has(s))) return null
      const booking: Booking = { ...b, id: crypto.randomUUID(), username: u.username, createdAt: new Date().toISOString() }
      setBookings((list) => [...list, booking])
      return booking
    },
    waitlists,
    joinWaitlist: (showId, place) => {
      const u = userRef.current
      if (!u) return null
      const existing = waitlists.find((w) => w.showId === showId && w.username === u.username)
      if (existing) return existing
      const w: Waitlist = { id: crypto.randomUUID(), showId, username: u.username, place: place ?? 1500 + Math.floor(Math.random() * 4000), createdAt: new Date().toISOString() }
      setWaitlists((list) => [...list, w])
      return w
    },
    planFor: (showId) => plans[planKey(showId)] ?? plans[`guest:${showId}`],
    planOf: (username, showId) => plans[`${username}:${showId}`],
    users,
    savePlan: (plan) => setPlans((p) => ({ ...p, [planKey(plan.showId)]: plan })),

    toasts,
    toast,
    dismissToast,

    updateTour: (id, patch) => setTourEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } })),
    updateShow: (id, patch) => setShowEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } })),
    addShow: (show) => setAddedShows((list) => [...list, { ...show, id: crypto.randomUUID() }]),
    deleteShow: (id) => {
      setDeletedShows((list) => [...list, id])
      setBookings((list) => list.filter((b) => b.showId !== id))
    },
    resetDemo: () => {
      setTourEdits({})
      setShowEdits({})
      setAddedShows([])
      setDeletedShows([])
      setBookings([])
      setWaitlists([])
      setPlans({})
      toast('Demo data reset.')
    },
  }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
