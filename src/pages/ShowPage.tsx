import { useEffect, useState } from 'react'
import type { Store } from '../store'
import { api } from '../api'
import { arenas } from '../data'
import { dateParts, formatDate, money, SECTION_COLORS, seatLabel, seatsTotal, takenSeats, ticketsLeft } from '../seats'
import { authHref, href } from '../router'
import ArenaMap from '../components/ArenaMap'
import ArtistImage from '../components/ArtistImage'

const MAX_SEATS = 8

// Keep a guest's seat picks while they log in.
const pickKey = (id: string) => `tix:picks:${id}`
function loadPicks(id: string): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(pickKey(id)) ?? '[]')
  } catch {
    return []
  }
}
function savePicks(id: string, seats: string[]) {
  try {
    if (seats.length) sessionStorage.setItem(pickKey(id), JSON.stringify(seats))
    else sessionStorage.removeItem(pickKey(id))
  } catch {
    // ignore – picks just won't survive the login redirect
  }
}

export default function ShowPage({ store, id }: { store: Store; id: string }) {
  const concert = store.concerts.find((c) => c.id === id)
  const arena = concert && arenas.find((a) => a.id === concert.arenaId)
  const artist = concert && store.artists.find((a) => a.name === concert.artist)
  const taken = takenSeats(store.taken, id)

  const [selected, setSelected] = useState<string[]>(() => loadPicks(id).filter((s) => !taken.has(s)))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [booked, setBooked] = useState<{ seats: string[]; total: number } | null>(null)

  useEffect(() => savePicks(id, selected), [id, selected])

  if (!concert || !arena) {
    return (
      <div className="container block">
        <div className="empty">That show doesn't exist any more. <a href={href()}>See all shows</a></div>
      </div>
    )
  }

  const left = ticketsLeft(concert, store.taken)
  const limit = Math.min(MAX_SEATS, left)
  const total = seatsTotal(arena, selected)
  const d = dateParts(concert.date)

  const toggle = (seat: string) => {
    setError('')
    setSelected((prev) => (prev.includes(seat) ? prev.filter((s) => s !== seat) : prev.length >= limit ? prev : [...prev, seat]))
  }

  const book = async () => {
    if (!store.user) {
      // Seats are kept in sessionStorage, so they're still picked after logging in.
      window.location.hash = authHref('login', `shows/${concert.id}`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const booking = await api.book(concert.id, selected)
      setBooked({ seats: booking.seats, total: booking.total })
      setSelected([])
    } catch (err) {
      setError((err as Error).message)
      setSelected([])
    } finally {
      setBusy(false)
      store.reload()
    }
  }

  return (
    <>
      <section className="show-hero">
        {artist?.imageUrl && <div className="artist-hero-bg" style={{ backgroundImage: `url("${artist.imageUrl}")` }} aria-hidden />}
        <div className="container show-hero-inner">
          <ArtistImage name={concert.artist} src={artist?.imageUrl} className="show-portrait" />
          <div>
            <a href={href('artists', concert.artist)} className="back-link">← {concert.artist}</a>
            <h1>{concert.title}</h1>
            <p className="show-meta">
              <span>📅 {formatDate(concert.date)}</span>
              <span>📍 {arena.name}, {arena.city}</span>
              <span className={left === 0 ? 'hot' : ''}>🎟 {left === 0 ? 'Sold out' : `${left} of ${concert.ticketLimit} tickets left`}</span>
            </p>
            {concert.description && <p className="muted">{concert.description}</p>}
          </div>
        </div>
      </section>

      <section className="container booking">
        <div className="map-panel">
          <div className="panel-head">
            <h2>Choose your seats</h2>
            <span className="muted small">Tap a seat to select it · up to {MAX_SEATS} per booking</span>
          </div>
          <ArenaMap arena={arena} taken={taken} selected={selected} onToggle={toggle} canSelectMore={selected.length < limit} />
          <div className="map-legend">
            {arena.sections.map((s, i) => {
              const free = s.rows * s.seatsPerRow - [...taken].filter((t) => t.startsWith(`${s.id}:`)).length
              return (
                <div key={s.id} className="legend-item">
                  <i style={{ background: SECTION_COLORS[i % SECTION_COLORS.length] }} />
                  <div>
                    <strong>{s.name}</strong>
                    <span className="tiny muted">{money(s.price)} · {free} free</span>
                  </div>
                </div>
              )
            })}
            <div className="legend-item"><i className="sel" /><div><strong>Selected</strong></div></div>
            <div className="legend-item"><i className="tkn" /><div><strong>Taken</strong></div></div>
          </div>
        </div>

        <aside className="checkout">
          {booked ? (
            <div className="confirm">
              <div className="confirm-icon">✓</div>
              <h3>You're going!</h3>
              <p className="muted small">
                {booked.seats.length} ticket{booked.seats.length > 1 ? 's' : ''} for {concert.artist} on {d.day} {d.month}.
              </p>
              <p className="small">{booked.seats.map((s) => seatLabel(arena, s)).join(', ')}</p>
              <strong className="total">{money(booked.total)}</strong>
              <a href={href('tickets')} className="btn primary wide">View my tickets</a>
              <button className="btn ghost wide" onClick={() => setBooked(null)}>Book more seats</button>
            </div>
          ) : (
            <>
              <h3>Your seats</h3>
              {selected.length === 0 ? (
                <p className="muted small">{left === 0 ? 'This show is sold out.' : 'No seats selected yet. Pick some on the map.'}</p>
              ) : (
                <ul className="picked">
                  {selected.map((s) => {
                    const section = arena.sections.find((x) => x.id === s.split(':')[0])
                    return (
                      <li key={s}>
                        <span>{seatLabel(arena, s)}</span>
                        <span className="muted">{money(section?.price ?? 0)}</span>
                        <button className="x" aria-label={`Remove ${seatLabel(arena, s)}`} onClick={() => toggle(s)}>×</button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {selected.length >= limit && left > 0 && (
                <p className="tiny muted">You've reached the limit of {limit} seat{limit > 1 ? 's' : ''} for this booking.</p>
              )}
              <div className="total-row">
                <span>Total</span>
                <strong className="total">{money(total)}</strong>
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="btn primary wide" disabled={selected.length === 0 || busy} onClick={book}>
                {busy ? 'Booking…' : store.user ? `Book ${selected.length || ''} seat${selected.length === 1 ? '' : 's'}` : 'Log in to book'}
              </button>
              {!store.user && (
                <p className="tiny muted center">
                  New here? <a href={authHref('register', `shows/${concert.id}`)}>Create an account</a> – your seats will be kept.
                </p>
              )}
            </>
          )}
        </aside>
      </section>
    </>
  )
}
