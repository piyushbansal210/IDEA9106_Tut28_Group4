import type { Arena, Artist, Concert, User } from './types'

// Demo accounts, inserted by the server the first time the database is created.
export const seedUsers: (User & { password: string })[] = [
  { username: 'admin', password: 'admin123', name: 'QuickSeat Admin', email: 'admin@quickseat.test', role: 'admin' },
  { username: 'customer', password: 'customer123', name: 'Demo Customer', email: 'customer@quickseat.test', role: 'customer' },
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

// Photos are from Wikimedia Commons (see public/artists/CREDITS.md).
export const seedArtists: Artist[] = [
  {
    name: 'Taylor Swift',
    genre: 'Pop',
    bio: 'Fourteen-time Grammy winner bringing every era of her career to the stage.',
    imageUrl: '/artists/taylor-swift.jpg',
  },
  {
    name: 'BTS',
    genre: 'K-pop',
    bio: 'The global K-pop phenomenon, known for jaw-dropping choreography and stadium-sized energy.',
    imageUrl: '/artists/bts.jpg',
  },
  {
    name: 'Charlie Puth',
    genre: 'Pop',
    bio: 'Singer, songwriter and producer with perfect pitch and a string of chart-topping hits.',
    imageUrl: '/artists/charlie-puth.jpg',
  },
  {
    name: 'Dua Lipa',
    genre: 'Dance pop',
    bio: 'Disco-pop superstar behind "Levitating", "Don\'t Start Now" and "Houdini".',
    imageUrl: '/artists/dua-lipa.jpg',
  },
  {
    name: 'Ed Sheeran',
    genre: 'Singer-songwriter',
    bio: 'One man, one guitar and a loop pedal – filling arenas with "Shape of You" and "Perfect".',
    imageUrl: '/artists/ed-sheeran.jpg',
  },
  {
    name: 'Coldplay',
    genre: 'Alternative rock',
    bio: 'Confetti, light-up wristbands and singalongs from one of the world\'s biggest live bands.',
    imageUrl: '/artists/coldplay.jpg',
  },
]

const show = (
  id: string,
  artist: string,
  title: string,
  arenaId: string,
  date: string,
  ticketLimit: number,
  description: string,
): Concert => ({ id, artist, title, arenaId, date, ticketLimit, description })

export const seedConcerts: Concert[] = [
  show('c1', 'Charlie Puth', 'One Night Only Tour', 'rod-laver', '2026-12-05', 184,
    'Charlie Puth brings his hits "Attention", "See You Again" and new songs to Melbourne.'),
  show('c2', 'Charlie Puth', 'One Night Only Tour', 'qudos', '2026-12-08', 150,
    'The One Night Only Tour heads to Sydney for a second intimate show.'),
  show('c3', 'Taylor Swift', 'The Eras Tour: Encore', 'qudos', '2027-02-16', 184,
    'A three-hour journey through every era of Taylor Swift\'s career, live in Sydney.'),
  show('c4', 'Taylor Swift', 'The Eras Tour: Encore', 'bec', '2027-02-21', 170,
    'An extra Brisbane date added due to popular demand.'),
  show('c5', 'Taylor Swift', 'The Eras Tour: Encore', 'rod-laver', '2027-02-26', 184,
    'The Encore closes in Melbourne with a career-spanning setlist.'),
  show('c6', 'BTS', 'Permission to Dance: Australia', 'rac', '2027-03-10', 146,
    'BTS return to Australia with a high-energy show full of chart-topping hits and choreography.'),
  show('c7', 'BTS', 'Permission to Dance: Australia', 'qudos', '2027-03-14', 184,
    'The Sydney leg of Permission to Dance, with full band and stage production.'),
  show('c8', 'Dua Lipa', 'Radical Optimism Tour', 'rod-laver', '2027-01-22', 160,
    'A night of disco-pop anthems under the mirror balls of Rod Laver Arena.'),
  show('c9', 'Ed Sheeran', 'Mathematics Tour: Up Close', 'bec', '2027-04-03', 170,
    'Ed Sheeran plays the hits solo with his loop pedal in Brisbane.'),
  show('c10', 'Ed Sheeran', 'Mathematics Tour: Up Close', 'rac', '2027-04-09', 120,
    'Perth gets an up-close evening with Ed and his guitar.'),
  show('c11', 'Coldplay', 'Music of the Spheres', 'qudos', '2027-05-15', 184,
    'Lasers, confetti and a stadium-sized show squeezed into an arena.'),
]
