import type { Booking, Concert, User } from './types'
import { arenas, seedConcerts, seedUsers } from './data'
import { usePersistentState } from './storage'
import { takenSeats } from './seats'
import Login from './components/Login'
import CustomerPanel from './components/CustomerPanel'
import AdminPanel from './components/AdminPanel'

export default function App() {
  const [users, setUsers] = usePersistentState<User[]>('tix:users', seedUsers)
  const [concerts, setConcerts] = usePersistentState<Concert[]>('tix:concerts', seedConcerts)
  const [bookings, setBookings] = usePersistentState<Booking[]>('tix:bookings', [])
  const [session, setSession] = usePersistentState<string | null>('tix:session', null)

  const user = users.find((u) => u.username === session) ?? null

  const register = (newUser: User) => {
    setUsers([...users, newUser])
    setSession(newUser.username)
  }

  const book = (concertId: string, seats: string[], total: number) => {
    if (!user) return false
    const taken = takenSeats(bookings, concertId)
    if (seats.some((s) => taken.has(s))) return false
    setBookings([
      ...bookings,
      { id: crypto.randomUUID(), concertId, username: user.username, seats, total, createdAt: new Date().toISOString() },
    ])
    return true
  }

  const sortedConcerts = [...concerts].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <main>
      <header>
        <div>
          <h1>QuickSeat</h1>
          <p className="muted small">No queues. Pick your seats and book in seconds.</p>
        </div>
        {user && (
          <div className="user">
            <span className="small">
              {user.username} <span className="badge">{user.role}</span>
            </span>
            <button className="secondary" onClick={() => setSession(null)}>Log out</button>
          </div>
        )}
      </header>

      {!user ? (
        <Login users={users} onLogin={(u) => setSession(u.username)} onRegister={register} />
      ) : user.role === 'admin' ? (
        <AdminPanel
          concerts={sortedConcerts}
          arenas={arenas}
          bookings={bookings}
          onAdd={(c) => setConcerts([...concerts, { ...c, id: crypto.randomUUID() }])}
          onUpdate={(c) => setConcerts(concerts.map((x) => (x.id === c.id ? c : x)))}
          onDelete={(id) => {
            setConcerts(concerts.filter((c) => c.id !== id))
            setBookings(bookings.filter((b) => b.concertId !== id))
          }}
        />
      ) : (
        <CustomerPanel user={user} concerts={sortedConcerts} arenas={arenas} bookings={bookings} onBook={book} />
      )}
    </main>
  )
}
