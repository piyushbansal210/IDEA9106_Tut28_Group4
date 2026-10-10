import { FRONT, type QueueState, type SectionState } from '../queue/simulator'
import { formatNumber, money } from '../seats'
import { SectionBadge } from './StatusBadge'

const pct = (x: number) => `${(x * 100).toFixed(2)}%`
const isGone = (s: SectionState) => s.status === 'sold-out' || s.status === 'cant-seat-together'

function statusText(s: SectionState, q: number) {
  if (s.skipped) return 'Skipped'
  if (s.status === 'sold-out') return 'Sold out'
  if (s.status === 'cant-seat-together') return `Can't seat ${q} together`
  return s.status === 'likely' ? 'Likely' : s.status === 'at-risk' ? 'At risk' : 'Unlikely'
}

// "Your sections along the queue": where you are now vs. where each section is expected to run out.
export default function QueueChart({ state }: { state: QueueState }) {
  const you = Math.min(FRONT, state.progress * FRONT)
  const q = state.plan.quantity

  return (
    <section className="card stack" aria-labelledby="qchart-h">
      <div className="row between">
        <h2 id="qchart-h" style={{ fontSize: 20 }}>Your sections along the queue</h2>
        <span className="small muted">
          Shaded: estimated point each section runs out
          <button className="tooltip-q" aria-label="What is an estimate?" title="Estimates use how fast each section is selling and how many people are ahead of you. They update every few seconds.">?</button>
        </span>
      </div>

      <div className="qchart" aria-hidden="true">
        <div>
          {state.sections.map((s, i) => {
            const dim = isGone(s) || s.skipped
            return (
              <div className="qchart-label" key={s.sectionId}>
                <span className={`rank-num ${dim || i < state.activeIndex ? 'off' : ''}`}>{i + 1}</span>
                <span className={dim ? 'muted' : ''}>
                  <b style={{ fontWeight: 600 }}>{s.name}</b> {money(s.price)}
                  <br />
                  <span className="tiny">{statusText(s, q)}</span>
                </span>
              </div>
            )
          })}
        </div>
        <div className="qchart-plot">
          <div className="qchart-after" style={{ left: pct(FRONT) }}><span><span className="qa-long">After your turn</span><span className="qa-short">After</span></span></div>
          {state.sections.map((s) => {
            const left = Math.max(0, s.estimate.at - s.estimate.width / 2)
            return (
              <div className="qchart-track" key={s.sectionId}>
                <div className={`qchart-est ${isGone(s) ? 'gone' : ''}`} style={{ left: pct(left), width: pct(Math.min(s.estimate.width, 1 - left)) }}>estimate</div>
              </div>
            )
          })}
          <div className="qchart-front" style={{ left: pct(FRONT) }} />
          <div className="qchart-line" style={{ left: pct(you) }}><span>You</span></div>
        </div>
        <div />
        <div className="qchart-axis">
          <span>Where you joined</span>
          <span style={{ position: 'absolute', left: pct(FRONT), transform: 'translateX(-50%)', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Front of queue</span>
        </div>
      </div>

      {/* Tables ignore the 1px width of .visually-hidden, so the wrapper does the hiding. */}
      <div className="visually-hidden">
      <table>
        <caption>Your ranked sections, their status and tickets left</caption>
        <thead><tr><th>Choice</th><th>Section</th><th>Status</th><th>Tickets left</th></tr></thead>
        <tbody>
          {state.sections.map((s, i) => (
            <tr key={s.sectionId}><td>{i + 1}</td><td>{s.name}</td><td>{statusText(s, q)}</td><td>{formatNumber(s.remaining)}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  )
}

export function PlanTable({ state }: { state: QueueState }) {
  const q = state.plan.quantity
  return (
    <section className="card stack" aria-labelledby="plan-h">
      <h2 id="plan-h" style={{ fontSize: 20 }}>Your plan</h2>
      <div className="table-wrap">
        <table className="plan-table">
          <tbody>
            {state.sections.map((s, i) => (
              <tr key={s.sectionId} className={isGone(s) || s.skipped ? 'dim' : ''}>
                <td className="rank">{i + 1}.</td>
                <td>
                  <b style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.name}</b>
                  <div className="small muted">{money(s.price)} each</div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {s.skipped ? <span className="badge badge-off">Skipped</span> : <SectionBadge status={s.status} quantity={q} />}
                  {s.status !== 'sold-out' && <div className="small muted plan-left-narrow num">{formatNumber(s.remaining)} left</div>}
                </td>
                <td className="left num">{s.status === 'sold-out' ? '' : `${formatNumber(s.remaining)} left`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">If your plan changes, we'll {state.plan.rule === 'ask-me' ? 'check with you first' : 'move you to your next choice and tell you'}. We'll also tell you if your first choice is at risk.</p>
    </section>
  )
}
