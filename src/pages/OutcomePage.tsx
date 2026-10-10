import { useState } from 'react'
import { useStore } from '../store'
import { href, useRoute } from '../router'
import { formatNumber, formatShowDate, money, seatLabel } from '../seats'
import { useRecordPlayerHost } from '../audio'
import { peekQueue } from '../queue/simulator'
import type { Booking, Show } from '../types'
import ArenaMap from '../components/ArenaMap'
import StoryTimeline from '../components/StoryTimeline'
import Icon from '../components/Icon'
import TicketCard from '../components/TicketCard'
import { LoginGate, ShowHeader, useDocumentTitle } from './shared'
import NotFound from './NotFound'

function icsFor(show: Show, title: string, location: string) {
  const start = new Date(show.date)
  const end = new Date(start.getTime() + 3 * 3_600_000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//QuickSeat//EN', 'BEGIN:VEVENT',
    `UID:${show.id}@quickseat.test`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`, `LOCATION:${location}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}

function Success({ show, booking }: { show: Show; booking: Booking }) {
  const store = useStore()
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  useRecordPlayerHost(artist.id)

  const download = () => {
    const blob = new Blob([icsFor(show, `${artist.name}: ${tour.name}`, `${arena.name}, ${arena.city}`)], { type: 'text/calendar' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${tour.id}-${show.id}.ics`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const share = () => {
    const msg = `I got us tickets! ${artist.name}: ${tour.name}, ${formatShowDate(show.date)} at ${arena.name}. ${booking.seats.map((s) => seatLabel(arena, s)).join('; ')}.`
    void navigator.clipboard?.writeText(msg).catch(() => {})
    store.toast('Message copied. Paste it into your group chat.')
  }

  return (
    <div className="container page stack-lg">
      <ShowHeader show={show} />
      <section className="stack">
        <span className="badge badge-good" style={{ alignSelf: 'flex-start' }}><Icon name="check" /> Booking confirmed</span>
        <h1>You're going!</h1>
        <p className="muted">{booking.seats.length} {booking.seats.length === 1 ? 'ticket' : 'tickets'} · {money(booking.total)} paid. We've also emailed them to {store.user?.email}.</p>
        <div className="row">
          <button className="btn btn-primary" onClick={download}><Icon name="calendar" size={18} /> Add to calendar</button>
          <button className="btn btn-secondary" onClick={share}><Icon name="share" size={18} /> Share with your group</button>
          <a className="btn btn-ghost" href={href('/tickets')}>View my tickets</a>
        </div>
      </section>
      <div className="ticket-list">
        {booking.seats.map((seat) => <TicketCard key={seat} booking={booking} seat={seat} />)}
      </div>
      <StoryTimeline artist={artist} eyebrow="Keep exploring" />
    </div>
  )
}

function SoldOut({ show, left }: { show: Show; left?: boolean }) {
  const store = useStore()
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  const queue = peekQueue(show.id)?.getState()
  const plan = store.planFor(show.id)
  const existing = store.waitlists.find((w) => w.showId === show.id && w.username === store.user?.username)
  const [place] = useState(() => existing?.place ?? 3000 + Math.floor(Math.random() * 2500))
  const [alerted, setAlerted] = useState(false)
  useRecordPlayerHost(artist.id)

  const ranked = plan?.rankedSectionIds ?? []
  const sectionsGone = queue?.sections.length ?? ranked.length
  const summary = left
    ? 'You left the queue before your turn.'
    : queue
      ? `You stayed after all ${sectionsGone === 1 ? 'of your section' : `${sectionsGone === 3 ? 'three' : sectionsGone} of your sections`} sold out.`
      : 'Every ticket for this show has been sold.'

  return (
    <div className="container page stack-lg">
      <ShowHeader show={show} right={<span className="small muted">closed</span>} />
      <div className="outcome-grid">
        <section className="stack" aria-label="Final state of the venue">
          <span className="eyebrow">Final state</span>
          <ArenaMap arena={arena} label="All sections sold out" rankedIds={ranked} stateOf={() => 'gone'} />
        </section>
        <section className="stack">
          <h1 style={{ fontSize: 32 }}>{left ? 'You left the queue.' : 'Tickets have sold out.'}</h1>
          {queue && <p className="muted" style={{ fontSize: 18 }}>You were number {formatNumber(queue.startAhead + 1)} of {formatNumber(queue.totalInQueue)} in the queue.</p>}
          <div className="card card-tight surface">{summary}</div>
          <ul className="benefits">
            <li><span className="arrow">→</span><span><b>Waitlist place {formatNumber(place)}</b>: carried to any added date, no re-queue.</span></li>
            <li><span className="arrow">→</span><span><b>First refusal</b> on verified resale at face value.</span></li>
            <li><span className="arrow">→</span><span><b>Your group has been told</b>: message drafted, nothing to write.</span></li>
          </ul>
          <div className="row">
            {existing ? (
              <span className="badge badge-good"><Icon name="check" /> Waitlist place {formatNumber(existing.place)} held</span>
            ) : (
              <button className="btn btn-primary" onClick={() => { store.joinWaitlist(show.id, place); store.toast(`Waitlist place ${formatNumber(place)} held. We'll email you if tickets come back.`) }}>Hold my waitlist place</button>
            )}
            <button className="btn btn-secondary" disabled={alerted} onClick={() => { setAlerted(true); store.toast(`We'll alert you if ${artist.name} adds a date in ${arena.city}.`) }}>
              {alerted ? 'Alert set ✓' : 'Alert me if a date is added'}
            </button>
          </div>
          <a className="link-btn small" href={href(`/tour/${tour.id}`)}>See other dates on this tour</a>
        </section>
      </div>
      <StoryTimeline artist={artist} eyebrow="Keep exploring" />
    </div>
  )
}

function Outcome({ show }: { show: Show }) {
  const { bookings } = useStore()
  const route = useRoute()
  useDocumentTitle('Your result')
  const bookingId = route.query.get('b')
  const booking = bookings.find((b) => b.id === bookingId)
  if (booking) return <Success show={show} booking={booking} />
  return <SoldOut show={show} left={route.query.get('r') === 'left'} />
}

export default function OutcomePage({ showId }: { showId: string }) {
  const { findShow } = useStore()
  const show = findShow(showId)
  if (!show) return <NotFound />
  return (
    <LoginGate reason="Log in to see your result.">
      <Outcome show={show} />
    </LoginGate>
  )
}
