import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { navigate, useRoute } from '../router'
import { countdownTarget, showPath } from '../sale'
import { formatShowDate, money, priceRange } from '../seats'
import { setArtistOverride } from '../theme'
import { useRecordPlayerHost } from '../audio'
import { useActionLabel, useShowAction } from '../actions'
import type { Show } from '../types'
import Poster from '../components/Poster'
import StatusBadge from '../components/StatusBadge'
import Countdown from '../components/Countdown'
import PlanModal, { planSummary } from '../components/PlanModal'
import StoryTimeline, { StoryPreview } from '../components/StoryTimeline'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import ReadinessChecklist from '../components/ReadinessChecklist'
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
  const label = useActionLabel()

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
          {label(show)}
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

  // Drop ?plan= from the URL without scrolling, so "Set plan" can reopen the same show later.
  const clearPlanParam = () => planParam && history.replaceState(null, '', `#/tour/${tourId}`)

  if (!tour || !artist) return <NotFound />
  const shows = store.shows.filter((s) => s.tourId === tour.id)

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

      <section className="card surface stack">
        <p className="muted small">Sort these out before the sale so nothing slows you down at the front of the queue.</p>
        <ReadinessChecklist tourId={tour.id} />
        <p className="small">
          <Icon name="users" size={16} /> Going with friends?{' '}
          <button className="link-btn" onClick={() => {
            void navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/tour/${tour.id}`).catch(() => {})
            setCopied(true)
            store.toast('Squad link copied. Friends who join are seated with you if your plan allows.')
          }}>{copied ? 'Squad link copied ✓' : 'Copy a squad invite link'}</button> <span className="muted">(optional)</span>
        </p>
      </section>

      <StoryPreview artist={artist} onExplore={() => setStoryOpen(true)} />

      {planShow && (
        <PlanModal
          show={planShow}
          onClose={() => { setPlanShow(null); clearPlanParam() }}
          onSaved={(plan) => {
            setPlanShow(null)
            clearPlanParam()
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
