import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useStore } from '../store'
import { href, isDemo, navigate } from '../router'
import { showPath } from '../sale'
import { formatNumber, money } from '../seats'
import { notify, useRecordPlayerHost } from '../audio'
import { setArtistOverride } from '../theme'
import { createQueue, getQueue, leaveQueue, peekQueue, summarise, type QueueAlert, type QueueState, type QueueStore, type Storyline } from '../queue/simulator'
import type { Show, TicketPlan } from '../types'
import QueueChart, { PlanTable } from '../components/QueueChart'
import { SectionBadge } from '../components/StatusBadge'
import StoryTimeline from '../components/StoryTimeline'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import Countdown from '../components/Countdown'
import QueueTrack from '../components/QueueTrack'
import { AlertSettings, LoginGate, ShowHeader, useDocumentTitle } from './shared'
import NotFound from './NotFound'

function AlertBox({ alert, sticky }: { alert: QueueAlert; sticky?: boolean }) {
  const cls = alert.tone === 'info' ? 'alert-info' : alert.tone === 'good' ? 'alert-good' : ''
  return (
    <div className={`alert ${cls} ${sticky && alert.tone !== 'info' ? 'sticky-alert' : ''}`} role={alert.important ? 'alert' : 'status'}>
      <Icon name={alert.tone === 'info' ? 'info' : alert.tone === 'good' ? 'check' : 'alert'} />
      <div>
        <strong>{alert.title}</strong>
        <span className="small">{alert.body}</span>
      </div>
    </div>
  )
}

function DecisionModal({ queue }: { queue: QueueStore }) {
  const state = queue.getState()
  const d = state.decision!
  const next = state.sections[d.nextIndex]
  const after = state.sections[d.nextIndex + 1]
  return (
    <Modal title={d.reason}>
      <div className="stack" style={{ marginTop: 8 }}>
        <p>
          You asked us to check with you first. <b>{next.name}</b> is your next choice at <b>{money(next.price)}</b> each.
        </p>
        <div className="row small muted">
          <SectionBadge status={next.status} quantity={state.plan.quantity} />
          <span>{formatNumber(next.remaining)} left</span>
        </div>
        <p className="small muted">
          Decide within <Countdown to={new Date(d.deadline).toISOString()} />. If you don't answer, we'll continue with {next.name}. Your place in the queue is kept either way.
        </p>
        <div className="stack-sm">
          <button className="btn btn-primary btn-block" data-autofocus onClick={() => queue.respond('continue')}>Continue with {next.name}</button>
          {after && <button className="btn btn-secondary btn-block" onClick={() => queue.respond('skip')}>Skip to {after.name}</button>}
          <button className="btn btn-ghost btn-block" onClick={() => queue.respond('leave')}>Leave the queue</button>
        </div>
      </div>
    </Modal>
  )
}

function DemoPanel({ queue, onRestart }: { queue: QueueStore; onRestart: (s: Storyline) => void }) {
  const state = queue.getState()
  return (
    <div className="demo-panel" aria-label="Demo controls">
      <strong>Demo controls</strong>
      <div className="row" style={{ gap: 6 }}>
        {[1, 10, 50].map((s) => (
          <button key={s} aria-pressed={state.speed === s} onClick={() => queue.setSpeed(s)}>×{s}</button>
        ))}
      </div>
      <button onClick={() => queue.jumpToNextEvent()}>Jump to next event</button>
      <button onClick={() => onRestart(state.storyline === 'sold-out' ? 'default' : 'sold-out')}>
        Restart with {state.storyline === 'sold-out' ? 'default' : 'sold-out'} storyline
      </button>
    </div>
  )
}

// Keeps your place in view: slides in under the navbar once the big counter scrolls away.
function FloatingTracker({ state, onSeats }: { state: QueueState; onSeats: () => void }) {
  const summary = summarise(state)
  const yourTurn = state.phase === 'your-turn'
  return (
    <aside className="qfloat" aria-label="Your place in the queue">
      <div className="qfloat-count">
        {yourTurn ? <b>It's your turn</b> : <b>{formatNumber(state.peopleAhead)}</b>}
        <span>{yourTurn ? 'Your seats are waiting' : 'people ahead of you'}</span>
      </div>
      <QueueTrack progress={state.progress} compact />
      {yourTurn ? (
        <button className="btn btn-primary btn-sm" onClick={onSeats}>Pick seats</button>
      ) : (
        <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
          <SectionBadge status={summary.status} quantity={state.plan.quantity} />
          <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Back to the top of the queue page" onClick={() => window.scrollTo({ top: 0 })}>
            <Icon name="up" size={18} />
          </button>
        </div>
      )}
    </aside>
  )
}

function LiveQueue({ show, plan }: { show: Show; plan: TicketPlan }) {
  const store = useStore()
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  const [version, setVersion] = useState(0)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const demo = isDemo()

  const queue = getQueue(show.id, () => createQueue({ plan, sections: arena.sections, showId: show.id, speed: demo ? 10 : 1 }))
  const state = useSyncExternalStore(queue.subscribe, queue.getState)
  const summary = summarise(state)
  const latest = state.alerts[0]

  useRecordPlayerHost(artist.id, state.phase === 'your-turn' ? 'focus' : 'show')
  useEffect(() => {
    setArtistOverride(artist.id)
    return () => setArtistOverride(null)
  }, [artist.id])

  // Chime + browser notification for anything that changes the plan.
  const lastAlert = useRef(latest?.id)
  useEffect(() => {
    if (!latest || latest.id === lastAlert.current) return
    lastAlert.current = latest.id
    if (latest.tone !== 'info' || latest.important) notify(latest.title, latest.body)
  }, [latest])

  // Tab title: progress while waiting, a flag when something needs you.
  useEffect(() => {
    const flag = state.phase === 'your-turn' ? '🎟 Your turn!' : state.phase === 'decision' ? '⚠ Plan changed' : null
    document.title = flag ?? `(${formatNumber(state.peopleAhead)} ahead) QuickSeat`
  }, [state.phase, state.peopleAhead])
  useEffect(() => () => { document.title = 'QuickSeat' }, [])

  useEffect(() => {
    if (state.outcome === 'sold-out') {
      const t = setTimeout(() => navigate(`${showPath(show, 'outcome')}?r=sold-out`), 2500)
      return () => clearTimeout(t)
    }
    if (state.outcome === 'left') {
      leaveQueue(show.id)
      store.toast('You left the queue.')
      navigate(`/tour/${tour.id}`)
    }
  }, [state.outcome]) // eslint-disable-line react-hooks/exhaustive-deps

  const restart = (storyline: Storyline) => {
    leaveQueue(show.id)
    getQueue(show.id, () => createQueue({ plan, sections: arena.sections, showId: show.id, storyline, speed: state.speed }))
    setVersion(version + 1)
  }

  const yourTurn = state.phase === 'your-turn'
  const active = state.sections[state.activeIndex]
  const goToSeats = () => active && navigate(`${showPath(show, 'seats')}?section=${active.sectionId}`)

  // Show the floating tracker only while the main counter is out of view.
  const counterRef = useRef<HTMLElement>(null)
  const [counterVisible, setCounterVisible] = useState(true)
  useEffect(() => {
    const el = counterRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setCounterVisible(e.isIntersecting), { rootMargin: '-72px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [state.phase === 'assigned', version]) // eslint-disable-line react-hooks/exhaustive-deps
  const floating = !counterVisible && state.phase !== 'assigned' && state.phase !== 'done'
  useEffect(() => {
    document.body.classList.toggle('qfloat-on', floating)
    return () => document.body.classList.remove('qfloat-on')
  }, [floating])

  return (
    <div className="container page narrow stack-lg" key={version}>
      <ShowHeader show={show} right={<span className="plan-pill">Your plan: <b>{plan.quantity} {plan.quantity === 1 ? 'ticket' : 'tickets together'}, up to {money(plan.maxPricePerTicket)} each</b></span>} />

      {state.phase === 'assigned' ? (
        <section className="card stack" style={{ textAlign: 'center', padding: 48 }} aria-live="polite">
          <Icon name="shield" size={40} />
          <h1 style={{ fontSize: 28 }}>You're in the queue</h1>
          <p className="muted">Your place is random and fair. Refreshing won't change it.</p>
        </section>
      ) : (
        <section className="stack" aria-labelledby="q-h" ref={counterRef}>
          {yourTurn ? (
            <h1 id="q-h" style={{ fontSize: 'clamp(40px, 7vw, 56px)', fontWeight: 600 }}>It's your turn</h1>
          ) : (
            <h1 id="q-h" className="row" style={{ alignItems: 'baseline', gap: 12 }}>
              <span className="big-count">{formatNumber(state.peopleAhead)}</span>
              <span style={{ fontSize: 18, fontWeight: 400 }} className="muted">people ahead of you</span>
            </h1>
          )}
          {!yourTurn && <QueueTrack progress={state.progress} />}
          <div className="row" style={{ gap: 10 }}>
            <SectionBadge status={summary.status} quantity={plan.quantity} />
            <span>{summary.sentence}</span>
          </div>
          {yourTurn && active && (
            <div className="row">
              <button className="btn btn-primary btn-lg" data-autofocus onClick={goToSeats}>
                Pick your seats in {active.name} <Icon name="arrowRight" size={18} />
              </button>
            </div>
          )}
        </section>
      )}

      {floating && <FloatingTracker state={state} onSeats={goToSeats} />}
      {latest && <AlertBox alert={latest} sticky />}
      {state.alerts.length > 1 && (
        <details>
          <summary className="small" style={{ cursor: 'pointer' }}>Earlier updates ({state.alerts.length - 1})</summary>
          <div className="stack-sm" style={{ marginTop: 12 }}>
            {state.alerts.slice(1).map((a) => <AlertBox key={a.id} alert={a} />)}
          </div>
        </details>
      )}

      <QueueChart state={state} />
      <PlanTable state={state} />

      <section className="stack">
        <AlertSettings />
        <p className="small muted">You can look away. Your place is kept, and we'll alert you if your plan changes.</p>
        <div><button className="link-btn small" onClick={() => setConfirmLeave(true)}>Leave queue</button></div>
      </section>

      {!yourTurn && <StoryTimeline artist={artist} />}

      {state.phase === 'decision' && state.decision && <DecisionModal queue={queue} />}
      {confirmLeave && (
        <Modal title="Leave the queue?" onClose={() => setConfirmLeave(false)}>
          <div className="stack" style={{ marginTop: 8 }}>
            <p>You'll lose your place. If you join again you'll get a new random place at the back.</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" data-autofocus onClick={() => setConfirmLeave(false)}>Stay in queue</button>
              <button className="btn btn-danger" onClick={() => { setConfirmLeave(false); queue.respond('leave') }}>Leave queue</button>
            </div>
          </div>
        </Modal>
      )}
      {demo && <DemoPanel queue={queue} onRestart={restart} />}
    </div>
  )
}

function QueueGate({ showId }: { showId: string }) {
  const store = useStore()
  const show = store.findShow(showId)!
  const status = store.statusOf(show)
  const plan = store.planFor(show.id)
  useDocumentTitle('Queue')
  const tooEarly = status === 'waiting-room' && !peekQueue(show.id)
  useEffect(() => {
    if (tooEarly) navigate(showPath(show, 'waiting'), { keepQuery: true })
  }, [tooEarly, show])
  // Arriving without a plan (e.g. straight after logging in at the gate) opens the plan sheet, then returns here.
  useEffect(() => {
    if (!plan) navigate(`/tour/${show.tourId}?plan=${show.id}&then=queue`)
  }, [plan, show])

  if (!plan) {
    return (
      <div className="container page narrow">
        <div className="empty stack" style={{ alignItems: 'center' }}>
          <h1 style={{ fontSize: 28 }}>Set your plan to join the queue</h1>
          <p className="muted">Choose your sections now so the queue can track them for you.</p>
          <a className="btn btn-primary" href={href(`/tour/${show.tourId}?plan=${show.id}&then=queue`)}>Set my plan</a>
        </div>
      </div>
    )
  }
  if (tooEarly) return null
  if (status !== 'queue-open' && !peekQueue(show.id)) {
    return (
      <div className="container page narrow">
        <div className="empty stack" style={{ alignItems: 'center' }}>
          <h1 style={{ fontSize: 28 }}>This queue isn't open</h1>
          <p className="muted">Check the tour page for when tickets go on sale.</p>
          <a className="btn btn-primary" href={href(`/tour/${show.tourId}`)}>Back to the tour</a>
        </div>
      </div>
    )
  }
  return <LiveQueue show={show} plan={plan} />
}


export default function QueuePage({ showId }: { showId: string }) {
  const { findShow } = useStore()
  if (!findShow(showId)) return <NotFound />
  return (
    <LoginGate reason="Log in to join the queue. Your plan is saved to your account.">
      <QueueGate showId={showId} />
    </LoginGate>
  )
}
