import { useState, type FormEvent } from 'react'
import type { Booking } from '../types'
import { useStore } from '../store'
import { formatShowDate, money, seatLabel, seeded } from '../seats'
import Modal from './Modal'

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

function TransferModal({ booking, seat, label, onClose }: { booking: Booking; seat: string; label: string; onClose: () => void }) {
  const store = useStore()
  const [to, setTo] = useState('')
  const [error, setError] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const err = store.transferSeat(booking.id, seat, to)
    if (err) return setError(err)
    store.toast(`Ticket sent. ${label} is now in ${to.trim()}'s account.`)
    onClose()
  }
  return (
    <Modal title="Transfer this ticket" onClose={onClose}>
      <form className="stack" style={{ marginTop: 8 }} onSubmit={submit}>
        <p className="muted small">{label}. Your friend gets the ticket in their QuickSeat account straight away, and it leaves yours. Transfers are free.</p>
        <label className="field">
          Friend's username or email
          <input data-autofocus value={to} onChange={(e) => { setTo(e.target.value); setError('') }} aria-invalid={!!error} aria-describedby={error ? 'transfer-err' : undefined} autoComplete="off" />
        </label>
        {error && <p id="transfer-err" className="error-text" role="alert">{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!to.trim()}>Send ticket</button>
        </div>
      </form>
    </Modal>
  )
}

function ResaleModal({ booking, seat, label, onClose }: { booking: Booking; seat: string; label: string; onClose: () => void }) {
  const store = useStore()
  const price = booking.total / booking.seats.length
  return (
    <Modal title="Resell at face value" onClose={onClose}>
      <div className="stack" style={{ marginTop: 8 }}>
        <p>{label}</p>
        <div className="card card-tight surface stack-sm">
          <div className="summary-line"><span>Resale price</span><b>{money(price)}</b></div>
          <span className="small muted">Exactly what you paid. QuickSeat doesn't allow mark-ups, so nobody profits from a sold-out show.</span>
        </div>
        <p className="small muted">Fans on this show's waitlist get first refusal. You keep the ticket until someone buys it, and you can take it off resale at any time.</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" data-autofocus onClick={() => { store.listForResale(booking.id, seat); store.toast('Listed for resale. Waitlisted fans have been offered it first.'); onClose() }}>List for {money(price)}</button>
        </div>
      </div>
    </Modal>
  )
}

const sourceLabel = (b: Booking, name: (u: string) => string) =>
  b.source?.kind === 'transfer' ? `Sent to you by ${name(b.source.from)}` : b.source?.kind === 'resale' ? 'Bought on face-value resale' : null

// `manage` adds transfer and resale actions (My tickets, upcoming shows only).
export default function TicketCard({ booking, seat, manage }: { booking: Booking; seat: string; manage?: boolean }) {
  const store = useStore()
  const [open, setOpen] = useState<'transfer' | 'resale' | null>(null)
  const show = store.findShow(booking.showId)
  if (!show) return null
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  const label = seatLabel(arena, seat)
  const listing = store.resales.find((r) => r.bookingId === booking.id && r.seat === seat)
  const from = sourceLabel(booking, (u) => store.users.find((x) => x.username === u)?.name ?? u)

  return (
    <article className="ticket">
      <div className="ticket-main">
        <span className="eyebrow">{artist.name}</span>
        <strong style={{ fontSize: 18 }}>{tour.name}</strong>
        <span className="small">{formatShowDate(show.date, arena.timeZone)}</span>
        <span className="small muted">{arena.name}, {arena.city}</span>
        <span className="chip" style={{ alignSelf: 'flex-start', marginTop: 4 }}>{label}</span>
        {from && <span className="tiny muted">{from}</span>}
        {manage && (
          <div className="ticket-actions">
            {listing ? (
              <>
                <span className="badge badge-info">Listed for resale · {money(listing.price)}</span>
                <button className="link-btn small" onClick={() => { store.cancelResale(listing.id); store.toast('Taken off resale. The ticket is yours again.') }}>Take off resale</button>
              </>
            ) : (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => setOpen('transfer')}>Transfer</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setOpen('resale')} aria-label="Resell at face value"><span className="hide-narrow">Resell at face value</span><span className="show-narrow">Resell</span></button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="ticket-stub"><FakeQr seed={booking.id + seat} /></div>
      {open === 'transfer' && <TransferModal booking={booking} seat={seat} label={label} onClose={() => setOpen(null)} />}
      {open === 'resale' && <ResaleModal booking={booking} seat={seat} label={label} onClose={() => setOpen(null)} />}
    </article>
  )
}
