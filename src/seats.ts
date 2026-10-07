import type { Arena, Booking } from './types'

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

export const takenSeats = (bookings: Booking[], concertId: string) =>
  new Set(bookings.filter((b) => b.concertId === concertId).flatMap((b) => b.seats))

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
