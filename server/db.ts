import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { seedArtists, seedConcerts, seedUsers } from '../src/data.ts'

const file = process.env.DB_FILE ?? fileURLToPath(new URL('./quickseat.db', import.meta.url))

export const db = new DatabaseSync(file)

// Bump when the schema changes. Older databases only hold demo data, so they are rebuilt from scratch.
const SCHEMA_VERSION = 2

if ((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version < SCHEMA_VERSION) {
  db.exec(`
    DROP TABLE IF EXISTS booking_seats;
    DROP TABLE IF EXISTS bookings;
    DROP TABLE IF EXISTS concerts;
    DROP TABLE IF EXISTS artists;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS users;
    PRAGMA user_version = ${SCHEMA_VERSION};
  `)
}

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    username      TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'customer'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    username   TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS artists (
    name      TEXT PRIMARY KEY,
    genre     TEXT NOT NULL,
    bio       TEXT NOT NULL,
    image_url TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS concerts (
    id          TEXT PRIMARY KEY,
    artist      TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    arena_id     TEXT NOT NULL,
    date         TEXT NOT NULL,
    ticket_limit INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id         TEXT PRIMARY KEY,
    concert_id TEXT NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
    username   TEXT NOT NULL REFERENCES users(username),
    total      INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  -- One row per booked seat; the primary key stops a seat being sold twice.
  CREATE TABLE IF NOT EXISTS booking_seats (
    concert_id TEXT NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
    seat_id    TEXT NOT NULL,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    PRIMARY KEY (concert_id, seat_id)
  );
`)

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64))
}

// Run fn inside a transaction, rolling back if it throws.
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

// Seed demo users and concerts the first time the database is created.
if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
  transaction(() => {
    const addUser = db.prepare('INSERT INTO users (username, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)')
    for (const u of seedUsers) addUser.run(u.username, hashPassword(u.password), u.name, u.email, u.role)

    const addArtist = db.prepare('INSERT INTO artists (name, genre, bio, image_url) VALUES (?, ?, ?, ?)')
    for (const a of seedArtists) addArtist.run(a.name, a.genre, a.bio, a.imageUrl)

    const addConcert = db.prepare(
      'INSERT INTO concerts (id, artist, title, description, arena_id, date, ticket_limit) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    for (const c of seedConcerts) {
      addConcert.run(c.id, c.artist, c.title, c.description, c.arenaId, c.date, c.ticketLimit)
    }
  })
  console.log(`Seeded database at ${file}`)
}
