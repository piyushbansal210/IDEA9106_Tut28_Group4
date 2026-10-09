import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { href, navigate, useRoute } from '../router'
import { showPath } from '../sale'
import { BOOKING_FEE, bestAdjacent, money, seatLabel, simulatedTaken, takenSeats } from '../seats'
import { useRecordPlayerHost } from '../audio'
import { leaveQueue, peekQueue } from '../queue/simulator'
import type { Section, Show } from '../types'
import ArenaMap, { SeatGrid } from '../components/ArenaMap'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import { formatCountdown } from '../components/Countdown'
import { LoginGate, ShowHeader, useDocumentTitle } from './shared'
import NotFound from './NotFound'

const CHECKOUT_SECONDS = 8 * 60

function Checkout({ show }: { show: Show }) {
  const store = useStore()
  const route = useRoute()
  const arena = store.arenaOf(show)
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const plan = store.planFor(show.id)
  const queue = peekQueue(show.id)?.getState()
  const queued = show.hasQueue

  useDocumentTitle('Your turn')
  useRecordPlayerHost(artist.id, 'focus')

  const lostIds = new Set(queue?.sections.filter((s) => s.status === 'sold-out' || s.status === 'cant-seat-together').map((s) => s.sectionId))
  const maxPrice = plan?.maxPricePerTicket ?? Infinity
  const [quantity, setQuantity] = useState(plan?.quantity ?? 2)
  const firstChoice = route.query.get('section') ?? plan?.rankedSectionIds.find((id) => !lostIds.has(id)) ?? null
  const [sectionId, setSectionId] = useState<string | null>(firstChoice)
  const section = arena.sections.find((s) => s.id === sectionId) ?? null

  const taken = useMemo(() => {
    if (!section) return new Set<string>()
    const sim = simulatedTaken(show.id, section, queued ? 0.6 : 0.3)
    takenSeats(store.bookings, show.id).forEach((id) => sim.add(id))
    return sim
  }, [section, show.id, queued, store.bookings])

  const [selected, setSelected] = useState<string[]>([])
  // Pre-pick the best seats together that match the plan, so the user only has to confirm.
  useEffect(() => {
    if (!section) return setSelected([])
    if (section.kind === 'standing') return setSelected(Array.from({ length: quantity }, (_, i) => `${section.id}:GA${i + 1}`))
    setSelected(bestAdjacent(section, taken, quantity))
  }, [section, taken, quantity])

  const [secondsLeft, setSecondsLeft] = useState(CHECKOUT_SECONDS)
  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const expired = secondsLeft === 0
  const [error, setError] = useState('')

  const blocked = queued && queue?.phase !== 'your-turn'
  if (blocked) {
    return (
      <div className="container page narrow">
        <div className="empty stack" style={{ alignItems: 'center' }}>
          <h1 style={{ fontSize: 28 }}>This show sells through the queue</h1>
          <p className="muted">Join the queue and we'll bring you here when it's your turn.</p>
          <a className="btn btn-primary" href={href(showPath(show, 'queue'))}>Go to the queue</a>
        </div>
      </div>
    )
  }

  const toggleSeat = (id: string) => {
    setError('')
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= quantity ? [...prev.slice(1), id] : [...prev, id]))
  }

  const ticketPrice = section?.price ?? 0
  const subtotal = ticketPrice * selected.length
  const fees = BOOKING_FEE * selected.length
  const total = subtotal + fees
  const ready = section && selected.length === quantity

  const pay = () => {
    if (!section) return
    const booking = store.book({ showId: show.id, sectionId: section.id, seats: selected, total })
    if (!booking) {
      setError('Sorry, one of those seats was just taken. We\'ve picked the next best seats for you.')
      setSelected(bestAdjacent(section, new Set([...taken, ...selected]), quantity))
      return
    }
    leaveQueue(show.id)
    navigate(`${showPath(show, 'outcome')}?b=${booking.id}`)
  }

  const low = secondsLeft <= 120

  return (
    <div className="container page stack-lg">
      <ShowHeader
        show={show}
        right={
          <div className="stack-sm" style={{ alignItems: 'flex-end', gap: 0 }}>
            <span className="small muted">Seats held for</span>
            <span className={`timer ${low ? 'low' : ''}`} role="timer" aria-label={`${Math.ceil(secondsLeft / 60)} minutes left to check out`}>{formatCountdown(secondsLeft * 1000)}</span>
            <span className="visually-hidden" aria-live="assertive">{secondsLeft === 60 ? 'One minute left to check out.' : ''}</span>
          </div>
        }
      />

      <div className="stack-sm">
        <span className="eyebrow">{queued ? 'Your turn' : 'Choose your seats'}</span>
        <h1 style={{ fontSize: 32 }}>{queued ? 'It\'s your turn' : 'Pick your seats'}</h1>
        <p className="muted">
          {section
            ? <>We've picked the best {quantity === 1 ? 'seat' : `${quantity} seats together`} in <b>{section.name}</b>{queued ? ', your plan\'s best option still available' : ''}. Tap other seats to change them.</>
            : 'Choose a section on the map to see seats.'}
        </p>
      </div>

      <div className="seats-layout">
        <div className="stack-lg">
          <ArenaMap
            arena={arena}
            label="Sections"
            rankedIds={plan?.rankedSectionIds ?? []}
            activeId={sectionId ?? undefined}
            stateOf={(s: Section) => (lostIds.has(s.id) ? 'gone' : 'available')}
            disabledReason={(s) => (lostIds.has(s.id) ? 'Sold out' : s.price > maxPrice ? `Over your ${money(maxPrice)} budget` : null)}
            onSelect={(s) => setSectionId(s.id)}
          />
          {section && section.kind === 'seated' && (
            <section className="card stack" aria-labelledby="seat-h">
              <div className="row between">
                <h2 id="seat-h" style={{ fontSize: 20 }}>{section.name}: seats</h2>
                <span className="small muted">Row A is closest to the stage</span>
              </div>
              <SeatGrid section={section} taken={taken} selected={selected} onToggle={toggleSeat} />
              <div className="legend" aria-hidden="true">
                <span><i /> available</span>
                <span><i className="l-picked" /> your seats</span>
                <span><i className="l-gone" /> taken</span>
              </div>
            </section>
          )}
          {section && section.kind === 'standing' && (
            <div className="card surface row">
              <Icon name="standing" size={28} />
              <span><b>{section.name} is general admission standing.</b> No seat numbers: your tickets get you in to the {section.name} area.</span>
            </div>
          )}
        </div>

        <aside className="card stack" aria-labelledby="summary-h">
          <h2 id="summary-h" style={{ fontSize: 20 }}>Order summary</h2>
          {!plan && (
            <div className="row">
              <span className="small">Tickets</span>
              <button className="icon-btn" style={{ border: '1.5px solid var(--border)', width: 36, height: 36 }} aria-label="One fewer ticket" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}>−</button>
              <output className="num" aria-live="polite"><b>{quantity}</b></output>
              <button className="icon-btn" style={{ border: '1.5px solid var(--border)', width: 36, height: 36 }} aria-label="One more ticket" disabled={quantity >= 8} onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
          )}
          {selected.length ? (
            <ul className="stack-sm small" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {selected.map((id) => <li key={id} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><Icon name="ticket" size={16} /> {seatLabel(arena, id)}</li>)}
            </ul>
          ) : (
            <p className="small muted">No seats selected.</p>
          )}
          {selected.length > 0 && selected.length < quantity && <p className="small" style={{ color: 'var(--warning-ink)' }}>Pick {quantity - selected.length} more {quantity - selected.length === 1 ? 'seat' : 'seats'}.</p>}
          <div className="stack-sm">
            <div className="summary-line"><span>{selected.length} × {money(ticketPrice)}</span><span>{money(subtotal)}</span></div>
            <div className="summary-line muted"><span>Booking fee ({money(BOOKING_FEE)} each)</span><span>{money(fees)}</span></div>
            <div className="summary-line summary-total"><span>Total</span><span>{money(total)}</span></div>
          </div>
          <p className="tiny muted">The price you see is the price you pay. No surprise fees at the end.</p>
          <div className="row small muted"><Icon name="card" size={18} /> {store.user?.paymentSaved ? 'Saved card •••• 4242' : 'Demo card •••• 4242 (no real payment)'}</div>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="btn btn-primary btn-lg btn-block" disabled={!ready || expired} onClick={pay}>Pay {money(total)}</button>
        </aside>
      </div>

      {expired && (
        <Modal title="Time's up">
          <div className="stack" style={{ marginTop: 8 }}>
            <p>We held your seats for 8 minutes, and they've now been released to the next person.</p>
            <a className="btn btn-primary" href={href(`/tour/${tour.id}`)} onClick={() => leaveQueue(show.id)}>Back to the tour</a>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function SeatsPage({ showId }: { showId: string }) {
  const { findShow } = useStore()
  const show = findShow(showId)
  if (!show) return <NotFound />
  return (
    <LoginGate reason="Log in to buy tickets.">
      <Checkout show={show} />
    </LoginGate>
  )
}
