import type { Arena, Concert, User } from './types'

export const seedUsers: User[] = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'customer', password: 'customer123', role: 'customer' },
]

export const arenas: Arena[] = [
  {
    id: 'rod-laver',
    name: 'Rod Laver Arena',
    city: 'Melbourne, VIC',
    sections: [
      { id: 'floor', name: 'Floor', rows: 4, seatsPerRow: 10, price: 250 },
      { id: 'lower', name: 'Lower Bowl', rows: 5, seatsPerRow: 12, price: 180 },
      { id: 'upper', name: 'Upper Bowl', rows: 6, seatsPerRow: 14, price: 110 },
    ],
  },
  {
    id: 'qudos',
    name: 'Qudos Bank Arena',
    city: 'Sydney, NSW',
    sections: [
      { id: 'floor', name: 'Floor', rows: 4, seatsPerRow: 10, price: 240 },
      { id: 'lower', name: 'Lower Tier', rows: 5, seatsPerRow: 12, price: 170 },
      { id: 'upper', name: 'Upper Tier', rows: 6, seatsPerRow: 14, price: 99 },
    ],
  },
  {
    id: 'rac',
    name: 'RAC Arena',
    city: 'Perth, WA',
    sections: [
      { id: 'gold', name: 'Gold', rows: 3, seatsPerRow: 8, price: 300 },
      { id: 'silver', name: 'Silver', rows: 5, seatsPerRow: 10, price: 190 },
      { id: 'bronze', name: 'Bronze', rows: 6, seatsPerRow: 12, price: 120 },
    ],
  },
  {
    id: 'bec',
    name: 'Brisbane Entertainment Centre',
    city: 'Brisbane, QLD',
    sections: [
      { id: 'floor', name: 'Floor', rows: 4, seatsPerRow: 10, price: 230 },
      { id: 'lower', name: 'Lower Level', rows: 5, seatsPerRow: 12, price: 160 },
      { id: 'upper', name: 'Upper Level', rows: 5, seatsPerRow: 14, price: 95 },
    ],
  },
]

export const seedConcerts: Concert[] = [
  {
    id: 'c1',
    artist: 'Charlie Puth',
    title: 'One Night Only Tour',
    description: 'Charlie Puth brings his hits "Attention", "See You Again" and new songs to Melbourne for one night.',
    arenaId: 'rod-laver',
    date: '2026-12-05',
  },
  {
    id: 'c2',
    artist: 'Taylor Swift',
    title: 'The Eras Tour: Encore',
    description: 'A three-hour journey through every era of Taylor Swift\'s career, live in Sydney.',
    arenaId: 'qudos',
    date: '2027-02-16',
  },
  {
    id: 'c3',
    artist: 'BTS',
    title: 'Permission to Dance: Australia',
    description: 'BTS return to Australia with a high-energy show full of chart-topping hits and choreography.',
    arenaId: 'rac',
    date: '2027-03-10',
  },
  {
    id: 'c4',
    artist: 'Taylor Swift',
    title: 'The Eras Tour: Encore',
    description: 'An extra Brisbane date added due to popular demand.',
    arenaId: 'bec',
    date: '2027-02-21',
  },
]
