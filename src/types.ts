export type Role = 'admin' | 'customer'

export interface User {
  username: string
  name: string
  email: string
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

export interface Artist {
  name: string
  genre: string
  bio: string
  imageUrl: string
}

// One show: an artist playing a given arena on a given date.
export interface Concert {
  id: string
  artist: string
  title: string
  description: string
  arenaId: string
  date: string
  // How many tickets the admin has released for sale (at most the arena's capacity).
  ticketLimit: number
}

export interface Booking {
  id: string
  concertId: string
  username: string
  seats: string[]
  total: number
  createdAt: string
}
