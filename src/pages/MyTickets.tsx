import type { Store } from '../store'
import { arenas } from '../data'
import { dateParts, money, seatLabel } from '../seats'
import { authHref, href } from '../router'
import ArtistImage from '../components/ArtistImage'

export default function MyTickets({ store }: { store: Store }) {
  if (!store.user) {
    return (
      <div className="container block">
        <div className="empty">
          <a href={authHref('login', 'tickets')}>Log in</a> to see your tickets.
        </div>
      </div>
    )
  }

  const bookings = store.bookings.filter((b) => b.username === store.user!.username)
  const seatCount = bookings.reduce((n, b) => n + b.seats.length, 0)
  const spent = bookings.reduce((n, b) => n + b.total, 0)

  return (
    <section className="container block">
      <div className="block-head">
        <div>
          <span className="eyebrow">Hi {store.user.name.split(' ')[0]}</span>
          <h1>My tickets</h1>
        </div>
        {bookings.length > 0 && (
          <span className="muted small">
            {bookings.length} booking{bookings.length > 1 ? 's' : ''} · {seatCount} seat{seatCount > 1 ? 's' : ''} · {money(spent)}
          </span>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="empty">
          <p>You haven't booked anything yet.</p>
          <a href={href()} className="btn primary">Find a show</a>
        </div>
      ) : (
        <div className="tickets">
          {bookings.map((b) => {
            const c = store.concerts.find((x) => x.id === b.concertId)
            const a = arenas.find((x) => x.id === c?.arenaId)
            const artist = store.artists.find((x) => x.name === c?.artist)
            const d = c && dateParts(c.date)
            return (
              <article key={b.id} className="ticket">
                <ArtistImage name={c?.artist ?? '?'} src={artist?.imageUrl} className="ticket-img" />
                <div className="ticket-main">
                  <span className="tag">{c ? `${d!.weekday} ${d!.day} ${d!.month} ${d!.year}` : 'Cancelled'}</span>
                  <h3>{c ? c.artist : 'Cancelled show'}</h3>
                  {c && <span className="muted small">{c.title}</span>}
                  {a && <span className="small">📍 {a.name}, {a.city}</span>}
                  <div className="seat-chips">
                    {b.seats.map((s) => <span key={s} className="seat-chip">{seatLabel(a, s)}</span>)}
                  </div>
                </div>
                <div className="ticket-stub">
                  <span className="tiny muted">ADMIT</span>
                  <strong className="admit">{b.seats.length}</strong>
                  <span className="barcode" aria-hidden />
                  <span className="tiny muted mono">#{b.id.slice(0, 8).toUpperCase()}</span>
                  <span className="small">{money(b.total)}</span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
