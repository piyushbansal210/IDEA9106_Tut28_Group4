import { usePresale } from '../presale'
import { NUDGE_HOUR, PRESALE_WINDOW_DAYS, msLeft } from '../streak'
import StreakStrip, { StreakLegend } from './StreakStrip'
import Icon from './Icon'

const resultText = { correct: 'Correct', wrong: 'Tried', timeout: 'Time\'s up' }

// Streak number, 30-day strip and today's question entry point. Used by the hub and the early waiting room.
export default function StreakSummary({ showId }: { showId: string }) {
  const presale = usePresale()
  const view = presale.streakFor(showId)
  const running = view.pending && view.pending.dayIndex === view.dayIndex ? msLeft(view.pending, Date.now()) : 0
  const nudgeTime = new Date(2000, 0, 1, NUDGE_HOUR).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })

  let today
  if (view.daysUntil > PRESALE_WINDOW_DAYS) {
    today = <p>Daily questions start {view.daysUntil - PRESALE_WINDOW_DAYS} {view.daysUntil - PRESALE_WINDOW_DAYS === 1 ? 'day' : 'days'} from now, {PRESALE_WINDOW_DAYS} days before the sale.</p>
  } else if (!view.dayIndex) {
    today = <p><b>It's sale day.</b> No question today. Get ready to enter the waiting room.</p>
  } else if (view.today) {
    today = (
      <>
        <span className="result-chip">
          <span className={`streak-cell s-${view.today.result === 'correct' ? 'correct' : 'tried'}`} aria-hidden="true">
            {view.today.result === 'correct' ? <Icon name="check" /> : view.today.result === 'timeout' ? <Icon name="clock" /> : <span className="streak-dot" />}
          </span>
          Today: {resultText[view.today.result]}
        </span>
        <span className="small muted">Next question tomorrow at {nudgeTime}.</span>
        <button className="btn btn-ghost btn-sm" onClick={() => presale.openTrivia(showId)}>See today's answer</button>
      </>
    )
  } else if (running > 0) {
    today = (
      <>
        <span><b>Question in progress:</b> {Math.ceil(running / 1000)} seconds left</span>
        <button className="btn btn-primary" onClick={() => presale.openTrivia(showId)}>Back to the question</button>
      </>
    )
  } else {
    today = (
      <>
        <span><b>Day {view.dayIndex}</b> · one question, 20 seconds</span>
        <button className="btn btn-primary" onClick={() => presale.openTrivia(showId)}>Answer today's question</button>
      </>
    )
  }

  return (
    <div className="stack">
      <div className="row" style={{ alignItems: 'flex-end', gap: 10 }}>
        <span className="streak-big" aria-hidden="true">{view.length}</span>
        <span className="muted" style={{ paddingBottom: 6 }}>day streak</span>
        <span className="visually-hidden">{view.length} day streak</span>
      </div>
      <StreakStrip states={view.states} record={view.record} daysUntil={view.daysUntil} />
      <StreakLegend />
      <div className="today-card" aria-live="polite">{today}</div>
      <p className="tiny muted">Green for correct, orange for trying. Missing a day breaks the streak. Your streak never changes your place in the queue.</p>
    </div>
  )
}
