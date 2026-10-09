import type { SaleStatus } from '../types'
import type { SectionStatus } from '../queue/simulator'
import Icon, { type IconName } from './Icon'

// One shared vocabulary for every status in the app. Icon + text, never colour alone.
const sale: Record<SaleStatus, { label: string; tone: string; icon?: IconName }> = {
  announced: { label: 'Announced', tone: 'neutral', icon: 'calendar' },
  'presale-soon': { label: 'Presale soon', tone: 'info', icon: 'bell' },
  'waiting-room': { label: 'Waiting room open', tone: 'wait', icon: 'clock' },
  'queue-open': { label: 'Queue open', tone: 'queue' },
  'on-sale': { label: 'On sale', tone: 'good', icon: 'ticket' },
  'sold-out': { label: 'Sold out', tone: 'off', icon: 'ban' },
}

const section: Record<SectionStatus, { label: string; tone: string; icon: IconName }> = {
  likely: { label: 'Likely', tone: 'good', icon: 'check' },
  'at-risk': { label: 'At risk', tone: 'warn', icon: 'alert' },
  unlikely: { label: 'Unlikely', tone: 'off', icon: 'minusCircle' },
  'sold-out': { label: 'Sold out', tone: 'off', icon: 'ticket' },
  'cant-seat-together': { label: 'Can\'t seat together', tone: 'off', icon: 'ban' },
}

interface Props {
  status: SaleStatus
  label?: string
}

export default function StatusBadge({ status, label }: Props) {
  const s = sale[status]
  return (
    <span className={`badge badge-${s.tone}`}>
      {s.icon ? <Icon name={s.icon} /> : <span className="pulse" aria-hidden="true" />}
      {label ?? s.label}
    </span>
  )
}

export function SectionBadge({ status, quantity }: { status: SectionStatus; quantity?: number }) {
  const s = section[status]
  const label = status === 'cant-seat-together' && quantity ? `Can't seat ${quantity} together` : s.label
  return (
    <span className={`badge badge-${s.tone}`}>
      <Icon name={s.icon} />
      {label}
    </span>
  )
}
