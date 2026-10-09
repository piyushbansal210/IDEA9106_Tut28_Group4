# QuickSeat

A concert-ticketing prototype for IDEA9106 (React + TypeScript + Vite, frontend only). It's built around a researched
user journey: **the queue can't be avoided, but it doesn't have to be blind.** Fans set a ticket plan before the sale,
join a fair simulated queue that tracks their sections live, and only get interrupted when their plan changes.

The full design brief and build steps are in [docs/redesign-agent-instructions.md](docs/redesign-agent-instructions.md).

## Run

Requires Node 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Demo accounts

| Role     | Username | Password    |
| -------- | -------- | ----------- |
| Customer | customer | customer123 |
| Admin    | admin    | admin123    |

## Demo script

Sale times are relative to page load, so every sale state is always available:

| Show | State |
| --- | --- |
| Taylor Swift · Sydney | Waiting room open, queue opens **2 minutes** after load |
| Taylor Swift · Brisbane | Sold out (waitlist) |
| BTS · Perth | Queue open now |
| BTS · Melbourne | Presale in 3 days |
| Charlie Puth · Melbourne | On sale, no queue |
| Charlie Puth · Sydney | Announced (12 days) |

1. Land on the homepage: a soft login pop-up appears after ~2s. Choose **Just browsing**.
2. Open the palette icon in the navbar and try **Earth Red**, then **Sand**: the navbar text switches to dark automatically.
3. Open **Permission to Dance: Australia** → Perth → **Join queue**. Log in as `customer` when asked; the plan
   opens straight away. Pick 2 tickets, ≤ $180, rank three sections, choose **Ask me first**, save.
4. Tap the record in the bottom-right for an opt-in soundtrack, and explore the story waveform.
5. Add `?demo=1` to the URL (e.g. `#/tour/ptd-australia/show/ptd-per/queue?demo=1`) for demo controls: speed ×1/×10/×50,
   jump to the next event, or restart with the sold-out storyline.
6. Answer the decision pop-up when a section sells out, reach **It's your turn**, check out within 8 minutes.
7. Re-run with the sold-out storyline to see the waitlist outcome.

## Features

- **Landing page:** hero carousel with live countdowns, poster tour cards with status badges, city filter, search,
  "How QuickSeat works".
- **Login:** a soft, dismissible welcome pop-up, plus login asked for only when an action needs it (then it resumes
  that action). Sign-up has validation and a strength meter.
- **Tour page:** dates in your time zone (plus venue time), ticket plan (quantity, price guardrail, 3 ranked sections on the
  arena map, "ask me first" vs "move on automatically"), ready-to-buy checklist, artist story preview.
- **Waiting room → queue → your turn → outcome**, modelled on the reference screens: people ahead, best-chance sentence,
  one alert at a time, sections-along-the-queue chart, plan table, decision pop-up with a 60s timer, pre-picked best seats,
  checkout timer, success tickets with calendar download, or sold-out waitlist / face-value resale.
- **Record player:** never autoplays. Tapping it plays a generated mood loop for the artist (original tones, not
  recordings), with volume, next, minimise, and a Spotify embed for the real songs. It pauses itself at your turn.
- **Alerts:** soft chime (Web Audio) and optional browser notifications; the tab title shows your progress.
- **Themes:** white base, black navbar by default, switchable to the Desert Chic palette (Orange Rust, Honey Ginger,
  Sand, Earth Red, Sandstone). Text colour is picked automatically for WCAG AA contrast, and colours that can't reach it
  are darkened slightly. Optional "Match the artist" mode.
- **My tickets** and **Admin** (edit tours, posters, sale times, sold-out flags, add/delete shows, bookings, reset demo data).

## Adding real media

- Posters: put licensed images at `public/artists/<artistId>.jpg` and set the poster URL in Admin (or `posterUrl` in
  `src/data.ts`). Without one, a generated poster is used.
- Audio: put licensed or royalty-free clips in `public/audio/<artistId>/` and set `clipUrl` on a milestone in
  `src/data.ts`; the story timeline then offers "Play a snippet" through the record player.

## Structure

- `src/data.ts`: artists (bios, milestones), arenas and sections, tours, shows
- `src/store.tsx`: app state (auth, bookings, plans, waitlists, admin edits) saved to localStorage
- `src/queue/simulator.ts`: deterministic queue simulation and storylines (no React)
- `src/theme.ts`: theme palette and contrast engine; `src/audio.ts`: record player, chime and notifications
- `src/sale.ts`: sale status rules; `src/actions.ts`: what each status's button does; `src/router.ts`: hash router
- `src/pages/`: Landing, TourPage, WaitingRoom, QueuePage, SeatsPage, OutcomePage, MyTickets, AdminPage, HelpPage
- `src/components/`: Navbar, ThemePicker, Poster, StatusBadge, Countdown, ArenaMap, PlanModal, QueueChart,
  StoryTimeline, RecordPlayer, LoginModal, Modal, Toasts, TicketCard

Artist facts in `src/data.ts` should be double-checked before presenting.
