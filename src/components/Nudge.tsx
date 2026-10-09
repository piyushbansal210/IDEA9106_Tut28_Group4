import { useEffect } from 'react'
import { useStore } from '../store'
import { usePresale } from '../presale'
import { readStored, writeStored } from '../storage'
import { QUESTION_SECONDS } from '../streak'
import { chime } from '../audio'
import { useRoute } from '../router'

// No trivia nudges while a fan is queueing or checking out.
const FOCUS_PAGES = ['queue', 'seats']
const useFocusPage = () => FOCUS_PAGES.includes(useRoute().parts[4] ?? '')

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function inQuietHours(time: number, quiet?: { from: string; to: string }) {
  if (!quiet) return false
  const d = new Date(time)
  const now = d.getHours() * 60 + d.getMinutes()
  const [from, to] = [minutes(quiet.from), minutes(quiet.to)]
  return from <= to ? now >= from && now < to : now >= from || now < to
}

// Readiness items still to do, for nudges and emails.
export function useReadinessGaps() {
  const store = useStore()
  return (showId: string) => {
    const show = store.findShow(showId)
    const gaps: string[] = []
    if (!store.user) gaps.push('log in')
    if (show?.hasQueue && !store.planFor(showId)) gaps.push('set your plan')
    if (!store.user?.paymentSaved) gaps.push('save a card')
    return gaps
  }
}

// In-app stand-in for a push notification / desktop alert.
export default function Nudge() {
  const store = useStore()
  const presale = usePresale()
  const gaps = useReadinessGaps()
  const showId = presale.nudgeFor
  const show = store.findShow(showId ?? undefined)
  const focusPage = useFocusPage()

  useEffect(() => {
    if (show && !focusPage) chime()
  }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  // Never on top of the question itself.
  if (!show || !showId || presale.triviaFor || focusPage) return null
  const view = presale.streakFor(showId)
  const artist = store.artistOf(store.tourOf(show))
  const city = store.arenaOf(show).city
  const todo = gaps(showId)
  const when = view.daysUntil === 1 ? 'tomorrow' : view.daysUntil === 0 ? 'today' : `in ${view.daysUntil} days`

  return (
    <aside className="nudge" role="status" aria-label="QuickSeat notification">
      <div className="nudge-top"><b>QUICKSEAT</b><span>now</span></div>
      <strong>Day {view.dayIndex ?? '–'} · {artist.name} trivia{view.length ? ` · ${view.length}-day streak` : ''}</strong>
      <span className="small">
        One question, {QUESTION_SECONDS} seconds. {city} sale {when}.
        {todo.length > 0 && ` You still need to ${todo.join(', ')}.`}
      </span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={() => presale.openTrivia(showId)} disabled={!view.dayIndex || !!view.today}>
          {view.today ? 'Answered today ✓' : 'Open question'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={presale.dismissNudge}>Later</button>
      </div>
    </aside>
  )
}

// Sends today's nudge once per day per show, respecting the push setting and quiet hours.
export function NudgeScheduler() {
  const store = useStore()
  const presale = usePresale()
  const user = store.user
  const focusPage = useFocusPage()

  useEffect(() => {
    if (!user || focusPage) return
    const due = presale.myRegistrations.find((r) => {
      const show = store.findShow(r.showId)
      if (!r.push || !show) return false
      const view = presale.streakFor(r.showId)
      return view.dayIndex && !view.today && !inQuietHours(presale.presaleNow(show), r.quietHours)
    })
    if (!due) return
    const view = presale.streakFor(due.showId)
    const flag = `quickseat:nudged:${user.username}:${due.showId}:${view.dayIndex}`
    if (readStored(flag, false, true)) return
    const t = setTimeout(() => {
      writeStored(flag, true, true)
      presale.sendNudge(due.showId, true)
    }, 3000)
    return () => clearTimeout(t)
  }, [user?.username, presale.demoDaysUntil, focusPage]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
