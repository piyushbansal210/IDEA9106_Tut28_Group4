import { useStore } from '../store'
import { href } from '../router'
import { formatNumber, formatShowDate } from '../seats'
import TicketCard from '../components/TicketCard'
import { LoginGate, useDocumentTitle } from './shared'

function Tickets() {
  const store = useStore()
  useDocumentTitle('My tickets')
  const mine = store.bookings.filter((b) => b.username === store.user?.username)
  const withShow = mine.map((b) => ({ b, show: store.findShow(b.showId) })).filter((x) => x.show)
  const upcoming = withShow.filter((x) => Date.parse(x.show!.date) >= store.now)
  const past = withShow.filter((x) => Date.parse(x.show!.date) < store.now)
  const waitlists = store.waitlists.filter((w) => w.username === store.user?.username)

  const group = (title: string, list: typeof withShow) => (
    <section className="stack" aria-labelledby={`h-${title}`}>
      <h2 id={`h-${title}`} style={{ fontSize: 24 }}>{title}</h2>
      <div className="ticket-list">
        {list.flatMap(({ b }) => b.seats.map((seat) => <TicketCard key={b.id + seat} booking={b} seat={seat} />))}
      </div>
    </section>
  )

  return (
    <div className="container page stack-lg">
      <h1>My tickets</h1>
      {!withShow.length && !waitlists.length && (
        <div className="empty stack-sm">
          <strong>No tickets yet.</strong>
          <a className="link-btn" href={href('/')}>Browse tours →</a>
        </div>
      )}
      {upcoming.length > 0 && group('Upcoming', upcoming)}
      {past.length > 0 && group('Past', past)}
      {waitlists.length > 0 && (
        <section className="stack" aria-labelledby="h-wait">
          <h2 id="h-wait" style={{ fontSize: 24 }}>Waitlists</h2>
          <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {waitlists.map((w) => {
              const show = store.findShow(w.showId)
              if (!show) return null
              const tour = store.tourOf(show)
              const arena = store.arenaOf(show)
              return (
                <li key={w.id} className="card card-tight row between">
                  <div className="stack-sm" style={{ gap: 2 }}>
                    <strong>{store.artistOf(tour).name}: {tour.name}</strong>
                    <span className="small muted">{arena.city} · {formatShowDate(show.date, arena.timeZone)}</span>
                  </div>
                  <span className="badge badge-info">Waitlist place {formatNumber(w.place)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

export default function MyTickets() {
  return (
    <LoginGate reason="Log in to see your tickets.">
      <Tickets />
    </LoginGate>
  )
}
