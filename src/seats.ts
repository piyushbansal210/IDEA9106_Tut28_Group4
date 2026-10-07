import type { Arena, Concert } from './types'

// Seat ids look like "floor:B7" (section id, row letter, seat number).
export const makeSeatId = (sectionId: string, row: number, seat: number) =>
  `${sectionId}:${String.fromCharCode(65 + row)}${seat + 1}`

export function seatLabel(arena: Arena | undefined, id: string) {
  const [sectionId, seat] = id.split(':')
  const section = arena?.sections.find((s) => s.id === sectionId)
  return `${section?.name ?? sectionId} ${seat}`
}

export function seatsTotal(arena: Arena, ids: string[]) {
  return ids.reduce((sum, id) => {
    const section = arena.sections.find((s) => s.id === id.split(':')[0])
    return sum + (section?.price ?? 0)
  }, 0)
}

export const capacity = (arena: Arena) =>
  arena.sections.reduce((n, s) => n + s.rows * s.seatsPerRow, 0)

export const minPrice = (arena: Arena) => Math.min(...arena.sections.map((s) => s.price))

export type TakenSeats = Record<string, string[]>

export const takenSeats = (taken: TakenSeats, concertId: string) => new Set(taken[concertId] ?? [])

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export const ticketsLeft = (concert: Concert, taken: TakenSeats) =>
  Math.max(0, concert.ticketLimit - (taken[concert.id]?.length ?? 0))

// Section colours on the arena map, front (premium) to back.
export const SECTION_COLORS = ['#ffb547', '#ff3d8b', '#8b6cff', '#2ad4c8']

// { day: '05', month: 'DEC', weekday: 'Sat' } for date badges.
export function dateParts(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('en-AU', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-AU', { weekday: 'short' }),
    year: d.getFullYear(),
  }
}

export const money = (n: number) => `$${n.toLocaleString('en-AU')}`
