import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { DayState, EmailTemplate, PendingQuestion, Registration, SentEmail, Show, StreakDay, StreakRecord, StreakResult } from './types'
import { buildEmail } from './emails'
import { formatShowDate } from './seats'
import { showPath } from './sale'
import { useStore } from './store'
import { seedShows, seedTours } from './data'
import { STORAGE_PREFIX as P, readStored, usePersistentState } from './storage'
import { triviaBank } from './trivia'
import {
  PRESALE_WINDOW_DAYS, dayIndexFor, daysUntilSale, deriveDayStates, msLeft, pickQuestion, scoreAnswer,
  settlePending, simulatedNow, streakLength, summarise,
} from './streak'

export interface StreakView {
  registration?: Registration
  record: StreakRecord
  states: DayState[]
  daysUntil: number
  dayIndex: number | null
  length: number
  today?: StreakDay
  pending?: PendingQuestion
  counts: ReturnType<typeof summarise>
}

export type RegistrationPrefs = Pick<Registration, 'push' | 'email' | 'quietHours'>
export type DemoAnswer = StreakResult

interface Presale {
  presaleNow: (show: Show) => number
  demoDaysUntil: number | null
  setDemoDaysUntil: (d: number | null) => void

  myRegistrations: Registration[]
  allRegistrations: Registration[]
  registrationFor: (showId: string) => Registration | undefined
  register: (showId: string, prefs: RegistrationPrefs) => void
  unregister: (showId: string) => void

  streakFor: (showId: string, username?: string) => StreakView
  startQuestion: (showId: string) => PendingQuestion | null
  // `at` is when the fan clicked, so a short reveal animation can't push an in-time answer over the limit.
  submitAnswer: (showId: string, displayIndex: number | null, at?: number) => StreakDay | null
  fillSampleHistory: (showId: string) => void
  // Demo only: move a running question's clock forward.
  fastForward: (showId: string, ms: number) => void
  resetStreak: (showId: string) => void

  preRegisterFor: string | null
  openPreRegister: (showId: string) => void
  closePreRegister: () => void
  triviaFor: string | null
  // `auto` lets demo controls drive the real question UI: answer right, wrong, or let the clock run out.
  triviaAuto: DemoAnswer | null
  openTrivia: (showId: string, auto?: DemoAnswer) => void
  closeTrivia: () => void
  nudgeFor: string | null
  // `ifIdle`: only show it if no other nudge or presale pop-up is open (used by the automatic daily nudge).
  sendNudge: (showId: string, ifIdle?: boolean) => void
  dismissNudge: () => void
  resetPresale: () => void

  // Simulated email: stored in an in-app inbox, never sent.
  inbox: SentEmail[]
  allEmails: SentEmail[]
  sendEmail: (username: string, showId: string, template: EmailTemplate) => SentEmail | null
  markEmailRead: (id: string) => void
}

const PresaleContext = createContext<Presale | null>(null)

export function usePresale() {
  const ctx = useContext(PresaleContext)
  if (!ctx) throw new Error('usePresale must be used inside <PresaleProvider>')
  return ctx
}

// A recognisable sample history (from the prototype): mostly green, some orange, a few missed days.
const SAMPLE: ('g' | 'o' | 'm')[] = ['g', 'g', 'o', 'g', 'g', 'm', 'g', 'o', 'o', 'g', 'g', 'g', 'm', 'g', 'g', 'g', 'o', 'g', 'g', 'g', 'g', 'm', 'g', 'g', 'g', 'g', 'o', 'g', 'g', 'g']

function sampleRecord(username: string, showId: string, upToDay: number): StreakRecord {
  const show = seedShows.find((s) => s.id === showId)
  const tour = seedTours.find((t) => t.id === show?.tourId)
  const bank = tour ? triviaBank[tour.artistId] : triviaBank.bts
  const days: StreakRecord['days'] = {}
  for (let d = 1; d < upToDay && d <= PRESALE_WINDOW_DAYS; d++) {
    const r = SAMPLE[d - 1]
    if (r === 'm') continue
    days[d] = {
      dayIndex: d,
      result: r === 'g' ? 'correct' : 'wrong',
      questionId: pickQuestion(username, showId, d, bank).question.id,
      answeredAt: new Date(Date.now() - (upToDay - d) * 86_400_000).toISOString(),
      msTaken: 6000 + ((d * 1373) % 11000),
    }
  }
  return { days }
}

const DEMO_SHOW = 'ptd-mel'
const todayIndex = (show: Show | undefined, now: number) => (show ? dayIndexFor(daysUntilSale(show.saleOpensAt, now)) : null)

// Old "Remind me" flags become registrations; the demo customer gets one registration with history.
function initialRegistrations(): Registration[] {
  const old = readStored<string[]>(`${P}reminders`, [])
  const migrated = old.flatMap((key) => {
    const [username, showId] = key.split(':')
    const show = seedShows.find((s) => s.id === showId)
    const tour = seedTours.find((t) => t.id === show?.tourId)
    return show && tour ? [{ username, showId, artistId: tour.artistId, push: true, email: true, startDay: 1, createdAt: new Date().toISOString() }] : []
  })
  const seed: Registration = { username: 'customer', showId: DEMO_SHOW, artistId: 'bts', push: true, email: true, quietHours: { from: '22:00', to: '08:00' }, startDay: 1, createdAt: new Date().toISOString() }
  return migrated.some((r) => r.username === seed.username && r.showId === seed.showId) ? migrated : [...migrated, seed]
}

function initialStreaks(): Record<string, StreakRecord> {
  const show = seedShows.find((s) => s.id === DEMO_SHOW)
  const today = todayIndex(show, Date.now()) ?? 1
  return { [`customer:${DEMO_SHOW}`]: sampleRecord('customer', DEMO_SHOW, today) }
}

export function PresaleProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const user = store.user
  const userRef = useRef(user)
  userRef.current = user

  const [registrations, setRegistrations] = usePersistentState<Registration[]>(`${P}registrations`, initialRegistrations)
  const [streaks, setStreaks] = usePersistentState<Record<string, StreakRecord>>(`${P}streaks`, initialStreaks)
  const [demoDaysUntil, setDemoDaysUntil] = usePersistentState<number | null>(`${P}demo-days`, null, true)
  const [emails, setEmails] = usePersistentState<SentEmail[]>(`${P}emails`, [])
  const [preRegisterFor, setPreRegisterFor] = useState<string | null>(null)
  const [triviaFor, setTriviaFor] = useState<string | null>(null)
  const [triviaAuto, setTriviaAuto] = useState<DemoAnswer | null>(null)
  const [nudgeFor, setNudgeFor] = useState<string | null>(null)
  const nudgeRef = useRef(nudgeFor)
  nudgeRef.current = nudgeFor

  // The old reminder flags have been migrated into registrations.
  useEffect(() => {
    try { localStorage.removeItem(`${P}reminders`) } catch { /* storage unavailable */ }
  }, [])

  const key = (showId: string) => `${userRef.current?.username ?? 'guest'}:${showId}`
  // The demo day slider moves the streak/hub/email clock only; the queue keeps using the real sale time.
  const presaleNow = (show: Show) => (demoDaysUntil === null ? store.now : simulatedNow(show.saleOpensAt, demoDaysUntil))
  const showById = (id: string) => store.findShow(id)
  const registrationFor = (showId: string) => registrations.find((r) => r.showId === showId && r.username === userRef.current?.username)

  const streakFor = (showId: string, username = userRef.current?.username ?? 'guest'): StreakView => {
    const show = showById(showId)
    const registration = registrations.find((r) => r.showId === showId && r.username === username)
    const record = settlePending(streaks[`${username}:${showId}`] ?? { days: {} }, Date.now())
    const daysUntil = show ? daysUntilSale(show.saleOpensAt, presaleNow(show)) : PRESALE_WINDOW_DAYS + 1
    const dayIndex = dayIndexFor(daysUntil)
    const states = deriveDayStates(record, dayIndex, daysUntil, registration?.startDay ?? 1)
    return {
      registration,
      record,
      states,
      daysUntil,
      dayIndex,
      length: streakLength(states),
      today: dayIndex ? record.days[dayIndex] : undefined,
      pending: record.pending,
      counts: summarise(states),
    }
  }

  const saveRecord = (showId: string, record: StreakRecord) => setStreaks((all) => ({ ...all, [key(showId)]: record }))

  const value: Presale = {
    presaleNow,
    demoDaysUntil,
    setDemoDaysUntil,

    myRegistrations: registrations.filter((r) => r.username === user?.username),
    allRegistrations: registrations,
    registrationFor,
    register: (showId, prefs) => {
      const u = userRef.current
      const show = showById(showId)
      if (!u || !show) return
      const artistId = store.tourOf(show).artistId
      const daysUntil = daysUntilSale(show.saleOpensAt, presaleNow(show))
      const startDay = dayIndexFor(daysUntil) ?? (daysUntil > PRESALE_WINDOW_DAYS ? 1 : PRESALE_WINDOW_DAYS + 1)
      setRegistrations((list) => [
        ...list.filter((r) => !(r.showId === showId && r.username === u.username)),
        { username: u.username, showId, artistId, ...prefs, startDay: registrationFor(showId)?.startDay ?? startDay, createdAt: new Date().toISOString() },
      ])
    },
    unregister: (showId) => setRegistrations((list) => list.filter((r) => !(r.showId === showId && r.username === userRef.current?.username))),

    streakFor,
    startQuestion: (showId) => {
      const u = userRef.current
      const show = showById(showId)
      if (!u || !show) return null
      const view = streakFor(showId)
      if (!view.dayIndex || view.today) return null
      if (view.pending && view.pending.dayIndex === view.dayIndex && msLeft(view.pending, Date.now()) > 0) return view.pending
      const { question, order } = pickQuestion(u.username, showId, view.dayIndex, triviaBank[store.tourOf(show).artistId])
      const pending: PendingQuestion = { dayIndex: view.dayIndex, questionId: question.id, shownAt: Date.now(), order }
      saveRecord(showId, { ...view.record, pending })
      return pending
    },
    submitAnswer: (showId, displayIndex, at = Date.now()) => {
      const show = showById(showId)
      const raw = streaks[key(showId)]
      const pending = raw?.pending
      if (!show || !pending) return null
      const question = triviaBank[store.tourOf(show).artistId].find((q) => q.id === pending.questionId)
      if (!question) return null
      const msTaken = at - pending.shownAt
      const day: StreakDay = { dayIndex: pending.dayIndex, result: scoreAnswer(question, pending.order, displayIndex, msTaken), questionId: question.id, answeredAt: new Date().toISOString(), msTaken: Math.min(msTaken, 20_000) }
      saveRecord(showId, { days: { ...raw.days, [pending.dayIndex]: raw.days[pending.dayIndex] ?? day } })
      return day
    },
    fillSampleHistory: (showId) => {
      const u = userRef.current
      const show = showById(showId)
      if (!u || !show) return
      const today = dayIndexFor(daysUntilSale(show.saleOpensAt, presaleNow(show))) ?? PRESALE_WINDOW_DAYS + 1
      saveRecord(showId, sampleRecord(u.username, showId, today))
      setRegistrations((list) => list.map((r) => (r.showId === showId && r.username === u.username ? { ...r, startDay: 1 } : r)))
    },
    resetStreak: (showId) => saveRecord(showId, { days: {} }),
    fastForward: (showId, ms) =>
      setStreaks((all) => {
        const r = all[key(showId)]
        return r?.pending ? { ...all, [key(showId)]: { ...r, pending: { ...r.pending, shownAt: r.pending.shownAt - ms } } } : all
      }),

    preRegisterFor,
    openPreRegister: (showId) => store.requireLogin('Log in to pre-register. Your registration and streak are saved to your account.', () => setPreRegisterFor(showId)),
    closePreRegister: () => setPreRegisterFor(null),
    triviaFor,
    triviaAuto,
    openTrivia: (showId, auto) => {
      setNudgeFor(null)
      setTriviaAuto(auto ?? null)
      setTriviaFor(showId)
    },
    closeTrivia: () => {
      setTriviaFor(null)
      setTriviaAuto(null)
    },
    nudgeFor,
    sendNudge: (showId, ifIdle) => {
      if (ifIdle && (nudgeRef.current || triviaFor || preRegisterFor)) return
      setNudgeFor(showId)
    },
    dismissNudge: () => setNudgeFor(null),
    resetPresale: () => {
      setRegistrations(initialRegistrations())
      setStreaks(initialStreaks())
      setDemoDaysUntil(null)
      setEmails([])
    },

    inbox: emails.filter((e) => e.username === user?.username).sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    allEmails: emails,
    sendEmail: (username, showId, template) => {
      const fan = store.users.find((u) => u.username === username)
      const show = showById(showId)
      if (!fan || !show) return null
      const tour = store.tourOf(show)
      const arena = store.arenaOf(show)
      const base = `${location.origin}${location.pathname}#`
      const email = buildEmail(template, {
        name: fan.name.split(' ')[0],
        artist: store.artistOf(tour).name,
        tourName: tour.name,
        city: arena.city,
        arenaName: arena.name,
        saleTime: formatShowDate(show.saleOpensAt, arena.timeZone),
        waitingRoomTime: new Date(Date.parse(show.saleOpensAt) - 30 * 60_000).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }),
        streak: streakFor(showId, username).length,
        readiness: {
          loggedIn: store.user?.username === username,
          plan: show.hasQueue ? !!store.planOf(username, showId) : null,
          card: !!fan.paymentSaved,
        },
        links: { hub: base + showPath(show, 'hub'), plan: `${base}/tour/${tour.id}?plan=${show.id}`, card: base + showPath(show, 'hub'), waiting: base + showPath(show, 'waiting') },
      })
      const sent: SentEmail = { id: crypto.randomUUID(), username, showId, template, ...email, sentAt: new Date(presaleNow(show)).toISOString(), read: false }
      setEmails((list) => [...list, sent])
      return sent
    },
    markEmailRead: (id) => setEmails((list) => list.map((e) => (e.id === id ? { ...e, read: true } : e))),
  }

  return <PresaleContext.Provider value={value}>{children}</PresaleContext.Provider>
}
