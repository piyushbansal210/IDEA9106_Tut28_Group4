import { useStore } from '../store'
import { money, seatLabel } from '../seats'
import type { Show } from '../types'

// Face-value resale tickets for a show. Only fans holding a waitlist place can buy them (first refusal).
export default function ResaleOffers({ show }: { show: Show }) {
  const store = useStore()
  const arena = store.arenaOf(show)
  const offers = store.resales.filter((r) => r.showId === show.id && r.seller !== store.user?.username)
  const waitlisted = store.waitlists.some((w) => w.showId === show.id && w.username === store.user?.username)
  if (!offers.length) return null

  return (
    <div className="card card-tight stack-sm" aria-live="polite">
      <strong>{offers.length} face-value resale {offers.length === 1 ? 'ticket' : 'tickets'} available</strong>
      {!waitlisted && <span className="small muted">Hold a waitlist place to get first refusal on these.</span>}
      {waitlisted && (
        <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {offers.map((r) => (
            <li key={r.id} className="row between">
              <span className="small">{seatLabel(arena, r.seat)} · <b>{money(r.price)}</b></span>
              <button className="btn btn-primary btn-sm" onClick={() => {
                const b = store.buyResale(r.id)
                store.toast(b ? `Bought at face value. ${seatLabel(arena, r.seat)} is in My tickets.` : 'Sorry, someone else just bought that one.')
              }}>Buy for {money(r.price)}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
