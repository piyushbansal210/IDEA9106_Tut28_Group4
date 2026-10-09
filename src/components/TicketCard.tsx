import type { Booking } from '../types'
import { useStore } from '../store'
import { formatShowDate, seatLabel, seeded } from '../seats'

// Decorative QR-style pattern (not scannable): this is a prototype.
function FakeQr({ seed }: { seed: string }) {
  const rand = seeded(seed)
  const cells = Array.from({ length: 81 }, () => rand() > 0.5)
  return (
    <svg className="qr" viewBox="0 0 9 9" role="img" aria-label="Ticket barcode (demo)">
      {cells.map((on, i) => on && <rect key={i} x={i % 9} y={Math.floor(i / 9)} width="1" height="1" fill="var(--ink)" />)}
    </svg>
  )
}

export default function TicketCard({ booking, seat }: { booking: Booking; seat: string }) {
  const store = useStore()
  const show = store.findShow(booking.showId)
  if (!show) return null
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  return (
    <article className="ticket">
      <div className="ticket-main">
        <span className="eyebrow">{artist.name}</span>
        <strong style={{ fontSize: 18 }}>{tour.name}</strong>
        <span className="small">{formatShowDate(show.date, arena.timeZone)}</span>
        <span className="small muted">{arena.name}, {arena.city}</span>
        <span className="chip" style={{ alignSelf: 'flex-start', marginTop: 4 }}>{seatLabel(arena, seat)}</span>
      </div>
      <div className="ticket-stub"><FakeQr seed={booking.id + seat} /></div>
    </article>
  )
}
