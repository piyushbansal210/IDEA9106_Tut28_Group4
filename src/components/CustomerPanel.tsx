import { useState } from 'react'
import type { Arena, Booking, Concert, User } from '../types'
import { capacity, formatDate, minPrice, seatLabel, seatsTotal, takenSeats } from '../seats'
import SeatMap from './SeatMap'

const MAX_SEATS = 8

interface Props {
  user: User
  concerts: Concert[]
  arenas: Arena[]
  bookings: Booking[]
  onBook: (concertId: string, seats: string[], total: number) => boolean
}

export default function CustomerPanel({ user, concerts, arenas, bookings, onBook }: Props) {
  const [concertId, setConcertId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState('')

  const concert = concerts.find((c) => c.id === concertId)
  const arena = concert && arenas.find((a) => a.id === concert.arenaId)
  const myBookings = bookings.filter((b) => b.username === user.username)

  const openConcert = (id: string) => {
    setConcertId(id)
    setSelected([])
    setMessage('')
  }

  const toggleSeat = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length >= MAX_SEATS ? prev : [...prev, id],
    )
  }

  if (concert && arena) {
    const total = seatsTotal(arena, selected)
    const confirm = () => {
      if (!onBook(concert.id, selected, total)) {
        setMessage('Sorry, one of those seats was just taken. Please pick again.')
        setSelected([])
        return
      }
      setConcertId(null)
      setMessage(`Booked ${selected.length} seat(s) for ${concert.artist}. Enjoy the show!`)
    }

    return (
      <section>
        <button className="secondary" onClick={() => setConcertId(null)}>← Back to concerts</button>
        <h2>{concert.artist} – {concert.title}</h2>
        <p className="muted">
          {formatDate(concert.date)} · {arena.name}, {arena.city}
        </p>
        {message && <p className="error">{message}</p>}
        <p className="small">Pick up to {MAX_SEATS} seats.</p>
        <SeatMap arena={arena} taken={takenSeats(bookings, concert.id)} selected={selected} onToggle={toggleSeat} />
        <div className="card summary">
          <strong>Your seats</strong>
          <span>{selected.length ? selected.map((id) => seatLabel(arena, id)).join(', ') : 'None selected'}</span>
          <span>Total: ${total}</span>
          <button disabled={selected.length === 0} onClick={confirm}>Confirm booking</button>
        </div>
      </section>
    )
  }

  return (
    <>
      <section>
        <h2>Upcoming concerts</h2>
        {message && <p className="success">{message}</p>}
        <ul className="list">
          {concerts.map((c) => {
            const a = arenas.find((x) => x.id === c.arenaId)
            if (!a) return null
            const left = capacity(a) - takenSeats(bookings, c.id).size
            return (
              <li key={c.id} className="card">
                <strong>{c.artist} – {c.title}</strong>
                <span className="muted">{formatDate(c.date)} · {a.name}, {a.city}</span>
                <span>{c.description}</span>
                <span className="small">From ${minPrice(a)} · {left} seats left</span>
                <button disabled={left === 0} onClick={() => openConcert(c.id)}>
                  {left === 0 ? 'Sold out' : 'Choose seats'}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2>My bookings</h2>
        {myBookings.length === 0 ? (
          <p className="muted">No bookings yet.</p>
        ) : (
          <ul className="list">
            {myBookings.map((b) => {
              const c = concerts.find((x) => x.id === b.concertId)
              const a = arenas.find((x) => x.id === c?.arenaId)
              return (
                <li key={b.id} className="card">
                  <strong>{c ? `${c.artist} – ${c.title}` : 'Cancelled concert'}</strong>
                  {c && a && <span className="muted">{formatDate(c.date)} · {a.name}</span>}
                  <span>{b.seats.map((id) => seatLabel(a, id)).join(', ')}</span>
                  <span className="small">Paid ${b.total}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
