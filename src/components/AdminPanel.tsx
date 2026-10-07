import { useState, type FormEvent } from 'react'
import type { Arena, Booking, Concert } from '../types'
import { capacity, formatDate, takenSeats } from '../seats'

interface Props {
  concerts: Concert[]
  arenas: Arena[]
  bookings: Booking[]
  onAdd: (concert: Omit<Concert, 'id'>) => void
  onUpdate: (concert: Concert) => void
  onDelete: (id: string) => void
}

const emptyForm = { artist: '', title: '', description: '', arenaId: '', date: '' }

export default function AdminPanel({ concerts, arenas, bookings, onAdd, onUpdate, onDelete }: Props) {
  const [form, setForm] = useState({ ...emptyForm, arenaId: arenas[0]?.id ?? '' })
  const artists = [...new Set(concerts.map((c) => c.artist))]

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onAdd({ ...form, artist: form.artist.trim(), title: form.title.trim(), description: form.description.trim() })
    setForm({ ...emptyForm, arenaId: form.arenaId })
  }

  return (
    <>
      <section>
        <h2>Add a concert</h2>
        <form className="card" onSubmit={handleSubmit}>
          <label>
            Artist
            <input
              list="artists"
              value={form.artist}
              onChange={(e) => setForm({ ...form, artist: e.target.value })}
              required
            />
            <datalist id="artists">
              {artists.map((a) => <option key={a} value={a} />)}
            </datalist>
          </label>
          <label>
            Tour / show title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label>
            Arena
            <select value={form.arenaId} onChange={(e) => setForm({ ...form, arenaId: e.target.value })}>
              {arenas.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </label>
          <button type="submit">Add concert</button>
        </form>
      </section>

      <section>
        <h2>Concerts</h2>
        <ul className="list">
          {concerts.map((c) => {
            const arena = arenas.find((a) => a.id === c.arenaId)
            const sold = takenSeats(bookings, c.id).size
            const revenue = bookings.filter((b) => b.concertId === c.id).reduce((sum, b) => sum + b.total, 0)
            return (
              <li key={c.id} className="card">
                <strong>{c.artist} – {c.title}</strong>
                <span className="muted">{formatDate(c.date)}</span>
                <label>
                  Arena
                  <select
                    value={c.arenaId}
                    disabled={sold > 0}
                    onChange={(e) => onUpdate({ ...c, arenaId: e.target.value })}
                  >
                    {arenas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
                    ))}
                  </select>
                </label>
                {sold > 0 && <span className="small muted">Arena is locked because tickets have been sold.</span>}
                <span className="small">
                  Sold {sold} / {arena ? capacity(arena) : 0} · Revenue ${revenue}
                </span>
                <button
                  className="danger"
                  onClick={() => confirm(`Delete ${c.artist} – ${c.title}?`) && onDelete(c.id)}
                >
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2>All bookings</h2>
        {bookings.length === 0 ? (
          <p className="muted">No bookings yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Customer</th><th>Concert</th><th>Seats</th><th>Total</th></tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const c = concerts.find((x) => x.id === b.concertId)
                return (
                  <tr key={b.id}>
                    <td>{b.username}</td>
                    <td>{c ? c.artist : '—'}</td>
                    <td>{b.seats.length}</td>
                    <td>${b.total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
