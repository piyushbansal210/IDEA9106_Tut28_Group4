import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { navigate, useRoute } from '../router'
import { countdownTarget, primaryAction, showPath } from '../sale'
import { formatShowDate, money, priceRange } from '../seats'
import { setArtistOverride } from '../theme'
import { useRecordPlayerHost } from '../audio'
import { useShowAction } from '../actions'
import type { Show } from '../types'
import Poster from '../components/Poster'
import StatusBadge from '../components/StatusBadge'
import Countdown from '../components/Countdown'
import PlanModal, { planSummary } from '../components/PlanModal'
import StoryTimeline, { StoryPreview } from '../components/StoryTimeline'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import NotFound from './NotFound'

function ShowRow({ show, onPlan }: { show: Show; onPlan: (s: Show) => void }) {
  const store = useStore()
  const act = useShowAction()
  const arena = store.arenaOf(show)
  const status = store.statusOf(show)
  const target = countdownTarget(show, status)
  const [lo, hi] = priceRange(arena)
  const plan = store.planFor(show.id)
  const canPlan = show.hasQueue && status !== 'sold-out' && status !== 'on-sale'
  const reminded = store.hasReminder(show.id)

  return (
    <li className="show-row">
      <div className="stack-sm">
        <strong style={{ fontSize: 18 }}>{arena.city} · {arena.name}</strong>
        <span className="muted small">{formatShowDate(show.date, arena.timeZone)}</span>
        <span className="small">{money(lo)} – {money(hi)} per ticket</span>
      </div>
      <div className="stack-sm">
        <StatusBadge status={status} />
        {target && <span className="small muted">{status === 'waiting-room' ? 'Queue opens in' : 'On sale in'} <Countdown to={target} /></span>}
        {plan && canPlan && <span className="small" style={{ color: 'var(--success)' }}><Icon name="check" size={14} /> Plan set</span>}
      </div>
      <div className="show-actions">
        {canPlan && (
          <button className="btn btn-secondary" onClick={() => store.requireLogin('Log in to set your ticket plan. It\'s saved to your account.', () => onPlan(show))}>
            {plan ? 'Edit plan' : 'Set my plan'}
          </button>
        )}
        <button className="btn btn-primary" onClick={() => act(show)}>
          {(status === 'presale-soon' || status === 'announced') && reminded ? 'Reminder set ✓' : primaryAction[status]}
        </button>
      </div>
    </li>
  )
}

export default function TourPage({ tourId }: { tourId: string }) {
  const store = useStore()
  const route = useRoute()
  const tour = store.findTour(tourId)
  const artist = tour && store.artistOf(tour)
  const [planShow, setPlanShow] = useState<Show | null>(null)
  const [storyOpen, setStoryOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useRecordPlayerHost(artist?.id ?? null)
  useEffect(() => {
    setArtistOverride(artist?.id ?? null)
    return () => setArtistOverride(null)
  }, [artist?.id])

  // Arriving with ?plan=<showId>&then=<page> (e.g. from "Join queue" without a plan) opens the plan straight away.
  const planParam = route.query.get('plan')
  const then = route.query.get('then') as 'waiting' | 'queue' | null
  useEffect(() => {
    const s = store.findShow(planParam ?? undefined)
    if (s && store.user) setPlanShow(s)
    // only when the query changes
  }, [planParam]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!tour || !artist) return <NotFound />
  const shows = store.shows.filter((s) => s.tourId === tour.id)
  const user = store.user
  const anyPlan = shows.some((s) => store.planFor(s.id))

  return (
    <div className="container page stack-lg">
      <a className="link-btn small" href="#/">← All tours</a>
      <section className="tour-head">
        <Poster artist={artist} tour={tour} />
        <div className="stack">
          <span className="eyebrow">{artist.name} · {artist.genre}</span>
          <h1>{tour.name}</h1>
          <p style={{ fontSize: 18 }}>{tour.tagline}</p>
          <p className="muted">{artist.bio}</p>
        </div>
      </section>

      <section aria-labelledby="dates-h" className="stack">
        <h2 id="dates-h">Dates and tickets</h2>
        <p className="muted small">Times are in your time zone. Venue time is shown when it's different.</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {shows.map((s) => <ShowRow key={s.id} show={s} onPlan={setPlanShow} />)}
        </ul>
      </section>

      <section className="card surface stack" aria-labelledby="ready-h">
        <div className="stack-sm">
          <h2 id="ready-h" style={{ fontSize: 24 }}>Ready to buy?</h2>
          <p className="muted small">Sort these out before the sale so nothing slows you down at the front of the queue.</p>
        </div>
        <ul className="checklist">
          <li>
            <span className={`check ${user ? 'ok' : ''}`}>{user && <Icon name="check" />}</span>
            {user ? <span>Logged in as <b>{user.name}</b></span> : <span>Not logged in yet. <button className="link-btn" onClick={() => store.openLogin('login')}>Log in</button></span>}
          </li>
          <li>
            <span className={`check ${anyPlan ? 'ok' : ''}`}>{anyPlan && <Icon name="check" />}</span>
            <span>{anyPlan ? 'Ticket plan set' : 'Set your ticket plan for the show you want'}</span>
          </li>
          <li>
            <span className={`check ${user?.paymentSaved ? 'ok' : ''}`}>{user?.paymentSaved && <Icon name="check" />}</span>
            <label className="checkbox" style={{ alignItems: 'center' }}>
              <input type="checkbox" checked={!!user?.paymentSaved} disabled={!user} onChange={(e) => store.setPaymentSaved(e.target.checked)} />
              <span>Payment method saved <span className="small muted">(demo: no card needed)</span></span>
            </label>
          </li>
          <li>
            <span className="check"><Icon name="users" /></span>
            <span>
              Going with friends? <button className="link-btn" onClick={() => {
                void navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/tour/${tour.id}`).catch(() => {})
                setCopied(true)
                store.toast('Squad link copied. Friends who join are seated with you if your plan allows.')
              }}>{copied ? 'Squad link copied ✓' : 'Copy a squad invite link'}</button> <span className="small muted">(optional)</span>
            </span>
          </li>
        </ul>
      </section>

      <StoryPreview artist={artist} onExplore={() => setStoryOpen(true)} />

      {planShow && (
        <PlanModal
          show={planShow}
          onClose={() => setPlanShow(null)}
          onSaved={(plan) => {
            setPlanShow(null)
            store.toast(`Plan saved: ${planSummary(plan, store.arenaOf(planShow).sections)}`)
            if (then && planParam === planShow.id) navigate(showPath(planShow, then))
          }}
        />
      )}
      {storyOpen && (
        <Modal title={`The ${artist.name} story`} hideTitle onClose={() => setStoryOpen(false)} wide>
          <StoryTimeline artist={artist} />
        </Modal>
      )}
    </div>
  )
}
