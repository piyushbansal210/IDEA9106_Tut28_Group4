import type { Arena, Artist, Section, Show, Tour, User } from './types'

export const seedUsers: User[] = [
  { username: 'admin', password: 'admin123', role: 'admin', name: 'QuickSeat Admin', email: 'admin@quickseat.test' },
  { username: 'customer', password: 'customer123', role: 'customer', name: 'Demo Customer', email: 'customer@quickseat.test' },
]

export const artists: Artist[] = [
  {
    id: 'taylor-swift',
    name: 'Taylor Swift',
    genre: 'Pop',
    bio: 'Singer-songwriter who started in country music as a teenager and became one of the best-selling artists of all time. Known for storytelling lyrics and re-inventing her sound with every era.',
    posterGradient: ['#95424E', '#2B1418'],
    spotifyArtistId: '06HL4z0CvFAxyc27GXpf02',
    milestones: [
      { year: 2006, title: '"Tim McGraw"', kind: 'first-release', story: 'Her debut single, written in a high-school maths class, launched her country career at 16.' },
      { year: 2008, title: '"Love Story"', kind: 'breakthrough', story: 'A Romeo-and-Juliet retelling that carried her from country radio to pop charts worldwide.' },
      { year: 2014, title: '"Shake It Off"', kind: 'biggest-hit', story: 'The lead single of 1989 marked her full move to pop and debuted at #1 on the Billboard Hot 100.' },
      { year: 2023, title: 'The Eras Tour begins', kind: 'milestone', story: 'A three-hour show spanning every album that became the highest-grossing tour of all time.' },
      { year: 2027, title: 'The Eras Tour: Encore', kind: 'this-tour', story: 'The Australian encore dates you are queueing for now.' },
    ],
  },
  {
    id: 'bts',
    name: 'BTS',
    genre: 'K-pop',
    bio: 'Seven-member group from Seoul who grew from a small-label debut into a global phenomenon, with songs about youth, self-love and belonging.',
    posterGradient: ['#A86217', '#2A1A0B'],
    spotifyArtistId: '3Nrfpe0tUJi4K4DXYWgMUX',
    milestones: [
      { year: 2013, title: '"No More Dream"', kind: 'first-release', story: 'Their debut: a hip-hop track about the pressure young people face to follow someone else\'s dream.' },
      { year: 2015, title: '"I Need U"', kind: 'breakthrough', story: 'Their first music-show win in Korea and the start of the Most Beautiful Moment in Life era.' },
      { year: 2017, title: '"DNA"', kind: 'milestone', story: 'Their first entry on the US Billboard Hot 100.' },
      { year: 2020, title: '"Dynamite"', kind: 'biggest-hit', story: 'Their first all-English single, and their first #1 on the Billboard Hot 100.' },
      { year: 2027, title: 'Permission to Dance: Australia', kind: 'this-tour', story: 'The Australian shows you are queueing for now.' },
    ],
  },
  {
    id: 'charlie-puth',
    name: 'Charlie Puth',
    genre: 'Pop',
    bio: 'Singer, songwriter and producer with perfect pitch who first found an audience posting covers on YouTube, then wrote and produced his own hits.',
    posterGradient: ['#C25A3C', '#26140F'],
    spotifyArtistId: '6VuMaDnrHyPL1p4EHjYLi7',
    milestones: [
      { year: 2015, title: '"Marvin Gaye"', kind: 'first-release', story: 'His debut single, a duet with Meghan Trainor, topped the UK charts.' },
      { year: 2015, title: '"See You Again"', kind: 'breakthrough', story: 'His song with Wiz Khalifa for Furious 7 spent 12 weeks at #1 on the Billboard Hot 100.' },
      { year: 2017, title: '"Attention"', kind: 'biggest-hit', story: 'A self-produced lead single from Voicenotes that reached the Hot 100 top 5.' },
      { year: 2022, title: '"Left and Right"', kind: 'milestone', story: 'A duet with Jung Kook of BTS, linking two QuickSeat headliners.' },
      { year: 2026, title: 'One Night Only Tour', kind: 'this-tour', story: 'The shows on sale on QuickSeat right now.' },
    ],
  },
]

// Six named blocks per arena, laid out around the stage like a real venue map.
// Prices: [Floor A, Floor B, Section 12, Section 32, Section 34, Section 120].
function makeSections(prices: [number, number, number, number, number, number]): Section[] {
  const [fa, fb, s12, s32, s34, s120] = prices
  return [
    { id: 'floor-a', name: 'Floor A', kind: 'standing', position: 'front', rows: 0, seatsPerRow: 0, price: fa },
    { id: 'floor-b', name: 'Floor B', kind: 'standing', position: 'front', rows: 0, seatsPerRow: 0, price: fb },
    { id: 's12', name: 'Section 12', kind: 'seated', position: 'side', rows: 6, seatsPerRow: 12, price: s12 },
    { id: 's32', name: 'Section 32', kind: 'seated', position: 'side', rows: 6, seatsPerRow: 12, price: s32 },
    { id: 's34', name: 'Section 34', kind: 'seated', position: 'rear', rows: 7, seatsPerRow: 14, price: s34 },
    { id: 's120', name: 'Section 120', kind: 'seated', position: 'upper', rows: 8, seatsPerRow: 16, price: s120 },
  ]
}

export const arenas: Arena[] = [
  { id: 'rod-laver', name: 'Rod Laver Arena', city: 'Melbourne', timeZone: 'Australia/Melbourne', sections: makeSections([179, 159, 165, 165, 135, 105]) },
  { id: 'qudos', name: 'Qudos Bank Arena', city: 'Sydney', timeZone: 'Australia/Sydney', sections: makeSections([169, 149, 159, 159, 129, 99]) },
  { id: 'rac', name: 'RAC Arena', city: 'Perth', timeZone: 'Australia/Perth', sections: makeSections([189, 165, 169, 169, 139, 109]) },
  { id: 'bec', name: 'Brisbane Entertainment Centre', city: 'Brisbane', timeZone: 'Australia/Brisbane', sections: makeSections([165, 145, 155, 155, 125, 95]) },
]

export const cities = ['Sydney', 'Melbourne', 'Brisbane', 'Perth']

export const seedTours: Tour[] = [
  { id: 'eras-encore', artistId: 'taylor-swift', name: 'The Eras Tour: Encore', tagline: 'Every era, one more time. Australia only.' },
  { id: 'ptd-australia', artistId: 'bts', name: 'Permission to Dance: Australia', tagline: 'Seven voices, one stage, all the hits.' },
  { id: 'one-night-only', artistId: 'charlie-puth', name: 'One Night Only Tour', tagline: 'Just Charlie, a piano and the songs you know.' },
]

// Sale times are relative to page load so every sale state is always available to demo.
const LOADED_AT = Date.now()
const minutesFromLoad = (min: number) => new Date(LOADED_AT + min * 60_000).toISOString()

export const seedShows: Show[] = [
  { id: 'eras-syd', tourId: 'eras-encore', arenaId: 'qudos', date: '2027-02-16T19:00:00+11:00', saleOpensAt: minutesFromLoad(2), hasQueue: true, ticketLimit: 18000 },
  { id: 'eras-bne', tourId: 'eras-encore', arenaId: 'bec', date: '2027-02-21T19:00:00+10:00', saleOpensAt: minutesFromLoad(-3 * 24 * 60), hasQueue: true, soldOut: true, ticketLimit: 13000 },
  { id: 'ptd-per', tourId: 'ptd-australia', arenaId: 'rac', date: '2027-03-10T19:30:00+08:00', saleOpensAt: minutesFromLoad(-10), hasQueue: true, ticketLimit: 14000 },
  { id: 'ptd-mel', tourId: 'ptd-australia', arenaId: 'rod-laver', date: '2027-03-14T19:30:00+11:00', saleOpensAt: minutesFromLoad(3 * 24 * 60), hasQueue: true, ticketLimit: 14500 },
  { id: 'onl-mel', tourId: 'one-night-only', arenaId: 'rod-laver', date: '2026-12-05T20:00:00+11:00', saleOpensAt: minutesFromLoad(-2 * 24 * 60), hasQueue: false, ticketLimit: 12000 },
  { id: 'onl-syd', tourId: 'one-night-only', arenaId: 'qudos', date: '2026-12-08T20:00:00+11:00', saleOpensAt: minutesFromLoad(12 * 24 * 60), hasQueue: true, ticketLimit: 15000 },
]
