import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Arena, Artist, Booking, Group, ResaleListing, SaleStatus, Show, TicketPlan, Tour, User, Waitlist } from './types'
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

  // Returns an error message, or null when the seat has moved to the other fan.
  transferSeat: (bookingId: string, seat: string, to: string) => string | null
  resales: ResaleListing[]
  listForResale: (bookingId: string, seat: string) => void
  cancelResale: (id: string) => void
  buyResale: (id: string) => Booking | null

  groups: Group[]
  groupFor: (showId: string, username?: string) => Group | undefined
  createGroup: (showId: string) => Group | null
  joinGroup: (id: string) => void
  leaveGroup: (id: string, username?: string) => void
  sendGroupTickets: (id: string, bookingId: string) => number

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

  const [storedUsers, setUsers] = usePersistentState<User[]>(`${P}users`, seedUsers)
  // Demo accounts added after a browser first saved its user list still need to be there.
  const users = useMemo(
    () => [...storedUsers, ...seedUsers.filter((s) => !storedUsers.some((u) => u.username === s.username))],
    [storedUsers],
  )
  const [session, setSession] = usePersistentState<string | null>(`${P}session`, null)
  const [bookings, setBookings] = usePersistentState<Booking[]>(`${P}bookings`, [])
  const [waitlists, setWaitlists] = usePersistentState<Waitlist[]>(`${P}waitlists`, [])
  const [plans, setPlans] = usePersistentState<Record<string, TicketPlan>>(`${P}plans`, {})
  const [resales, setResales] = usePersistentState<ResaleListing[]>(`${P}resales`, [])
  const [groups, setGroups] = usePersistentState<Group[]>(`${P}groups`, [])
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
      setUsers([...users, u])
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

  // Moves one seat out of a booking into a new booking for `to`, at the price originally paid for it.
  const moveSeat = (list: Booking[], bookingId: string, seat: string, to: string, source: Booking['source']) => {
    const from = list.find((b) => b.id === bookingId)
    if (!from || !from.seats.includes(seat)) return null
    const price = from.total / from.seats.length
    const moved: Booking = { id: crypto.randomUUID(), showId: from.showId, username: to, sectionId: from.sectionId, seats: [seat], total: price, createdAt: new Date().toISOString(), source }
    const rest = from.seats.filter((s) => s !== seat)
    const next = list.flatMap((b) => (b.id !== bookingId ? [b] : rest.length ? [{ ...b, seats: rest, total: b.total - price }] : []))
    return { next: [...next, moved], moved }
  }

  const findUser = (identifier: string) => {
    const id = identifier.trim().toLowerCase()
    return users.find((u) => u.username.toLowerCase() === id || u.email.toLowerCase() === id)
  }

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
      setUsers(users.map((u) => (u.username === userRef.current?.username ? { ...u, paymentSaved: saved } : u))),

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

    transferSeat: (bookingId, seat, to) => {
      const u = userRef.current
      const recipient = findUser(to)
      if (!u) return 'Log in to transfer tickets.'
      if (!recipient) return 'No QuickSeat account uses that username or email. Ask your friend to sign up first.'
      if (recipient.username === u.username) return 'That\'s your own account. Enter your friend\'s username or email.'
      if (resales.some((r) => r.bookingId === bookingId && r.seat === seat)) return 'This ticket is listed for resale. Take it off resale first.'
      const result = moveSeat(bookings, bookingId, seat, recipient.username, { kind: 'transfer', from: u.username })
      if (!result) return 'That ticket is no longer in your account.'
      setBookings(result.next)
      return null
    },
    resales,
    listForResale: (bookingId, seat) => {
      const b = bookings.find((x) => x.id === bookingId)
      if (!b || resales.some((r) => r.bookingId === bookingId && r.seat === seat)) return
      // Face value only: the price is what the seller paid, and there's no way to change it.
      setResales((list) => [...list, { id: crypto.randomUUID(), showId: b.showId, bookingId, seat, seller: b.username, price: b.total / b.seats.length, listedAt: new Date().toISOString() }])
    },
    cancelResale: (id) => setResales((list) => list.filter((r) => r.id !== id)),
    buyResale: (id) => {
      const u = userRef.current
      const listing = resales.find((r) => r.id === id)
      if (!u || !listing || listing.seller === u.username) return null
      const result = moveSeat(bookings, listing.bookingId, listing.seat, u.username, { kind: 'resale', from: listing.seller })
      if (!result) return null
      setBookings(result.next)
      setResales((list) => list.filter((r) => r.id !== id))
      return result.moved
    },

    groups,
    groupFor: (showId, username = userRef.current?.username) =>
      groups.find((g) => g.showId === showId && !!username && g.members.includes(username)),
    createGroup: (showId) => {
      const u = userRef.current
      if (!u) return null
      const existing = groups.find((g) => g.showId === showId && g.members.includes(u.username))
      if (existing) return existing
      const g: Group = { id: crypto.randomUUID().slice(0, 8), showId, leader: u.username, members: [u.username], createdAt: new Date().toISOString() }
      setGroups((list) => [...list, g])
      return g
    },
    joinGroup: (id) => {
      const u = userRef.current
      if (!u) return
      setGroups((list) => list.map((g) => (g.id === id && !g.members.includes(u.username) && g.members.length < 8 ? { ...g, members: [...g.members, u.username] } : g)))
    },
    leaveGroup: (id, username = userRef.current?.username) =>
      setGroups((list) =>
        list.flatMap((g) => {
          if (g.id !== id || !username) return [g]
          // The group ends when its leader leaves; nobody else can queue on its behalf.
          if (g.leader === username) return []
          return [{ ...g, members: g.members.filter((m) => m !== username) }]
        }),
      ),
    sendGroupTickets: (id, bookingId) => {
      const g = groups.find((x) => x.id === id)
      const booking = bookings.find((b) => b.id === bookingId)
      if (!g || !booking) return 0
      const friends = g.members.filter((m) => m !== booking.username)
      // The leader keeps the first seat; each friend gets the next one.
      let list = bookings
      let sent = 0
      friends.forEach((friend, i) => {
        const seat = booking.seats[i + 1]
        const result = seat && moveSeat(list, bookingId, seat, friend, { kind: 'transfer', from: booking.username })
        if (result) {
          list = result.next
          sent++
        }
      })
      setBookings(list)
      setGroups((all) => all.map((x) => (x.id === id ? { ...x, ticketsSent: true } : x)))
      return sent
    },

    toasts,
    toast,
    dismissToast,

    updateTour: (id, patch) => setTourEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } })),
    updateShow: (id, patch) => setShowEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } })),
    addShow: (show) => setAddedShows((list) => [...list, { ...show, id: crypto.randomUUID() }]),
    deleteShow: (id) => {
      setDeletedShows((list) => [...list, id])
      setBookings((list) => list.filter((b) => b.showId !== id))
      setResales((list) => list.filter((r) => r.showId !== id))
      setGroups((list) => list.filter((g) => g.showId !== id))
    },
    resetDemo: () => {
      setTourEdits({})
      setShowEdits({})
      setAddedShows([])
      setDeletedShows([])
      setBookings([])
      setWaitlists([])
      setPlans({})
      setResales([])
      setGroups([])
      toast('Demo data reset.')
    },
  }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
