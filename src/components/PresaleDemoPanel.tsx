import { useStore } from '../store'
import { usePresale, type DemoAnswer } from '../presale'
import { PRESALE_WINDOW_DAYS, daysUntilSale } from '../streak'

// ?demo=1 only. Moves the streak/hub/email clock without touching the queue's sale times.
export default function PresaleDemoPanel({ showId }: { showId: string }) {
  const store = useStore()
  const presale = usePresale()
  const show = store.findShow(showId)
  if (!show) return null
  const realDays = daysUntilSale(show.saleOpensAt, store.now)
  const days = presale.demoDaysUntil ?? Math.min(PRESALE_WINDOW_DAYS, Math.max(0, realDays))
  const view = presale.streakFor(showId)

  const answer = (kind: DemoAnswer) => {
    if (!view.dayIndex) return store.toast('No question on this day. Move the slider into the 30-day window.')
    if (view.today) return store.toast('Today is already answered. Reset the streak or move the day slider.')
    presale.openTrivia(showId, kind)
  }

  return (
    <section className="demo-bar" aria-label="Presale demo controls">
      <details open>
        <summary>Presale demo</summary>
        <div className="demo-bar-body">
          <label htmlFor="demo-days" className="row between" style={{ gap: 4 }}>
            <span>Days until sale</span>
            <output>{days}{presale.demoDaysUntil === null ? ' (live)' : ''}</output>
          </label>
          <input id="demo-days" type="range" min={0} max={PRESALE_WINDOW_DAYS} step={1} value={PRESALE_WINDOW_DAYS - days} aria-valuetext={`${days} days until sale`}
            onChange={(e) => presale.setDemoDaysUntil(PRESALE_WINDOW_DAYS - Number(e.target.value))} />
          <span className="tiny" style={{ opacity: 0.75 }}>30 ← → sale day</span>
          {presale.demoDaysUntil !== null && <button onClick={() => presale.setDemoDaysUntil(null)}>Back to live time</button>}
          <button onClick={() => presale.sendNudge(showId)}>Send today's nudge</button>
          <div className="row" style={{ gap: 6 }}>
            <button onClick={() => answer('correct')}>Answer correctly</button>
            <button onClick={() => answer('wrong')}>Answer wrong</button>
          </div>
          <button onClick={() => answer('timeout')}>Let timer run out</button>
          <div className="row" style={{ gap: 6 }}>
            <button onClick={() => presale.fillSampleHistory(showId)}>Fill sample history</button>
            <button onClick={() => presale.resetStreak(showId)}>Reset streak</button>
          </div>
        </div>
      </details>
    </section>
  )
}
