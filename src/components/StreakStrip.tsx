import type { DayState, StreakRecord } from '../types'
import { PRESALE_WINDOW_DAYS } from '../streak'
import Icon from './Icon'

const label: Record<DayState, string> = {
  correct: 'Correct',
  tried: 'Tried',
  missed: 'Missed',
  today: 'Today',
  future: 'Coming up',
  before: 'Before you joined',
}

interface Props {
  states: DayState[]
  record: StreakRecord
  daysUntil: number
}

function CellMark({ state, timeout }: { state: DayState; timeout: boolean }) {
  if (state === 'correct') return <Icon name="check" />
  if (state === 'tried') return timeout ? <Icon name="clock" /> : <span className="streak-dot" />
  if (state === 'missed') return <span className="streak-dash" />
  return null
}

// One cell per day of the 30-day window, then the sale day as a black square.
// Every state has an icon as well as a colour, and the whole strip has a text alternative.
export default function StreakStrip({ states, record, daysUntil }: Props) {
  const count = (s: DayState) => states.filter((x) => x === s).length
  const toGo = count('future') + count('today')
  const summary = `Streak calendar for the ${PRESALE_WINDOW_DAYS} days before the sale: ${count('correct')} correct, ${count('tried')} tried, ${count('missed')} missed${toGo ? `, ${toGo} to go` : ''}.`

  return (
    <div className="streak-strip" role="img" aria-label={summary}>
      {states.map((state, i) => {
        const timeout = record.days[i + 1]?.result === 'timeout'
        return (
          <span key={i} className={`streak-cell s-${state}`} title={`Day ${i + 1}: ${timeout ? 'Time\'s up' : label[state]}`}>
            <CellMark state={state} timeout={timeout} />
          </span>
        )
      })}
      <span className={`streak-cell s-sale ${daysUntil === 0 ? 'is-today' : ''}`} title="Sale day"><Icon name="ticket" /></span>
    </div>
  )
}

export function StreakLegend() {
  return (
    <ul className="streak-legend" aria-label="Key">
      <li><span className="streak-cell s-correct"><Icon name="check" /></span> Correct</li>
      <li><span className="streak-cell s-tried"><span className="streak-dot" /></span> Tried</li>
      <li><span className="streak-cell s-missed"><span className="streak-dash" /></span> Missed</li>
      <li><span className="streak-cell s-today" /> Today</li>
      <li><span className="streak-cell s-sale"><Icon name="ticket" /></span> Sale day</li>
    </ul>
  )
}
