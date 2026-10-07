# QuickSeat

A small concert ticketing prototype (React + TypeScript, Vite). The idea: cut the waiting time
for people booking tickets by letting them pick their exact seats and book instantly.

## Run

```bash
npm install
npm run dev
```

## Demo accounts

| Role     | Username | Password    |
| -------- | -------- | ----------- |
| Admin    | admin    | admin123    |
| Customer | customer | customer123 |

Customers can also sign up from the login page.

## Features

- **Customer panel**: browse concerts, choose seats on a seat map split into sections (each with its own price), book up to 8 seats, see "My bookings".
- **Admin panel**: add concerts (artist, title, description, arena, date), change a concert's arena (until tickets are sold), delete concerts, see sales and all bookings.
- Seeded with Charlie Puth, Taylor Swift and BTS shows at Australian arenas (Rod Laver Arena, Qudos Bank Arena, RAC Arena, Brisbane Entertainment Centre).

Data is stored in the browser's localStorage (no backend). Clear site data to reset.

## Structure

- `src/data.ts` – arenas (with seating sections), seed concerts, demo users
- `src/types.ts` – shared types
- `src/seats.ts` – seat id / price helpers
- `src/storage.ts` – localStorage-backed state hook
- `src/components/` – Login, CustomerPanel, AdminPanel, SeatMap
