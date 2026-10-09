import type { CSSProperties } from 'react'
import Icon from './Icon'

function Note({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="8.5" cy="18" rx="5" ry="3.6" transform="rotate(-20 8.5 18)" fill="currentColor" />
      <path d="M13 17.2V3c1.8 2.8 6 3.4 6 8" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Fans ahead of you, drawn as faint notes on the staff; the ones you've passed fade away.
const OTHERS = Array.from({ length: 16 }, (_, i) => ({ at: 0.06 + i * 0.058, lift: [0, 8, 3, 11, 5, 9, 1, 7][i % 8] }))

interface Props {
  progress: number
  compact?: boolean
  label?: string
}

// The queue as a music staff: your note hops along towards the front of the queue.
export default function QueueTrack({ progress, compact, label = 'You' }: Props) {
  const p = Math.min(1, Math.max(0, progress))
  return (
    <div className={`qtrack ${compact ? 'qtrack-sm' : ''}`} aria-hidden="true">
      <div className="qtrack-staff">
        <div className="qtrack-fill" style={{ width: `${p * 100}%` }} />
        {OTHERS.map((o, i) => (
          <Note key={i} className={`qtrack-other ${o.at < p ? 'passed' : ''}`} style={{ left: `${o.at * 100}%`, bottom: `${o.lift}px` }} />
        ))}
        <div className="qtrack-you" style={{ left: `${p * 100}%` }}>
          {!compact && <span className="qtrack-label">{label}</span>}
          <span className="qtrack-hop"><Note /></span>
        </div>
      </div>
      <div className="qtrack-front">
        <Icon name="ticket" size={compact ? 16 : 20} />
        {!compact && <span>Front</span>}
      </div>
    </div>
  )
}
