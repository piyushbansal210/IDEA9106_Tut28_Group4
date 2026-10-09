import type { Arena, Booking, Section } from './types'

export const BOOKING_FEE = 6.5

// Seat ids look like "s34:B7" (section id, row letter, seat number); standing tickets are "floor-a:GA12".
export const makeSeatId = (sectionId: string, row: number, seat: number) =>
  `${sectionId}:${String.fromCharCode(65 + row)}${seat + 1}`

export function seatLabel(arena: Arena | undefined, id: string) {
  const [sectionId, seat] = id.split(':')
  const section = arena?.sections.find((s) => s.id === sectionId)
  if (seat.startsWith('GA')) return `${section?.name ?? sectionId} · General admission`
  return `${section?.name ?? sectionId} · Row ${seat[0]} · Seat ${seat.slice(1)}`
}

export const priceRange = (arena: Arena) => {
  const prices = arena.sections.map((s) => s.price)
  return [Math.min(...prices), Math.max(...prices)] as const
}

export const takenSeats = (bookings: Booking[], showId: string) =>
  new Set(bookings.filter((b) => b.showId === showId).flatMap((b) => b.seats))

// Small deterministic PRNG so "seats already sold" look random but stay the same between visits.
export function seeded(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

// Seats sold to other fans in the simulation; `fill` is the share already gone.
export function simulatedTaken(showId: string, section: Section, fill: number) {
  const rand = seeded(`${showId}:${section.id}`)
  const taken = new Set<string>()
  for (let r = 0; r < section.rows; r++) {
    for (let s = 0; s < section.seatsPerRow; s++) {
      if (rand() < fill) taken.add(makeSeatId(section.id, r, s))
    }
  }
  return taken
}

// Best block of `qty` adjacent free seats: front-most row first, then closest to the centre.
export function bestAdjacent(section: Section, taken: Set<string>, qty: number): string[] {
  const centre = (section.seatsPerRow - 1) / 2
  for (let r = 0; r < section.rows; r++) {
    let best: string[] | null = null
    let bestDist = Infinity
    for (let s = 0; s + qty <= section.seatsPerRow; s++) {
      const ids = Array.from({ length: qty }, (_, i) => makeSeatId(section.id, r, s + i))
      if (ids.some((id) => taken.has(id))) continue
      const dist = Math.abs(s + (qty - 1) / 2 - centre)
      if (dist < bestDist) {
        best = ids
        bestDist = dist
      }
    }
    if (best) return best
  }
  return []
}

export const money = (n: number) =>
  n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: n % 1 ? 2 : 0 })

export const formatNumber = (n: number) => Math.max(0, Math.round(n)).toLocaleString('en-AU')

// Dates are shown in the viewer's own time zone; the venue's zone is added when it differs.
export function formatShowDate(iso: string, venueTimeZone?: string) {
  const d = new Date(iso)
  const local = d.toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (!venueTimeZone || venueTimeZone === viewerZone) return local
  const venue = d.toLocaleString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: venueTimeZone, timeZoneName: 'short' })
  return `${local} (${venue} venue time)`
}

export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
