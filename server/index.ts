import { randomBytes, randomUUID } from 'node:crypto'
import express, { type NextFunction, type Request, type Response } from 'express'
import { arenas } from '../src/data.ts'
import { capacity, seatsTotal } from '../src/seats.ts'
import type { Artist, Booking, Concert, Role, User } from '../src/types.ts'
import { checkPassword, db, hashPassword, transaction } from './db.ts'

const PORT = Number(process.env.PORT ?? 3001)
const MAX_SEATS = 8

const app = express()
app.use(express.json())

// ---- helpers -------------------------------------------------------------

class HttpError extends Error {
  status: number
  // Which form field the error is about, so the UI can highlight it.
  field?: string
  constructor(status: number, message: string, field?: string) {
    super(message)
    this.status = status
    this.field = field
  }
}

type AuthedRequest = Request & { user: User }

const toUser = (r: any): User => ({ username: r.username, name: r.name, email: r.email, role: r.role as Role })

const toArtist = (r: any): Artist => ({ name: r.name, genre: r.genre, bio: r.bio, imageUrl: r.image_url })

const toConcert = (r: any): Concert => ({
  id: r.id,
  artist: r.artist,
  title: r.title,
  description: r.description,
  arenaId: r.arena_id,
  date: r.date,
  ticketLimit: r.ticket_limit,
})

function listBookings(username?: string): Booking[] {
  const rows = username
    ? db.prepare('SELECT * FROM bookings WHERE username = ? ORDER BY created_at DESC').all(username)
    : db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all()
  const seatsFor = db.prepare('SELECT seat_id FROM booking_seats WHERE booking_id = ? ORDER BY rowid')
  return rows.map((r: any) => ({
    id: r.id,
    concertId: r.concert_id,
    username: r.username,
    total: r.total,
    createdAt: r.created_at,
    seats: seatsFor.all(r.id).map((s: any) => s.seat_id),
  }))
}

const soldCount = (concertId: string) =>
  (db.prepare('SELECT COUNT(*) AS n FROM booking_seats WHERE concert_id = ?').get(concertId) as { n: number }).n

function startSession(user: User) {
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO sessions (token, username, created_at) VALUES (?, ?, ?)').run(
    token,
    user.username,
    new Date().toISOString(),
  )
  return { token, user }
}

function str(value: unknown, label: string, field = label.toLowerCase()) {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${label} is required.`, field)
  return value.trim()
}

const optionalStr = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

function checkArena(value: unknown) {
  const arena = arenas.find((a) => a.id === value)
  if (!arena) throw new HttpError(400, 'Unknown arena.', 'arenaId')
  return arena
}

function checkDate(value: unknown) {
  const date = str(value, 'Date')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'Date must be YYYY-MM-DD.', 'date')
  return date
}

function checkTicketLimit(value: unknown, arenaId: string, sold = 0) {
  const limit = Number(value)
  const max = capacity(checkArena(arenaId))
  if (!Number.isInteger(limit) || limit < 1) throw new HttpError(400, 'Tickets must be a whole number above 0.', 'ticketLimit')
  if (limit > max) throw new HttpError(400, `This arena only holds ${max} seats.`, 'ticketLimit')
  if (limit < sold) throw new HttpError(400, `${sold} tickets are already sold, so the limit can't go below that.`, 'ticketLimit')
  return limit
}

// Seat ids look like "floor:B7" – check the section, row and seat exist in this arena.
function isValidSeat(arenaId: string, seatId: string) {
  const match = /^([\w-]+):([A-Z])(\d+)$/.exec(seatId)
  const section = match && arenas.find((a) => a.id === arenaId)?.sections.find((s) => s.id === match[1])
  if (!match || !section) return false
  const row = match[2].charCodeAt(0) - 65
  const seat = Number(match[3])
  return row < section.rows && seat >= 1 && seat <= section.seatsPerRow
}

const bearer = (req: Request) => req.get('authorization')?.replace(/^Bearer /, '')

// ---- auth middleware -----------------------------------------------------

function requireUser(req: Request, _res: Response, next: NextFunction) {
  const token = bearer(req)
  const row = token && db.prepare('SELECT u.* FROM sessions s JOIN users u USING (username) WHERE s.token = ?').get(token)
  if (!row) throw new HttpError(401, 'Please log in.')
  ;(req as AuthedRequest).user = toUser(row)
  next()
}

function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if ((req as AuthedRequest).user.role !== 'admin') throw new HttpError(403, 'Admins only.')
  next()
}

// ---- auth routes ---------------------------------------------------------

// Log in with either a username or an email address.
app.post('/api/auth/login', (req, res) => {
  const login = str(req.body?.username, 'Username or email', 'username')
  const password = str(req.body?.password, 'Password')
  const row: any = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login, login)
  if (!row || !checkPassword(password, row.password_hash)) {
    throw new HttpError(401, 'That username/email and password don\'t match.', 'password')
  }
  res.json(startSession(toUser(row)))
})

app.post('/api/auth/register', (req, res) => {
  const name = str(req.body?.name, 'Name')
  const email = str(req.body?.email, 'Email').toLowerCase()
  const username = str(req.body?.username, 'Username')
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address.', 'email')
  if (!/^[a-zA-Z0-9_.]{3,20}$/.test(username)) {
    throw new HttpError(400, 'Usernames are 3–20 letters, numbers, dots or underscores.', 'username')
  }
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters.', 'password')
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
    throw new HttpError(409, 'That username is taken.', 'username')
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    throw new HttpError(409, 'An account with that email already exists.', 'email')
  }

  const user: User = { username, name, email, role: 'customer' }
  db.prepare('INSERT INTO users (username, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)').run(
    username,
    hashPassword(password),
    name,
    email,
    user.role,
  )
  res.status(201).json(startSession(user))
})

app.get('/api/auth/me', requireUser, (req, res) => {
  res.json((req as AuthedRequest).user)
})

app.post('/api/auth/logout', requireUser, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(bearer(req)!)
  res.status(204).end()
})

// ---- arenas & artists ----------------------------------------------------

app.get('/api/arenas', (_req, res) => {
  res.json(arenas)
})

app.get('/api/artists', (_req, res) => {
  res.json(db.prepare('SELECT * FROM artists ORDER BY name').all().map(toArtist))
})

// Create or update an artist's profile.
app.put('/api/artists/:name', requireUser, requireAdmin, (req, res) => {
  const artist: Artist = {
    name: str(String(req.params.name), 'Artist', 'artist'),
    genre: optionalStr(req.body?.genre),
    bio: optionalStr(req.body?.bio),
    imageUrl: optionalStr(req.body?.imageUrl),
  }
  db.prepare(
    `INSERT INTO artists (name, genre, bio, image_url) VALUES (?, ?, ?, ?)
     ON CONFLICT (name) DO UPDATE SET genre = excluded.genre, bio = excluded.bio, image_url = excluded.image_url`,
  ).run(artist.name, artist.genre, artist.bio, artist.imageUrl)
  res.json(artist)
})

// ---- concerts ------------------------------------------------------------

app.get('/api/concerts', (_req, res) => {
  res.json(db.prepare('SELECT * FROM concerts ORDER BY date').all().map(toConcert))
})

// Taken seat ids per concert, so customers can see availability without seeing other people's bookings.
app.get('/api/concerts/taken', (_req, res) => {
  const taken: Record<string, string[]> = {}
  for (const r of db.prepare('SELECT concert_id, seat_id FROM booking_seats').all() as any[]) {
    ;(taken[r.concert_id] ??= []).push(r.seat_id)
  }
  res.json(taken)
})

// Add one or more shows for an artist in one go: { artist, title, description, shows: [{ arenaId, date, ticketLimit }] }.
// A new artist gets a profile from the optional { genre, bio, imageUrl } fields.
app.post('/api/concerts', requireUser, requireAdmin, (req, res) => {
  const body = req.body ?? {}
  const artist = str(body.artist, 'Artist')
  const title = str(body.title, 'Title')
  const description = optionalStr(body.description)
  if (!Array.isArray(body.shows) || body.shows.length === 0) throw new HttpError(400, 'Add at least one show.', 'shows')

  const concerts: Concert[] = body.shows.map((s: any) => {
    const arenaId = checkArena(s?.arenaId).id
    return {
      id: randomUUID(),
      artist,
      title,
      description,
      arenaId,
      date: checkDate(s?.date),
      ticketLimit: checkTicketLimit(s?.ticketLimit, arenaId),
    }
  })

  transaction(() => {
    db.prepare('INSERT OR IGNORE INTO artists (name, genre, bio, image_url) VALUES (?, ?, ?, ?)').run(
      artist,
      optionalStr(body.genre),
      optionalStr(body.bio),
      optionalStr(body.imageUrl),
    )
    const add = db.prepare(
      'INSERT INTO concerts (id, artist, title, description, arena_id, date, ticket_limit) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    for (const c of concerts) add.run(c.id, c.artist, c.title, c.description, c.arenaId, c.date, c.ticketLimit)
  })
  res.status(201).json(concerts)
})

app.put('/api/concerts/:id', requireUser, requireAdmin, (req, res) => {
  const existing: any = db.prepare('SELECT * FROM concerts WHERE id = ?').get(String(req.params.id))
  if (!existing) throw new HttpError(404, 'Concert not found.')
  const body = req.body ?? {}
  const sold = soldCount(existing.id)
  const arenaId = checkArena(body.arenaId).id
  if (sold && arenaId !== existing.arena_id) {
    throw new HttpError(409, 'Arena is locked because tickets have been sold.', 'arenaId')
  }
  const concert: Concert = {
    id: existing.id,
    artist: str(body.artist, 'Artist'),
    title: str(body.title, 'Title'),
    description: optionalStr(body.description),
    arenaId,
    date: checkDate(body.date),
    ticketLimit: checkTicketLimit(body.ticketLimit, arenaId, sold),
  }
  db.prepare(
    'UPDATE concerts SET artist = ?, title = ?, description = ?, arena_id = ?, date = ?, ticket_limit = ? WHERE id = ?',
  ).run(concert.artist, concert.title, concert.description, concert.arenaId, concert.date, concert.ticketLimit, concert.id)
  res.json(concert)
})

app.delete('/api/concerts/:id', requireUser, requireAdmin, (req, res) => {
  const { changes } = db.prepare('DELETE FROM concerts WHERE id = ?').run(String(req.params.id))
  if (!changes) throw new HttpError(404, 'Concert not found.')
  res.status(204).end()
})

// ---- bookings ------------------------------------------------------------

// Admins see every booking, customers only their own.
app.get('/api/bookings', requireUser, (req, res) => {
  const { user } = req as AuthedRequest
  res.json(listBookings(user.role === 'admin' ? undefined : user.username))
})

app.post('/api/bookings', requireUser, (req, res) => {
  const { user } = req as AuthedRequest
  const concertId = str(req.body?.concertId, 'Concert')
  const seats: unknown = req.body?.seats
  const concert: any = db.prepare('SELECT * FROM concerts WHERE id = ?').get(concertId)
  if (!concert) throw new HttpError(404, 'Concert not found.')
  if (!Array.isArray(seats) || seats.length === 0 || seats.length > MAX_SEATS) {
    throw new HttpError(400, `Pick between 1 and ${MAX_SEATS} seats.`)
  }
  if (new Set(seats).size !== seats.length || !seats.every((s) => typeof s === 'string' && isValidSeat(concert.arena_id, s))) {
    throw new HttpError(400, 'Invalid seat selection.')
  }

  // Price is worked out here, not trusted from the client.
  const arena = arenas.find((a) => a.id === concert.arena_id)!
  const booking: Booking = {
    id: randomUUID(),
    concertId,
    username: user.username,
    seats,
    total: seatsTotal(arena, seats),
    createdAt: new Date().toISOString(),
  }

  try {
    transaction(() => {
      const left = concert.ticket_limit - soldCount(concertId)
      if (seats.length > left) {
        throw new HttpError(409, left > 0 ? `Only ${left} ticket(s) left for this show.` : 'This show is sold out.')
      }
      db.prepare('INSERT INTO bookings (id, concert_id, username, total, created_at) VALUES (?, ?, ?, ?, ?)').run(
        booking.id,
        booking.concertId,
        booking.username,
        booking.total,
        booking.createdAt,
      )
      const addSeat = db.prepare('INSERT INTO booking_seats (concert_id, seat_id, booking_id) VALUES (?, ?, ?)')
      for (const seat of seats) addSeat.run(concertId, seat, booking.id)
    })
  } catch (err: any) {
    if (String(err?.message).includes('UNIQUE')) {
      throw new HttpError(409, 'Sorry, one of those seats was just taken. Please pick again.')
    }
    throw err
  }
  res.status(201).json(booking)
})

// ---- errors --------------------------------------------------------------

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, field: err.field })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' })
  console.error(err)
  res.status(500).json({ error: 'Something went wrong.' })
})

app.listen(PORT, () => {
  console.log(`QuickSeat API listening on http://localhost:${PORT}`)
})
