import { useEffect } from 'react'
import { useStore } from '../store'
import { usePresale } from '../presale'
import { formatShowDate } from '../seats'
import StreakSummary from '../components/StreakSummary'
import ReadinessChecklist from '../components/ReadinessChecklist'
import { saleWhen } from './PresaleHub'
import { href, navigate } from '../router'
import { showPath } from '../sale'
import { useRecordPlayerHost } from '../audio'
import { setArtistOverride } from '../theme'
import Countdown from '../components/Countdown'
import Icon from '../components/Icon'
import StoryTimeline from '../components/StoryTimeline'
import { planSummary } from '../components/PlanModal'
import { AlertSettings, LoginGate, ShowHeader, useDocumentTitle } from './shared'
import NotFound from './NotFound'

const reassurances = [
  'You\'re in. No need to refresh.',
  'When the queue opens, everyone in the waiting room gets a random place. Arriving earlier doesn\'t change it.',
  'Keep this tab open. You can switch tabs or apps and we\'ll alert you.',
]

// Before the waiting room opens: the pre-sale hub summary and today's question, instead of a blank wait.
function EarlyRoom({ showId }: { showId: string }) {
  const store = useStore()
  const presale = usePresale()
  const show = store.findShow(showId)!
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  const registered = !!presale.registrationFor(show.id)
  const daysUntil = presale.streakFor(show.id).daysUntil

  return (
    <div className="container page stack-lg">
      <ShowHeader show={show} />
      <section className="stack-sm">
        <span className="eyebrow">Not open yet</span>
        <h1 style={{ fontSize: 28 }}>The waiting room opens 30 minutes before the sale</h1>
        <p className="muted">{arena.city} sale {saleWhen(daysUntil)}: {formatShowDate(show.saleOpensAt, arena.timeZone)}. Until then, keep your streak going and get ready.</p>
      </section>
      {registered ? (
        <div className="hub-grid">
          <section className="card"><StreakSummary showId={show.id} /></section>
          <section className="card stack">
            <ReadinessChecklist tourId={tour.id} showId={show.id} title="Be ready for the sale" />
            <a className="link-btn small" href={href(showPath(show, 'hub'))}>Open my pre-sale hub</a>
          </section>
        </div>
      ) : (
        <div className="card surface stack">
          <h2 style={{ fontSize: 22 }}>Pre-register for {artist.name}</h2>
          <p>Get a daily 20-second question until the sale, and tips so you're ready. Your streak never changes your place in the queue.</p>
          <div><button className="btn btn-primary" onClick={() => presale.openPreRegister(show.id)}>Pre-register</button></div>
        </div>
      )}
    </div>
  )
}

function Room({ showId }: { showId: string }) {
  const store = useStore()
  const show = store.findShow(showId)!
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  const status = store.statusOf(show)
  const plan = store.planFor(show.id)
  useDocumentTitle('Waiting room')
  useRecordPlayerHost(artist.id)
  useEffect(() => {
    setArtistOverride(artist.id)
    return () => setArtistOverride(null)
  }, [artist.id])

  useEffect(() => {
    if (status === 'queue-open') navigate(showPath(show, 'queue'), { keepQuery: true })
  }, [status, show])
  const needsPlan = !plan && status === 'waiting-room'
  useEffect(() => {
    if (needsPlan) navigate(`/tour/${tour.id}?plan=${show.id}&then=waiting`)
  }, [needsPlan, tour.id, show.id])

  const early = status === 'announced' || status === 'presale-soon'
  if (early) return <EarlyRoom showId={showId} />

  if (!plan) {
    return (
      <div className="container page narrow">
        <div className="empty stack" style={{ alignItems: 'center' }}>
          <h1 style={{ fontSize: 28 }}>Set your plan first</h1>
          <p className="muted">It takes a minute and means you won't have to decide anything under pressure.</p>
          <a className="btn btn-primary" href={href(`/tour/${tour.id}?plan=${show.id}&then=waiting`)}>Set my plan</a>
        </div>
      </div>
    )
  }

  return (
    <div className="container page narrow stack-lg">
      <ShowHeader show={show} right={<span className="plan-pill">Your plan: <b>{plan.quantity} together, up to ${plan.maxPricePerTicket} each</b></span>} />

      <section className="stack" aria-labelledby="wr-h">
        <span className="eyebrow">Waiting room</span>
        <h1 id="wr-h" style={{ fontSize: 28 }}>The queue opens in</h1>
        <Countdown to={show.saleOpensAt} className="big-count" onDone={() => navigate(showPath(show, 'queue'), { keepQuery: true })} />
        <p className="muted">{arena.city} sale opens at {new Date(show.saleOpensAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })} your time.</p>
      </section>

      <section className="card stack">
        <ul className="reassure">
          {reassurances.map((r) => <li key={r}><Icon name="check" /> <span>{r}</span></li>)}
        </ul>
        <AlertSettings />
      </section>

      <section className="card surface stack-sm">
        <span className="eyebrow">Your plan</span>
        <p>{planSummary(plan, arena.sections)}</p>
        <a className="link-btn small" href={href(`/tour/${tour.id}?plan=${show.id}&then=waiting`)}>Edit plan</a>
      </section>

      <StoryTimeline artist={artist} />
    </div>
  )
}

export default function WaitingRoom({ showId }: { showId: string }) {
  const { findShow } = useStore()
  if (!findShow(showId)) return <NotFound />
  return (
    <LoginGate reason="Log in to join the waiting room. Your plan is saved to your account.">
      <Room showId={showId} />
    </LoginGate>
  )
}
