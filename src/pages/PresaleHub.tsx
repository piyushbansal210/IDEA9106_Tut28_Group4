import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { usePresale } from '../presale'
import { href, isDemo, navigate } from '../router'
import { showPath } from '../sale'
import { formatShowDate } from '../seats'
import { setArtistOverride } from '../theme'
import { useRecordPlayerHost } from '../audio'
import type { Show } from '../types'
import StreakSummary from '../components/StreakSummary'
import ReadinessChecklist from '../components/ReadinessChecklist'
import StoryTimeline from '../components/StoryTimeline'
import PresaleDemoPanel from '../components/PresaleDemoPanel'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import { formatCountdown } from '../components/Countdown'
import { LoginGate, useDocumentTitle } from './shared'
import NotFound from './NotFound'

const HANDOFF_MINUTES = 60

export function saleWhen(daysUntil: number) {
  return daysUntil <= 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`
}

// Within an hour of the sale: one last readiness check and a single way in.
function Handoff({ show, msToSale }: { show: Show; msToSale: number }) {
  const store = useStore()
  const presale = usePresale()
  const view = presale.streakFor(show.id)
  const status = store.statusOf(show)
  const open = status === 'waiting-room' || status === 'queue-open'
  const firstName = store.user?.name.split(' ')[0]
  return (
    <section className="card stack-lg handoff" aria-labelledby="handoff-h">
      <span className="badge badge-queue">
        <span className="pulse" aria-hidden="true" />
        {open ? 'Waiting room open' : `Waiting room opens in ${formatCountdown(Math.max(0, msToSale - 30 * 60_000))}`}
      </span>
      <h2 id="handoff-h">You're ready{firstName ? `, ${firstName}` : ''}</h2>
      <ReadinessChecklist tourId={show.tourId} showId={show.id} title="Final check" />
      <p className="muted" style={{ maxWidth: '52ch' }}>
        {view.length ? `Streak: ${view.length} ${view.length === 1 ? 'day' : 'days'}. ` : ''}Arriving early doesn't change your place: everyone in the waiting room gets a random one.
      </p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-primary btn-lg" onClick={() => navigate(showPath(show, open && status === 'queue-open' ? 'queue' : 'waiting'))}>Enter waiting room</button>
        <button className="btn btn-secondary" onClick={() => store.toast('We\'ll remind you again in 45 minutes.')}>Remind me in 45 minutes</button>
      </div>
    </section>
  )
}

function Hub({ show }: { show: Show }) {
  const store = useStore()
  const presale = usePresale()
  const [storyOpen, setStoryOpen] = useState(false)
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  const registration = presale.registrationFor(show.id)
  const view = presale.streakFor(show.id)
  const msToSale = Date.parse(show.saleOpensAt) - presale.presaleNow(show)
  const handoff = msToSale <= HANDOFF_MINUTES * 60_000 && store.statusOf(show) !== 'sold-out' && store.statusOf(show) !== 'on-sale'

  useDocumentTitle('Your pre-sale hub')
  useRecordPlayerHost(artist.id)
  useEffect(() => {
    setArtistOverride(artist.id)
    return () => setArtistOverride(null)
  }, [artist.id])

  return (
    <div className="container page stack-lg">
      <a className="link-btn small" href={href(`/tour/${tour.id}`)}>← {tour.name}</a>
      {isDemo() && <PresaleDemoPanel showId={show.id} />}
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div className="stack-sm">
          <span className="badge badge-neutral">{artist.name} · {arena.city}</span>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>Your pre-sale hub</h1>
        </div>
        <p className="muted small" style={{ maxWidth: '46ch' }}>
          {arena.city} sale {saleWhen(view.daysUntil)}: {formatShowDate(show.saleOpensAt, arena.timeZone)}.
        </p>
      </div>

      {!registration && (
        <div className="card surface row between">
          <span>You're not pre-registered for this show yet. Pre-register to get a daily question and readiness tips.</span>
          <button className="btn btn-primary" onClick={() => presale.openPreRegister(show.id)}>Pre-register</button>
        </div>
      )}

      {handoff && <Handoff show={show} msToSale={msToSale} />}

      <div className="hub-grid">
        <section className="card stack" aria-labelledby="streak-h">
          <h2 id="streak-h" className="visually-hidden">Your streak</h2>
          <StreakSummary showId={show.id} />
        </section>
        {!handoff && (
          <section className="card stack">
            <ReadinessChecklist tourId={tour.id} showId={show.id} title="Be ready for the sale" />
          </section>
        )}
      </div>

      <div className="row" style={{ gap: '8px 20px' }}>
        <button className="link-btn" onClick={() => setStoryOpen(true)}><Icon name="music" size={16} /> Explore the {artist.name} story</button>
        {registration && <button className="link-btn" onClick={() => presale.openPreRegister(show.id)}>Notification settings</button>}
      </div>

      {storyOpen && (
        <Modal title={`The ${artist.name} story`} hideTitle onClose={() => setStoryOpen(false)} wide>
          <StoryTimeline artist={artist} eyebrow="While you wait for the sale" />
        </Modal>
      )}
    </div>
  )
}

export default function PresaleHub({ showId }: { showId: string }) {
  const { findShow } = useStore()
  const show = findShow(showId)
  if (!show) return <NotFound />
  return (
    <LoginGate reason="Log in to see your pre-sale hub, streak and readiness.">
      <Hub show={show} />
    </LoginGate>
  )
}
