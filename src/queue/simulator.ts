// Simulated digital queue for prototype testing. Pure TypeScript (no React) and deterministic per seed,
// so a demo always plays the same storyline as the reference screens.
import type { Section, TicketPlan } from '../types'
import { seeded } from '../seats'

export type SectionStatus = 'likely' | 'at-risk' | 'unlikely' | 'sold-out' | 'cant-seat-together'
export type Phase = 'assigned' | 'waiting' | 'decision' | 'your-turn' | 'done'
export type Storyline = 'default' | 'sold-out'

// Chart axis: 0 = where you joined, FRONT = front of the queue, beyond that = after your turn.
export const FRONT = 0.72

export interface SectionState {
  sectionId: string
  name: string
  price: number
  status: SectionStatus
  remaining: number
  estimate: { at: number; width: number }
  skipped?: boolean
}

export interface QueueAlert {
  id: number
  title: string
  body: string
  tone: 'info' | 'warn' | 'good'
  important?: boolean
}

export interface QueueState {
  showId: string
  plan: TicketPlan
  storyline: Storyline
  phase: Phase
  startAhead: number
  peopleAhead: number
  totalInQueue: number
  progress: number
  speed: number
  sections: SectionState[]
  activeIndex: number
  alerts: QueueAlert[]
  decision?: { soldIndex: number; nextIndex: number; deadline: number; reason: string }
  outcome?: 'your-turn' | 'sold-out' | 'left'
  ticks: number
}

export interface QueueStore {
  getState: () => QueueState
  subscribe: (fn: () => void) => () => void
  setSpeed: (speed: number) => void
  respond: (choice: 'continue' | 'skip' | 'leave') => void
  jumpToNextEvent: () => void
  dispose: () => void
}

const BASE_SECONDS = 150 // whole queue at speed ×1
const DECISION_SECONDS = 60
const START_REMAINING = [2791, 1086, 1198]

// Events fire when people-ahead drops below these values (from the reference screens).
const EVENT_AHEAD = [5279, 1925, 829, 206]

interface Options {
  plan: TicketPlan
  sections: Section[]
  showId: string
  storyline?: Storyline
  speed?: number
}

export function createQueue({ plan, sections, showId, storyline = 'default', speed = 1 }: Options): QueueStore {
  const rand = seeded(`${showId}:${storyline}`)
  const startAhead = 8054
  const ranked = plan.rankedSectionIds
    .map((id) => sections.find((s) => s.id === id))
    .filter((s): s is Section => Boolean(s))
  const n = ranked.length
  const listeners = new Set<() => void>()
  let alertId = 0

  let state: QueueState = {
    showId,
    plan,
    storyline,
    phase: 'assigned',
    startAhead,
    peopleAhead: startAhead,
    totalInQueue: startAhead + 1 + 28_000 + Math.round(rand() * 14_000),
    progress: 0,
    speed,
    sections: ranked.map((s, i) => ({
      sectionId: s.id,
      name: s.name,
      price: s.price,
      status: i === 1 && n > 2 ? 'at-risk' : 'likely',
      remaining: START_REMAINING[i] ?? 900,
      estimate: [{ at: 0.86, width: 0.16 }, { at: 0.58, width: 0.2 }, { at: 0.93, width: 0.1 }][i] ?? { at: 0.9, width: 0.1 },
    })),
    activeIndex: 0,
    alerts: [],
    ticks: 0,
  }
  let fired = 0
  // Remaining-ticket targets per section, interpolated as the queue moves.
  const targets = state.sections.map((s) => ({ from: s.remaining, fromP: 0, to: s.remaining * 0.55, toP: 1 }))

  const emit = () => listeners.forEach((l) => l())
  const set = (patch: Partial<QueueState>) => {
    state = { ...state, ...patch }
    emit()
  }
  const alert = (a: Omit<QueueAlert, 'id'>) => [{ ...a, id: ++alertId }, ...state.alerts]
  const name = (i: number) => state.sections[i]?.name ?? ''
  const patchSection = (i: number, patch: Partial<SectionState>) =>
    state.sections.map((s, j) => (j === i ? { ...s, ...patch } : s))

  alertId++
  state.alerts = [{ id: alertId, title: 'No changes to your plan.', body: `${name(0)}, your first choice, is your best chance.`, tone: 'info' }]

  // A section the user can no longer get: ask first or move on, depending on their rule.
  function lose(i: number, status: 'sold-out' | 'cant-seat-together', title: string) {
    // The section ran out roughly where you are now, so its marker moves there.
    const ranOutAt = Math.min(FRONT - 0.04, Math.max(0.08, state.progress * FRONT))
    state.sections = patchSection(i, { status, estimate: { at: ranOutAt, width: 0.07 } })
    const p = state.progress
    targets[i] = { from: state.sections[i].remaining, fromP: p, to: status === 'sold-out' ? 0 : 23, toP: p + 0.001 }
    const next = i + 1
    if (i !== state.activeIndex) {
      state.alerts = alert({ title, body: `You'd already moved on to ${name(state.activeIndex)}.`, tone: 'info' })
      return
    }
    if (next >= n) return
    if (state.plan.rule === 'ask-me') {
      state.alerts = alert({ title, body: `You asked us to check with you first. ${name(next)} is your next choice.`, tone: 'warn', important: true })
      state.decision = { soldIndex: i, nextIndex: next, deadline: Date.now() + DECISION_SECONDS * 1000, reason: title }
      state.phase = 'decision'
    } else {
      state.activeIndex = next
      state.alerts = alert({ title, body: `Your rule applied: you've moved to ${name(next)}, your next choice.`, tone: 'warn' })
    }
  }

  function fire(event: number) {
    const last = n - 1
    if (event === 0) {
      state.sections = patchSection(0, { status: n > 1 ? 'at-risk' : 'likely', estimate: { at: 0.76, width: 0.2 } })
      if (n > 2) state.sections = patchSection(1, { status: 'unlikely', estimate: { at: 0.6, width: 0.12 } })
      state.alerts = alert({
        title: `${name(0)} is selling faster than expected`,
        body: 'Your first choice may run out before you reach the front. Nothing changes yet. We\'ll check with you if it sells out.',
        tone: 'warn',
      })
    } else if (event === 1 && n > 1) {
      lose(0, 'sold-out', `${name(0)} has sold out`)
      if (state.sections[1].status !== 'sold-out') {
        state.sections = patchSection(1, { status: n > 2 ? 'at-risk' : 'likely', estimate: { at: 0.7, width: 0.07 } })
      }
    } else if (event === 2 && n > 2) {
      const q = state.plan.quantity
      lose(1, q > 1 ? 'cant-seat-together' : 'sold-out', q > 1 ? `${name(1)} can no longer seat ${q} together` : `${name(1)} has sold out`)
    } else if (event === 3) {
      if (state.storyline === 'sold-out') {
        state.sections = patchSection(last, { status: 'sold-out' })
        targets[last] = { from: state.sections[last].remaining, fromP: state.progress, to: 0, toP: state.progress + 0.001 }
        state.phase = 'done'
        state.outcome = 'sold-out'
        state.alerts = alert({ title: 'Tickets in your plan have sold out', body: 'We\'ve saved your place on the waitlist.', tone: 'warn', important: true })
      } else {
        state.sections = patchSection(last, { status: 'at-risk', estimate: { at: 0.77, width: 0.07 } })
        targets[last] = { from: state.sections[last].remaining, fromP: state.progress, to: 98, toP: 1 }
        state.alerts = alert({
          title: 'Your plan is now at risk',
          body: 'Your remaining sections may run out around when you reach the front. You can keep waiting or leave.',
          tone: 'warn',
          important: true,
        })
      }
    }
  }

  function tick() {
    if (state.phase === 'done' || state.phase === 'your-turn') return
    if (state.phase === 'decision') {
      if (state.decision && Date.now() >= state.decision.deadline) {
        respond('continue', true)
      }
      return
    }
    state.ticks++
    if (state.phase === 'assigned') {
      if (state.ticks >= 3) set({ phase: 'waiting' })
      return
    }
    const step = (startAhead / BASE_SECONDS) * state.speed * (0.6 + rand() * 0.8)
    advanceTo(Math.max(0, state.peopleAhead - step))
  }

  function advanceTo(ahead: number) {
    state.peopleAhead = ahead
    state.progress = 1 - ahead / startAhead
    state.sections = state.sections.map((s, i) => {
      const t = targets[i]
      const k = Math.min(1, Math.max(0, (state.progress - t.fromP) / Math.max(0.001, t.toP - t.fromP)))
      return { ...s, remaining: Math.round(t.from + (t.to - t.from) * k) }
    })
    while (fired < EVENT_AHEAD.length && ahead <= EVENT_AHEAD[fired] && state.phase === 'waiting') {
      fire(fired++)
    }
    if (ahead <= 0 && state.phase === 'waiting') {
      state.phase = 'your-turn'
      state.outcome = 'your-turn'
      state.alerts = alert({ title: 'It\'s your turn', body: `${name(state.activeIndex)} still has seats together within your plan.`, tone: 'good', important: true })
    }
    state = { ...state }
    emit()
  }

  function respond(choice: 'continue' | 'skip' | 'leave', timedOut = false) {
    const d = state.decision
    if (choice === 'leave') {
      stop()
      set({ phase: 'done', outcome: 'left', decision: undefined })
      return
    }
    if (!d) return
    let idx = d.nextIndex
    if (choice === 'skip' && idx + 1 < n) {
      state.sections = patchSection(idx, { skipped: true })
      idx++
    }
    state.alerts = timedOut
      ? alert({ title: `We kept you going with ${name(idx)}`, body: 'You didn\'t answer within 60 seconds, so we applied your next choice.', tone: 'info' })
      : alert({ title: `Now aiming for ${name(idx)}`, body: 'Your plan is updated. Your place in the queue is unchanged.', tone: 'info' })
    set({ activeIndex: idx, decision: undefined, phase: 'waiting' })
  }

  const timer = setInterval(tick, 1000)
  const stop = () => clearInterval(timer)

  return {
    getState: () => state,
    subscribe: (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    setSpeed: (s) => set({ speed: s }),
    respond: (c) => respond(c),
    jumpToNextEvent: () => {
      if (state.phase !== 'waiting') return
      const target = fired < EVENT_AHEAD.length ? EVENT_AHEAD[fired] : 0
      advanceTo(target)
    },
    dispose: stop,
  }
}

// Best-chance sentence and headline status, as on the reference screens.
export function summarise(state: QueueState) {
  const { sections, activeIndex } = state
  const open = sections.map((s, i) => ({ s, i })).filter(({ s, i }) => i >= activeIndex && !s.skipped && (s.status === 'likely' || s.status === 'at-risk'))
  const best = open.find(({ s }) => s.status === 'likely') ?? open[0]
  const gone = sections.filter((s) => s.status === 'sold-out' || s.status === 'cant-seat-together').map((s) => s.name)
  if (!best) return { status: 'sold-out' as SectionStatus, sentence: 'All the sections in your plan are gone.' }

  let sentence = `${best.s.name}${best.i === 0 ? ', your first choice,' : ''} is your best chance.`
  if (state.phase === 'your-turn') {
    sentence = `It's your turn. ${best.s.name} still has tickets that fit your plan.`
  } else if (best.s.status === 'at-risk' && state.peopleAhead < 400) {
    sentence += ' It may run out around your turn.'
  }
  const atRisk = sections.slice(activeIndex, best.i).filter((s) => s.status === 'at-risk' || s.status === 'unlikely').map((s) => s.name)
  if (atRisk.length) sentence += ` ${joinNames(atRisk)} may sell out first.`
  if (gone.length && state.phase !== 'your-turn') {
    sentence += ` ${joinNames(gone)} ${gone.length > 1 ? (state.peopleAhead < 400 ? 'have sold out' : 'are no longer possible') : 'has sold out'}.`
  }
  return { status: best.s.status, sentence }
}

const joinNames = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0])

// Queues live outside React so your place is kept while you browse other pages.
const registry = new Map<string, QueueStore>()

export function getQueue(showId: string, make: () => QueueStore) {
  let q = registry.get(showId)
  if (!q) {
    q = make()
    registry.set(showId, q)
  }
  return q
}

export const peekQueue = (showId: string) => registry.get(showId)

export function leaveQueue(showId: string) {
  registry.get(showId)?.dispose()
  registry.delete(showId)
}
