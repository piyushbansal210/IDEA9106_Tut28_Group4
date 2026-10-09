import type { SaleStatus, Show } from './types'

export const WAITING_ROOM_MINUTES = 30
const QUEUE_WINDOW_HOURS = 4
const PRESALE_SOON_DAYS = 7

export function getShowStatus(show: Show, now: number): SaleStatus {
  if (show.soldOut) return 'sold-out'
  const opens = Date.parse(show.saleOpensAt)
  if (now < opens - WAITING_ROOM_MINUTES * 60_000) {
    return opens - now < PRESALE_SOON_DAYS * 86_400_000 ? 'presale-soon' : 'announced'
  }
  if (now < opens) return show.hasQueue ? 'waiting-room' : 'presale-soon'
  if (show.hasQueue && now < opens + QUEUE_WINDOW_HOURS * 3_600_000) return 'queue-open'
  return 'on-sale'
}

// The one action each status leads to. Labels are shared by cards, hero and tour page.
export const primaryAction: Record<SaleStatus, string> = {
  announced: 'Remind me',
  'presale-soon': 'Remind me',
  'waiting-room': 'Join waiting room',
  'queue-open': 'Join queue',
  'on-sale': 'Buy tickets',
  'sold-out': 'Join waitlist',
}

// The time a countdown should count to, if any.
export function countdownTarget(show: Show, status: SaleStatus): string | null {
  return status === 'announced' || status === 'presale-soon' || status === 'waiting-room' ? show.saleOpensAt : null
}

export const showPath = (show: Show, page: 'waiting' | 'queue' | 'seats' | 'outcome') =>
  `/tour/${show.tourId}/show/${show.id}/${page}`
