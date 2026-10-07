export type Role = 'admin' | 'customer'

export interface User {
  username: string
  password: string
  role: Role
}

export interface Section {
  id: string
  name: string
  rows: number
  seatsPerRow: number
  price: number
}

export interface Arena {
  id: string
  name: string
  city: string
  sections: Section[]
}

export interface Concert {
  id: string
  artist: string
  title: string
  description: string
  arenaId: string
  date: string
}

export interface Booking {
  id: string
  concertId: string
  username: string
  seats: string[]
  total: number
  createdAt: string
}
