# QuickSeat

A small concert ticketing prototype (React + TypeScript, Vite, with an Express + SQLite backend). The idea: cut the waiting time
for people booking tickets by letting them pick their exact seats and book instantly.

## Run

Requires Node 24+ (the server uses Node's built-in TypeScript support and `node:sqlite`).

```bash
npm install
npm run dev
```

This starts both the API on http://localhost:3001 and the web app on http://localhost:5173
(Vite forwards `/api` requests to the API). Run them separately with `npm run dev:server` and `npm run dev:web`.

## Demo accounts

| Role     | Username | Password    |
| -------- | -------- | ----------- |
| Admin    | admin    | admin123    |
| Customer | customer | customer123 |

Customers can also sign up from the login page.

## Features

- **Homepage**: hero with search and city filters, artist line-up with photos, upcoming shows with live availability, arena guide.
- **Artist pages**: photo, bio, number of shows, cities and every tour date.
- **Arena seat map**: seats drawn in curved rows around the stage, coloured by section/price. Pick up to 8 seats.
- **Accounts**: sign up with name, email, username and password (validated, with a strength meter), log in with username or email.
  Guests can pick seats first; they're kept through login.
- **My tickets**: ticket-style cards for each booking.
- **Admin dashboard**: sales overview; add a tour with several shows at once, each with its own arena, date and number of
  tickets for sale; edit ticket counts, dates and arenas; manage artist photos/bios; see all bookings.
- Seeded with Taylor Swift, BTS, Charlie Puth, Dua Lipa, Ed Sheeran and Coldplay at Australian arenas.

Data is stored in a SQLite database at `server/quickseat.db`, created and seeded with the demo accounts and
concerts on first run. Delete that file and restart the server to reset. Set `PORT` or `DB_FILE` to override the defaults.

## API

| Method | Path                    | Who      | Notes                                         |
| ------ | ----------------------- | -------- | --------------------------------------------- |
| POST   | `/api/auth/login`       | anyone   | `{ username, password }` → `{ token, user }`  |
| POST   | `/api/auth/register`    | anyone   | `{ name, email, username, password }`         |
| GET    | `/api/auth/me`          | logged in| current user                                  |
| POST   | `/api/auth/logout`      | logged in|                                               |
| GET    | `/api/arenas`           | anyone   |                                               |
| GET    | `/api/concerts`         | anyone   | sorted by date                                |
| GET    | `/api/concerts/taken`   | anyone   | `{ [concertId]: seatId[] }`                   |
| GET    | `/api/artists`          | anyone   |                                               |
| PUT    | `/api/artists/:name`    | admin    | create/update `{ genre, bio, imageUrl }`      |
| POST   | `/api/concerts`         | admin    | `{ artist, title, description, shows: [{ arenaId, date, ticketLimit }] }` |
| PUT    | `/api/concerts/:id`     | admin    | arena locked once sold; ticketLimit ≥ sold, ≤ capacity |
| DELETE | `/api/concerts/:id`     | admin    | also deletes its bookings                     |
| GET    | `/api/bookings`         | logged in| admins see all, customers see their own       |
| POST   | `/api/bookings`         | logged in| `{ concertId, seats }`, max 8, priced server-side; 409 if a seat is taken |

Send the token as `Authorization: Bearer <token>`. Passwords are hashed with scrypt.

## Structure

- `src/data.ts` – arenas (with seating sections), seed concerts, demo users
- `src/types.ts` – shared types
- `src/seats.ts` – seat id / price helpers
- `src/api.ts` – API client (keeps the login token in localStorage)
- `src/store.ts` – loads app data from the API; `src/router.ts` – tiny hash router
- `src/pages/` – Home, ArtistPage, ShowPage, AuthPage, MyTickets, AdminPage
- `src/components/ArenaMap.tsx` – SVG seat map
- `public/artists/` – artist photos (credits in `CREDITS.md`)
- `server/index.ts` – Express routes
- `server/db.ts` – SQLite schema, password hashing, first-run seeding
- `src/components/` – Nav, ShowRow, ArtistImage, ArenaMap
