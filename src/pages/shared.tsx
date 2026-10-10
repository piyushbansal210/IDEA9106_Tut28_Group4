import { useEffect, type ReactNode } from 'react'
import { useStore } from '../store'
import { href } from '../router'
import { setPrefs, usePrefs } from '../audio'
import type { Show } from '../types'
import { formatShowDate } from '../seats'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · QuickSeat` : 'QuickSeat'
  }, [title])
}

// Shown in place of a page that needs an account, instead of silently redirecting.
export function LoginGate({ reason, children }: { reason: string; children: ReactNode }) {
  const { user, openLogin } = useStore()
  if (user) return <>{children}</>
  return (
    <div className="container page narrow">
      <div className="empty stack" style={{ alignItems: 'center' }}>
        <h1 style={{ fontSize: 28 }}>Log in to continue</h1>
        <p className="muted">{reason}</p>
        <button className="btn btn-primary" onClick={() => openLogin('login', reason)}>Log in</button>
      </div>
    </div>
  )
}

export function ShowHeader({ show, right }: { show: Show; right?: ReactNode }) {
  const store = useStore()
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  return (
    <div className="row between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, alignItems: 'flex-start' }}>
      <div className="stack-sm" style={{ gap: 2 }}>
        <a href={href(`/tour/${tour.id}`)} style={{ textDecoration: 'none' }}><strong>{artist.name}: {tour.name}</strong></a>
        <span className="small muted">{formatShowDate(show.date, arena.timeZone)} · {arena.name}, {arena.city}</span>
      </div>
      {right}
    </div>
  )
}

// Opt-in alerts: permission is only requested when the user ticks the box.
export function AlertSettings() {
  const prefs = usePrefs()
  const supported = typeof Notification !== 'undefined'
  return (
    <div className="row" style={{ gap: '8px 24px' }}>
      {supported && (
        <label className="checkbox small">
          <input
            type="checkbox"
            checked={prefs.notify && Notification.permission === 'granted'}
            onChange={async (e) => {
              if (!e.target.checked) return setPrefs({ notify: false })
              const result = await Notification.requestPermission()
              setPrefs({ notify: result === 'granted' })
            }}
          />
          <span>Notify me when my plan changes (even in another tab)</span>
        </label>
      )}
      <label className="checkbox small">
        <input type="checkbox" checked={prefs.sound} onChange={(e) => setPrefs({ sound: e.target.checked })} />
        <span>Play a soft chime for alerts</span>
      </label>
    </div>
  )
}

