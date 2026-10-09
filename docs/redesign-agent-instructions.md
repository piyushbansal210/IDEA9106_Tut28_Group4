# QuickSeat Redesign — Step-by-Step Build Instructions for a Coding Agent

> **Audience:** an AI coding agent (or developer) working in this repository on the `anu-aj` branch.
> **How to use:** work through the steps **in order**. Each step lists what to build and its
> **acceptance criteria**. Do not start a step until the previous one passes `npm run build` and its
> acceptance criteria. Commit after each step with a message like `Step 4: landing page`.

---

## 0. Context

QuickSeat is a concert-ticketing prototype for a design-thinking course (IDEA9106). The redesign
answers a researched user journey. Every feature below exists to fix a specific pain point:

| Journey stage | User pain point | Feature that addresses it |
| --- | --- | --- |
| Announcement | Unclear dates, venues, timezones | Landing page tour cards with dates in local time, status badges |
| Presale / registration | "No idea if I'm registered", no confirmation | Soft login pop-up + explicit "You're registered" confirmation |
| Preparation | Friends on separate devices, payment might fail | "Ready to buy" checklist, ticket plan set up in advance |
| Waiting room | Anxiety, fear of losing spot, refreshing | Waiting room with countdown + "No need to refresh" reassurance |
| Queue assigned | Feels arbitrary or rigged; number has no meaning | "Your place is random and fair" screen |
| In queue | Stuck guessing, can't look away | Live ranked-section status, one alert at a time, artist story to explore, opt-in music |
| Decision point | Doesn't know whether to keep waiting | Rule applied automatically, or an "Ask me first" prompt |
| Front of queue | Seats vanish during selection, price jumps | Pre-ranked sections pre-selected, price guardrail, visible checkout timer |
| Outcome | Sold out, unexplained | Graceful outcome screen with a summary |
| Aftermath | Re-queuing from zero | Waitlist carried forward, face-value resale, group update |

### Current state of the code (branch `anu-aj`)

- React 19 + TypeScript + Vite 8, **frontend only**; data is kept in `localStorage` via
  `usePersistentState` in `src/storage.ts`.
- `src/App.tsx` switches between `Login`, `CustomerPanel`, `AdminPanel` (in `src/components/`).
- `src/data.ts` holds arenas, seed concerts and demo users; `src/seats.ts` has seat helpers;
  `src/components/SeatMap.tsx` draws a seat grid.
- Demo accounts: `admin` / `admin123`, `customer` / `customer123`.

---

## 1. Ground rules (apply to every step)

1. **Keep the stack.** React + TypeScript + Vite, no backend, no new state library. Add no
   runtime dependencies unless a step explicitly allows it. Plain CSS with custom properties, no
   Tailwind.
2. **Keep it working.** After every step `npm run build` must pass with zero TypeScript errors and
   the app must run with `npm run dev`.
3. **Artists are exactly three:** Taylor Swift, BTS, Charlie Puth. Remove any other artist data.
4. **No autoplay audio, ever.** Sound only plays after the user explicitly presses play.
5. **No real ticketing branding.** The product is **QuickSeat**. Do not use Ticketmaster or Live
   Nation names, logos or URLs anywhere in the UI.
6. **No copyrighted media committed to the repo.** Do not download artist photos or songs.
   Use generated poster placeholders (Step 4) and the audio approach in Step 13. Real, licensed files
   can be dropped in later at the documented paths.
7. **Accessibility is required, not optional:** WCAG 2.2 AA contrast, full keyboard use, visible
   focus rings, `prefers-reduced-motion` respected, all icons/images labelled.
8. **Responsive:** every page works from 360px to 1440px wide with no horizontal scroll.
9. Match the existing code style: function components, small files, short comments only where the
   *why* is not obvious.

---

## 2. Design system

### 2.1 Colour

White is the base colour of the whole site. The navbar is black by default, and the user can switch
it (and the accent colour) to any colour from the **Desert Chic** palette.

**Neutral tokens (fixed):**

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#FFFFFF` | Page background (dominant colour) |
| `--surface` | `#FAF8F5` | Cards, panels (warm off-white) |
| `--surface-2` | `#F3EFE9` | Hover states, table stripes, chips |
| `--border` | `#E6E0D8` | Hairlines, card borders |
| `--ink` | `#1A1A1A` | Primary text |
| `--ink-muted` | `#5F5A54` | Secondary text (≥ 4.5:1 on white) |
| `--success` | `#2F7D5B` | "Likely", "On sale", confirmations |
| `--warning-bg` | `#FDF3E1` | Alert banner background |
| `--warning-border` | `#E3B566` | Alert banner border |
| `--danger` | `#B3261E` | Errors, "Sold out" text |

**Theme palette (user-selectable):**

| Theme id | Name | Swatch hex | Auto text colour | Contrast note |
| --- | --- | --- | --- | --- |
| `noir` | Black (default) | `#111111` | white | 18.9:1 |
| `orange-rust` | Orange Rust 18-1447 | `#C25A3C` | white | Only 4.36:1, **fails AA**. Engine must darken the background (see 2.2) |
| `honey-ginger` | Honey Ginger 18-1050 | `#A86217` | white | 4.75:1 ✓ |
| `sand` | Sand | `#CDB48C` | ink `#1A1A1A` | white would be 2.0:1 ✗, ink 8.7:1 ✓ |
| `earth-red` | Earth Red 18-1631 | `#95424E` | white | 6.63:1 ✓ |
| `sandstone` | Sandstone | `#C48A69` | ink `#1A1A1A` | white would be 2.9:1 ✗, ink 5.96:1 ✓ |

**Theme tokens (change when the theme changes):**

| Token | Meaning |
| --- | --- |
| `--nav-bg` | Navbar background (the theme colour, contrast-adjusted) |
| `--nav-fg` | Navbar text/icon colour (white or ink, chosen automatically) |
| `--accent` | Primary buttons, active states, selected seats, progress |
| `--accent-fg` | Text on `--accent` |
| `--accent-soft` | 12% tint of accent for chips, highlights, timeline bars |
| `--focus` | Focus ring colour (accent at full strength, 3px outline, 2px offset) |

For the `noir` theme, `--accent` is `#111111` (black buttons on white).

### 2.2 Theme engine ("switchable automatically")

Create `src/theme.ts` and `src/components/ThemePicker.tsx`.

1. Define the six themes above as data: `{ id, name, swatch }`.
2. `applyTheme(id)` must:
   - compute the WCAG relative luminance of the swatch;
   - choose `--nav-fg` automatically: whichever of white `#FFFFFF` or ink `#1A1A1A` gives the higher
     contrast ratio;
   - if that best ratio is still **below 4.5:1**, darken the swatch in 3% lightness steps (HSL) until
     white text reaches 4.5:1. Use the result as `--nav-bg`/`--accent`. This is what fixes Orange Rust.
     Show the **original** swatch in the picker;
   - derive `--accent-soft` as the swatch at 12% opacity over white;
   - write all tokens onto `document.documentElement.style` so the **entire UI re-themes
     instantly**, with no reload;
   - set `<meta name="theme-color">` to the nav colour (mobile browser chrome).
3. Persist the choice in `localStorage` under `quickseat:theme` (wrap in try/catch). Apply it
   **before first paint** with a tiny inline script in `index.html`, so there is no black→colour
   flash on load.
4. Add a CSS transition `background-color 200ms, color 200ms` on themed elements. Disable it under
   `prefers-reduced-motion: reduce`.
5. **ThemePicker UI:** a palette icon button in the navbar opens a small popover with six round
   swatches (40px, labelled with the colour name for screen readers, checkmark on the active one). It
   should also have a **"Reset to black"** link. Arrow keys move between swatches, Enter selects, and
   Esc closes the popover.
6. **Optional (implement last, behind a toggle in the picker): "Match the artist".** When on, the
   theme switches automatically on artist pages: Taylor Swift → Earth Red, BTS → Honey Ginger,
   Charlie Puth → Orange Rust. It reverts to the user's chosen theme elsewhere. Off by default.

**Acceptance:** picking each swatch changes navbar + buttons immediately; text in the navbar is
always ≥ 4.5:1 (verify by logging computed ratios in dev); the choice survives reload with no flash.

### 2.3 Typography, spacing, shape

- Font: **Inter** from Google Fonts (weights 400, 500, 600, 700) with `system-ui` fallback.
  Numbers in the queue counter use `font-variant-numeric: tabular-nums` so digits don't jump.
- Scale: 12 / 14 / 16 (body) / 20 / 24 / 32 / 48 / 64 (queue counter) px.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 px. Page gutter 16px on mobile, max content width
  1200px.
- Radius: 8px (inputs, chips), 12px (cards), 999px (pills, swatches). Soft shadow only on hover and
  on modals.
- Status vocabulary, **identical everywhere** (use one shared `StatusBadge` component):
  `Presale soon` · `On sale in …` · `Queue open` · `On sale` · `Selling fast` · `Sold out` and, in
  the queue: `Likely` · `At risk` · `Unlikely` · `Sold out` · `Can't seat N together`.
  Each badge pairs an icon with text. Never rely on colour alone.

---

## 3. Step-by-step build

### Step 1 — Design tokens and app shell

1. Replace `src/index.css` with a token-based stylesheet: `:root` neutral tokens from 2.1, base
   element styles, utility classes (`.container`, `.stack`, `.row`, `.muted`, `.visually-hidden`),
   button styles (`.btn`, `.btn-primary` using `--accent`, `.btn-secondary` outlined, `.btn-ghost`),
   input styles, card styles, and a global `:focus-visible` ring.
2. Add Inter via `<link>` in `index.html`.
3. Build `src/theme.ts` and `ThemePicker` exactly as in section 2.2.
4. Create `src/components/Navbar.tsx`: background `--nav-bg`, text `--nav-fg`. Left: QuickSeat
   wordmark. Centre (desktop): search input ("Search artist, city or venue"). Right: city selector,
   ThemePicker, **Log in / Sign up** button, or, when logged in, an avatar menu (My tickets,
   Admin if admin, Log out). On mobile, collapse the search into an icon and the links into a menu.
5. Create `src/components/Footer.tsx` (Help, FAQ, Accessibility, Terms as plain links).
6. Add a minimal **hash router** `src/router.ts` (`useRoute()` returning the parsed `location.hash`,
   and `navigate(path)`), with no new dependency. Routes:
   - `#/` landing
   - `#/tour/:tourId` tour page
   - `#/tour/:tourId/show/:showId/waiting` waiting room
   - `#/tour/:tourId/show/:showId/queue` queue
   - `#/tour/:tourId/show/:showId/seats` your turn / seat selection
   - `#/tour/:tourId/show/:showId/outcome` outcome
   - `#/tickets` my tickets
   - `#/admin` admin
   - unknown routes show a friendly 404 with a link home.
7. `App.tsx` becomes: Navbar + routed page + Footer + global overlays (login modal, record player).

**Acceptance:** blank pages render for every route inside the shell; theme switching works.

### Step 2 — Data model and seed data

Update `src/types.ts`:

```ts
export type SaleStatus = 'announced' | 'presale-soon' | 'waiting-room' | 'queue-open' | 'on-sale' | 'sold-out'

export interface Artist {
  id: 'taylor-swift' | 'bts' | 'charlie-puth'
  name: string
  genre: string
  bio: string                 // 2–3 sentences
  posterUrl?: string          // optional real image at /artists/<id>.jpg; fall back to generated poster
  posterGradient: [string, string] // colours for the generated poster
  spotifyArtistId: string
  milestones: Milestone[]
}

export interface Milestone {
  year: number
  title: string               // song or event
  kind: 'first-release' | 'breakthrough' | 'biggest-hit' | 'milestone' | 'this-tour'
  story: string               // one sentence
  clipUrl?: string            // optional local audio clip, see Step 13
}

export interface Tour {
  id: string
  artistId: Artist['id']
  name: string                // tour name shown on the poster
  tagline: string
  shows: Show[]
}

export interface Show {
  id: string
  arenaId: string
  date: string                // ISO date-time with timezone offset
  saleOpensAt: string         // ISO date-time; drives countdowns
  status: SaleStatus          // seeded; recomputed from saleOpensAt at runtime (see below)
  ticketLimit: number
}

export interface TicketPlan {
  showId: string
  quantity: number            // 1–8
  maxPricePerTicket: number
  rankedSectionIds: string[]  // 1–3, in order of preference
  rule: 'auto-next' | 'ask-me'
}
```

Keep `User`, `Arena`, `Section` and `Booking`. Extend `Section` with `kind: 'standing' | 'seated'` and
`position: 'front' | 'side' | 'rear' | 'upper'`.

Seed data in `src/data.ts`:

- **Artists:** Taylor Swift, BTS, Charlie Puth with bios and the milestones below. **The agent must
  double-check each fact before finalising.** Flag any it cannot confirm with a `// TODO verify`
  comment rather than inventing details.

  | Artist | Year | Title | Kind |
  | --- | --- | --- | --- |
  | Taylor Swift | 2006 | "Tim McGraw" (debut single) | first-release |
  | Taylor Swift | 2008 | "Love Story" | breakthrough |
  | Taylor Swift | 2014 | "Shake It Off" | biggest-hit |
  | Taylor Swift | 2023 | The Eras Tour begins | milestone |
  | BTS | 2013 | "No More Dream" (debut) | first-release |
  | BTS | 2015 | "I Need U" (first music-show win) | breakthrough |
  | BTS | 2017 | "DNA" (first Billboard Hot 100 entry) | milestone |
  | BTS | 2020 | "Dynamite" (first Hot 100 #1) | biggest-hit |
  | Charlie Puth | 2015 | "Marvin Gaye" (debut single) | first-release |
  | Charlie Puth | 2015 | "See You Again" with Wiz Khalifa | breakthrough |
  | Charlie Puth | 2017 | "Attention" | biggest-hit |
  | Charlie Puth | 2022 | "Left and Right" feat. Jung Kook of BTS | milestone |

  Add a final `this-tour` milestone per artist linking to their QuickSeat tour.
- **Spotify artist ids** (verify by opening `https://open.spotify.com/artist/<id>`):
  Taylor Swift `06HL4z0CvFAxyc27GXpf02`, BTS `3Nrfpe0tUJi4K4DXYWgMUX`, Charlie Puth
  `6VuMaDnrHyPL1p4EHjYLi7`.
- **Tours:** one tour per artist (reuse the current titles: "The Eras Tour: Encore",
  "Permission to Dance: Australia", "One Night Only Tour"), each with 2–3 shows across the four
  arenas.
- **Arenas:** keep the four arenas. Expand each to six named sections so the queue plan has real
  choices, e.g. Floor A (front standing), Floor B (standing), Section 12 (side), Section 32 (side),
  Section 34 (rear), Section 120 (upper), with prices from $99 to $250.
- **Demo-friendly sale times:** compute `saleOpensAt` **relative to page load** so the demo always
  has every state available:
  - one show: queue opens in **2 minutes** (shows the countdown → waiting room → queue live);
  - one show: queue already open;
  - one show: on sale now (no queue);
  - one show: presale in 3 days;
  - one show: sold out (to demo the waitlist).
- Add `getShowStatus(show, now)` in `src/sale.ts` that derives the live status from `saleOpensAt`
  (waiting room opens 30 min before; queue opens at `saleOpensAt`).
- Bump the localStorage keys (e.g. `quickseat:v2:*`) so old saved data doesn't break the new shape.

**Acceptance:** build passes; a dev-only `console.table` of shows lists all five sale states.

### Step 3 — Shared components

Build these before pages:

- `StatusBadge`: icon + label, using the vocabulary in 2.3.
- `Countdown`: props `{ to: string, onDone?: () => void }`; renders `02d 14h 36m 12s`, or
  `14:36` under an hour. Ticks every second, uses `tabular-nums`, has an `aria-live="polite"`
  summary that updates **once per minute** only (not every second), and calls `onDone` at zero.
- `Poster`: renders `posterUrl` if present; otherwise a **generated poster**: a vertical 3:4 card
  with a `posterGradient` background, subtle grain/noise SVG, the artist name in large bold type
  and the tour name beneath. It must look intentional, not like a missing image.
- `Modal`: focus-trapped, Esc and × close, returns focus to the trigger, dims the page, `role="dialog"`
  with `aria-labelledby`.
- `Toast`: bottom-left stack, auto-dismiss after 5s, pausable on hover.

### Step 4 — Landing page (`#/`)

Ticketing-site layout, top to bottom, all on the white base:

1. **Hero carousel:** the three tours as full-width slides. Each slide shows the poster on one side
   and, on the other, the tour name, artist, the next show's city and date, a status badge, the big
   `Countdown` to the next sale, and one primary button whose label follows the status:
   `Remind me` / `Join waiting room` / `Join queue` / `Buy tickets` / `Join waitlist`. Pause autoplay
   rotation on hover/focus, include prev/next buttons and dots, and do not auto-rotate under
   reduced motion.
2. **"On sale soon" grid:** three large tour cards (poster 3:4, tour name over a gradient at the
   bottom, artist name, city chips such as `Sydney · Melbourne`, a status badge with a live countdown
   where relevant). The whole card is one link to the tour page.
3. **"Browse by city":** tiles for Sydney, Melbourne, Brisbane, Perth. Clicking filters the grid
   (shared with the navbar city selector).
4. **"How QuickSeat works":** three steps with simple icons: *Set your plan → Join a fair queue →
   Get alerted, look away.*
5. Navbar search filters by artist, tour, city or arena. Show "No results for '…'" with a reset link.

**Acceptance:** at 360px the grid is one column; at ≥ 1024px three columns; every countdown
ticks; the card with "queue opens in 2 minutes" flips its badge to `Queue open` live without reload.

### Step 5 — Login pop-up and auth

Two layers, using one `LoginModal`:

1. **Soft welcome pop-up:** on the first visit of a session, ~2 seconds after the landing page loads
   (or on first scroll, whichever comes first), show a modal: *"Log in to set your ticket plan and
   get queue alerts."* Buttons: **Log in**, **Sign up**, and an equally visible **Just browsing**.
   Never show it again that session after dismissal (`sessionStorage`), and never to a logged-in
   user.
2. **Gated login:** actions that need an account (`Set my plan`, `Join waiting room`, `Join queue`,
   `Remind me`, `Buy tickets`) open the same modal if logged out. After success, **resume the exact
   action** the user attempted, keeping any plan they had started.
3. Modal content: tabs **Log in / Sign up**. Log in accepts username or email + password. Sign up
   asks for name, email, username and password, with inline validation and a password strength
   meter. Include a "Continue with Spotify" button. In the prototype it just shows a toast
   "Spotify login coming soon", but keep the slot (it doubles as the music connection in Step 13).
4. On success, show the toast *"You're logged in as {name}."*. On registering for a presale show
   *"You're registered for the presale. We'll remind you 1 hour before."* (journey pain point:
   "no confirmation").
5. Reuse the existing demo users and keep passwords out of the UI. This is a prototype, so plain
   localStorage is acceptable. Add a comment saying so.

### Step 6 — Tour page (`#/tour/:tourId`)

1. **Header band:** poster (left) + tour name, artist, tagline, and a short bio (right). With "Match
   the artist" on, the theme switches here.
2. **Show list:** one row per show: date and time (in the user's timezone, with the venue's
   timezone in small text if it differs), arena and city, price range, status badge, countdown, and
   an action button.
3. **"Set your ticket plan"** (opens per show; requires login). This is the heart of the
   Preparation stage:
   - quantity stepper (1–8, default 2) and the label "seats together";
   - max price per ticket slider (the price guardrail);
   - an arena map (reuse/extend `SeatMap`, drawn as named section blocks around a STAGE like the
     reference images). Tapping sections ranks them 1 → 2 → 3, with numbered badges. Sections above the
     max price are disabled with the reason shown;
   - rule: radio **"Move to my next choice automatically"** / **"Ask me first"**;
   - summary sentence: *"2 tickets together, up to $180 each. Floor A → Section 12 → Section 34.
     Ask me first."*
   - Save the plan to `TicketPlan` storage.
4. **"Ready to buy" checklist:** Logged in ✓, Plan set ✓/✗, Payment method saved (toggle, mock),
   Friends linked (optional: "Squad mode" invite link copied to clipboard).
5. **Artist story preview strip:** first three milestones as small cards + "Explore the story →"
   (the full timeline lives in the queue, Step 12).
6. Record player widget visible (Step 13).

### Step 7 — Waiting room (`#/…/waiting`)

Shown from 30 minutes before `saleOpensAt` until it opens.

- Big `Countdown` to queue opening, with the plan summary pinned beneath it ("Your plan: 2 together, ≤ $180").
- Reassurance list: *"You're in. No need to refresh."* · *"Everyone in the waiting room gets a
  random place when the queue opens."* · *"Keep this tab open; you can switch tabs."*
- "Edit plan" link.
- Artist story timeline (Step 12) and record player available.
- At zero, transition automatically to the queue route.

### Step 8 — Queue simulation engine (pure logic, no UI)

Create `src/queue/simulator.ts`. It must be deterministic for a given seed so demos are repeatable.

- `createQueue({ plan, arena, seed, speed })` returns a store with `subscribe`, `getState`,
  `setSpeed`, `respond(decision)`, `leave()`.
- State: `peopleAhead`, `totalInQueue`, `startPosition`, `phase`
  (`'assigned' | 'waiting' | 'decision' | 'your-turn' | 'checkout' | 'done'`), per ranked section
  `{ sectionId, remaining, status: 'likely'|'at-risk'|'unlikely'|'sold-out'|'cant-seat-together',
  estimateRunOutAt: number /* queue position */ }`, `alerts: Alert[]` (newest first), `bestChance`
  (sectionId + sentence), `outcome`.
- Tick every 1s × speed. `peopleAhead` decreases by a randomised amount; section stock decreases
  proportionally.
- Status rule: compare each section's estimated run-out position with the user's position:
  run-out well after you → `likely`, within ±10% → `at-risk`, before you → `unlikely`.
  `cant-seat-together` when remaining contiguous seats < plan quantity.
- **Scripted demo storyline** (the default seed reproduces the reference screens):
  1. Start ~41,500 total, ~8,000 ahead. Floor A `likely`. Alert: "No changes to your plan."
  2. ~5,300 ahead: alert "Floor A is selling faster than expected." Floor A → `at-risk`, Section 12 → `unlikely`.
  3. ~1,900 ahead: "Floor A has sold out." If rule = `ask-me` → phase `decision`; if `auto-next` →
     move on and alert "Your rule applied: Floor A sold out, moved to Section 12."
  4. ~830 ahead: "Section 12 can no longer seat 2 together." → next choice.
  5. ~200 ahead: "Your plan is now at risk." Section 34 `at-risk`.
  6. 0 ahead → phase `your-turn`, 98 seats left in Section 34.
- An **alternative "sold out" seed** that ends with every ranked section sold out (for the outcome
  screen in Step 11).
- A **demo control** only when the URL has `?demo=1`: a small floating panel with speed ×1 / ×10 /
  ×50, "Jump to next event", and "Use sold-out storyline".
- Unit-testable: keep it free of React. Export pure helpers for status calculation.

### Step 9 — Queue page UI (`#/…/queue`)

Follow the calm reference layout. Content max-width ~900px, on white.

1. **Top line:** the plan pinned at the top right ("Your plan: 2 tickets together, up to $180 each"),
   with the show info on the left.
2. **Queue-assigned moment (first 3s):** a short card: *"You're in the queue. Your place is random
   and fair; refreshing won't change it."*
3. **Main counter:** `8,054` in 64px tabular numbers + "people ahead of you", then a status pill +
   the best-chance sentence ("Section 34 is your best chance. Floor A may sell out first.").
4. **Alert banner:** only the **latest** alert, warm amber (`--warning-bg`/`--warning-border`),
   title + one sentence. Earlier alerts go into a collapsible "Earlier updates" list. Announce new
   alerts via `aria-live="assertive"` only for decisions and your turn, otherwise `polite`.
5. **"Your sections along the queue" chart:** one row per ranked section (number badge, name,
   price, status). The horizontal axis runs from "Where you joined" to "Front of queue" and then
   a shaded "After your turn" zone. A vertical **You** marker moves right as the queue progresses,
   and each section shows a soft `--accent-soft` "estimate" bar where it is expected to run out.
   Sold-out sections become a dashed empty outline, with the row greyed out. Build it with SVG or
   CSS grid. Include a visually-hidden table with the same data for screen readers.
6. **"Your plan" table:** rank, section, position + price, status badge, "N left".
7. Footer note: *"You can look away. Your place is kept, and we'll alert you if your plan changes."*
8. **Leave queue** as a secondary text button with a confirm dialog ("You'll lose your place").
9. Below the fold: **"While you wait: the {Artist} story"** (Step 12). A new alert must appear
   as a **sticky banner at the top of the viewport** so a user scrolling the story never misses it.
10. While waiting, update the tab title: `(1,925 ahead) QuickSeat`. On important events, use
    `⚠ Plan changed` or `🎟 Your turn!`.

### Step 10 — Decision point and your turn

1. **Decision modal** (rule = "Ask me first"): *"Floor A has sold out. Section 12 is your next
   choice at $159 each."* Buttons: **Continue with Section 12** (primary), **Skip to Section 34**,
   **Leave queue**. Show a 60s countdown inside the modal. If it expires, apply the user's next
   choice and say so in an alert. Play the notification chime (Step 14) if sound is enabled.
2. **Your turn screen** (`#/…/seats`): heading "It's your turn", the arena map with the first
   still-available ranked section **pre-selected and best adjacent seats pre-picked** to match the
   plan quantity. The user can re-pick seats inside the section. Prices are shown up front, and
   anything over the max price is blocked with an explanation. Use a visible **checkout timer**
   (e.g. 8:00), turning amber under 2:00 and with an aria-live warning at 1:00.
3. Checkout: order summary (seats, price each, fees, total), mock payment confirm button. On success
   create a `Booking` and go to the outcome.
4. Pause/hide the record player during your turn and checkout (Step 13).

### Step 11 — Outcome screens (`#/…/outcome`)

- **Success:** "You're going!" with ticket-style cards for each seat (artist, tour, date, arena,
  section/row/seat, a decorative QR placeholder), **Add to calendar** (generate an `.ics` download),
  **Share with your group** (copy a pre-written message), and **View my tickets**.
- **Sold out:** use the final-state layout: the arena map all greyed out with the user's ranked
  sections outlined, heading "Tickets have sold out.", "You reached number 37,840 of 61,400.", a
  summary card (e.g. "You stayed after all three of your sections sold out."), and three
  arrow-led benefits: **Waitlist place 4,102**, carried to any added date with no re-queue;
  **First refusal** on verified resale at face value; **Your group has been told**, with the message
  drafted. Buttons: **Hold my waitlist place** (primary), **Alert me if a date is added**.
  Then the artist story timeline, so the page doesn't end on a dead stop.

### Step 12 — Artist story waveform timeline

`src/components/StoryTimeline.tsx`:

1. A horizontal **waveform** drawn in SVG: ~120 thin vertical bars with deterministic pseudo-random
   heights (seeded per artist), in `--accent-soft`, with **peaks at each milestone** in `--accent`.
2. Milestones sit on the waveform as labelled pins (year + short title). Clicking/focusing a pin
   opens a card: year, title, kind label ("First release", "Breakthrough", …), one-sentence story,
   and **▶ Play a snippet** if a clip exists. The snippet plays **through the record player**
   (Step 13), not a separate player.
3. Keyboard: Left/Right arrows move between pins; Enter opens the card.
4. Mobile: the waveform scrolls horizontally inside its own container (the page itself must not
   scroll sideways), or switches to a vertical list below 480px.
5. Under `prefers-reduced-motion`, no bar animation. Otherwise bars gently pulse while music plays.

**Placement:** full timeline on the waiting room, queue page (below the status) and sold-out
outcome; a 3-card preview strip on the tour page; **not** on the landing page.

### Step 13 — Record player widget (opt-in music)

`src/components/RecordPlayer.tsx`, rendered globally but **only visible on the tour, waiting room
and queue pages** (and the success outcome). Never shown on the landing page, seat selection or
checkout.

1. **Idle:** a 64px vinyl record docked bottom-right (16px from the edges) with the artist's
   colour as the centre label and a small tonearm. It does not spin. On first appearance only, a
   tooltip says *"Want a soundtrack while you wait? Tap the record."* and disappears after 6s or on
   any interaction (remember this in localStorage).
2. **Click → plays.** The record spins (CSS animation; static under reduced motion), the tonearm
   drops, and the widget expands to a mini card: track title, artist, play/pause, volume slider,
   next, **Connect Spotify**, and a minimise button.
3. **Minimised:** collapses to a small tab on the right edge. Remember the state.
4. **Audio sources, in priority order:**
   1. Local clips at `public/audio/<artistId>/<n>.mp3` if they exist (listed in the artist data's
      `clipUrl`). **Do not add copyrighted songs to the repo.** Leave the folder with a `README.md`
      explaining that licensed or royalty-free clips go here.
   2. *(As built: tapping the record with no local clip plays a generated, original mood loop per artist via the Web Audio API, so "click → plays" always works.)* The expanded card also offers the **Spotify embed iframe**
      (`https://open.spotify.com/embed/artist/<spotifyArtistId>`), which plays previews or full
      tracks if the user is logged into Spotify. The iframe is only created **after** the user
      clicks, never on page load.
   3. "Connect Spotify" (full account connection via the Web Playback SDK) is **out of scope**.
      The button shows "Coming soon" for now. Keep the code path isolated so it can be added later.
5. Start at 40% volume with a 1.5s fade-in. Never autoplay, never resume automatically on a new page
   visit.
6. **Ducking:** when a queue alert fires, lower the volume to 15% for 3 seconds so the chime is
   heard, then restore it.
7. **Auto-pause** when the phase becomes `your-turn` or `checkout`, and show "Paused so you can
   focus" on the record.
8. Fully keyboard operable, with `aria-label`s on every control and `aria-pressed` on play.

### Step 14 — Notifications ("safe to look away")

1. On joining the queue, offer (don't force) **"Notify me when my plan changes"**, which calls
   `Notification.requestPermission()` only on that click.
2. Fire browser notifications + a short, soft **chime** (generated with the Web Audio API: two sine
   tones, ~400ms, so no audio file is needed) for: plan at risk, decision needed, your turn. A
   sound toggle sits next to the notification toggle, both remembered.
3. Tab title updates as in Step 9.10.

### Step 15 — My tickets and Admin

1. **My tickets (`#/tickets`):** ticket-style cards grouped as Upcoming / Past, plus a
   "Waitlists" section listing held waitlist places. Empty state: "No tickets yet. Browse tours →".
2. **Admin (`#/admin`):** keep the existing capabilities from `AdminPanel.tsx` (add/edit/delete
   shows, see bookings) restyled with the new design system. Add editing for tour name, poster URL,
   `saleOpensAt` and status override, plus a "Reset demo data" button.

### Step 16 — Heuristics and accessibility pass

Go through every page and check each item. Fix anything that fails:

| Nielsen heuristic | Check |
| --- | --- |
| 1. Visibility of system status | Every show shows a status badge; queue shows live counts and "updated just now" |
| 2. Match with the real world | Plain language: "2 tickets together, up to $180 each", local times |
| 3. User control & freedom | Dismissable login pop-up, mute/minimise music, edit plan, leave queue with confirm |
| 4. Consistency & standards | One status vocabulary + one `StatusBadge`; one primary button per view |
| 5. Error prevention | Price guardrail, sections over budget disabled, readiness checklist, confirm before leaving queue |
| 6. Recognition over recall | Plan summary pinned on waiting room, queue, decision modal and checkout |
| 7. Flexibility & efficiency | Pre-ranked sections pre-selected at your turn; keyboard shortcuts in the seat map |
| 8. Aesthetic & minimalist design | White base, one accent colour, one alert at a time, story below the fold |
| 9. Help users recover from errors | Clear inline form errors; sold out leads to waitlist/resale, never a dead end |
| 10. Help & documentation | "How QuickSeat works" on landing; "?" tooltips on queue terms like "estimate" |

Accessibility checklist: tab through every page (logical order, visible focus, no traps except in
modals); all text ≥ 4.5:1 in **every** theme (test all six); reduced motion disables carousel
autoplay, record spin and waveform pulse; screen-reader labels on posters, swatches, record player
and chart; `lang="en-AU"` on `<html>`.

### Step 17 — Final verification

1. `npm run build` and `npm run lint` pass.
2. Manual demo script (write it into the README):
   1. Land on `#/`, see the soft login pop-up, choose **Just browsing**.
   2. Switch the theme to Earth Red, then Sand, and see the navbar text auto-switch to dark.
   3. Open the show whose queue opens in 2 minutes, then **Set my plan** (login prompt appears and
      log in as `customer`; plan resumes): 2 tickets, ≤ $180, Floor A → Section 12 → Section 34, Ask me first.
   4. Join the waiting room, start the record player, explore the story timeline.
   5. Queue opens; add `?demo=1`, set speed ×50; handle the decision modal; reach your turn; check out.
   6. Re-run with the sold-out storyline and show the waitlist outcome.
3. Update `README.md`: features, routes, theme system, demo script, where to put licensed posters
   (`public/artists/<artistId>.jpg`) and audio clips (`public/audio/<artistId>/`).
4. Test at 360px, 768px and 1440px widths.

---

## 4. Out of scope (do not build)

- A real backend, payments, or real Spotify account connection.
- Real-time multi-user queues. The queue is a **simulation** for prototype testing.
- Any artist other than Taylor Swift, BTS and Charlie Puth.
- Autoplaying audio.
