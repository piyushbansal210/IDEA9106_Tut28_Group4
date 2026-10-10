export type Role = 'admin' | 'customer'

export interface User {
  username: string
  // Prototype only: passwords live in localStorage in plain text. Never do this in production.
  password: string
  role: Role
  name: string
  email: string
  paymentSaved?: boolean
}

export type ArtistId = 'taylor-swift' | 'bts' | 'charlie-puth'

export interface Milestone {
  year: number
  title: string
  kind: 'first-release' | 'breakthrough' | 'biggest-hit' | 'milestone' | 'this-tour'
  story: string
  clipUrl?: string
}

export interface Artist {
  id: ArtistId
  name: string
  genre: string
  bio: string
  posterUrl?: string
  posterGradient: [string, string]
  spotifyArtistId: string
  milestones: Milestone[]
}

export interface Section {
  id: string
  name: string
  kind: 'standing' | 'seated'
  position: 'front' | 'side' | 'rear' | 'upper'
  rows: number
  seatsPerRow: number
  price: number
}

export interface Arena {
  id: string
  name: string
  city: string
  timeZone: string
  sections: Section[]
}

export type SaleStatus = 'announced' | 'presale-soon' | 'waiting-room' | 'queue-open' | 'on-sale' | 'sold-out'

export interface Show {
  id: string
  tourId: string
  arenaId: string
  date: string
  saleOpensAt: string
  hasQueue: boolean
  soldOut?: boolean
  ticketLimit: number
}

export interface Tour {
  id: string
  artistId: ArtistId
  name: string
  tagline: string
  posterUrl?: string
}

export interface TicketPlan {
  showId: string
  quantity: number
  maxPricePerTicket: number
  rankedSectionIds: string[]
  rule: 'auto-next' | 'ask-me'
}

export interface Booking {
  id: string
  showId: string
  username: string
  sectionId: string
  seats: string[]
  total: number
  createdAt: string
}

export interface Waitlist {
  id: string
  showId: string
  username: string
  place: number
  createdAt: string
}

// ----- Presale streak -----

export interface Registration {
  username: string
  showId: string
  artistId: ArtistId
  push: boolean
  email: boolean
  quietHours?: { from: string; to: string }
  // First streak day that counts for this fan; days before it are shown as "before you joined", not missed.
  startDay: number
  createdAt: string
}

export interface TriviaQuestion {
  id: string
  artistId: ArtistId
  question: string
  options: string[]
  answerIndex: number
  explanation: string
  source: string
}

export type StreakResult = 'correct' | 'wrong' | 'timeout'

export interface StreakDay {
  dayIndex: number
  result: StreakResult
  questionId: string
  answeredAt: string
  msTaken: number
}

// A question that has been shown and is still being answered. Persisted so a refresh can't reset the clock.
export interface PendingQuestion {
  dayIndex: number
  questionId: string
  shownAt: number
  order: number[]
}

export interface StreakRecord {
  days: Record<number, StreakDay>
  pending?: PendingQuestion
}

export type DayState = 'correct' | 'tried' | 'missed' | 'today' | 'future' | 'before'

export type EmailTemplate = 'day-7' | 'day-1' | 'hour-before'

export interface SentEmail {
  id: string
  username: string
  showId: string
  template: EmailTemplate
  subject: string
  preheader: string
  html: string
  text: string
  sentAt: string
  read: boolean
}
