import { useId } from 'react'
import { useStore } from '../store'
import { navigate } from '../router'
import Icon from './Icon'

interface Item {
  key: string
  done: boolean
  label: string
  action?: { label: string; run: () => void }
  reason?: string
}

interface Props {
  tourId: string
  // When given, the plan item is about this show; otherwise any show on the tour counts.
  showId?: string
  title?: string
}

// "Be ready for the sale": one status and one action per row, with a progress count.
// Shared by the tour page, the pre-sale hub and the waiting room.
export default function ReadinessChecklist({ tourId, showId, title = 'Ready to buy?' }: Props) {
  const store = useStore()
  const id = useId()
  const user = store.user
  const tourShows = store.shows.filter((s) => s.tourId === tourId)
  const show = showId ? store.findShow(showId) : undefined
  const plannable = (show ? [show] : tourShows).filter((s) => s.hasQueue && !['sold-out', 'on-sale'].includes(store.statusOf(s)))
  const needsPlan = show ? show.hasQueue : true

  const items: Item[] = [
    user
      ? { key: 'login', done: true, label: `Logged in as ${user.name}. You'll stay signed in on this device.` }
      : { key: 'login', done: false, label: 'Log in on the device you\'ll use for the sale', action: { label: 'Log in', run: () => store.openLogin('login') } },
  ]

  if (needsPlan) {
    const done = (show ? [show] : tourShows).some((s) => store.planFor(s.id))
    const target = plannable[0]
    items.push({
      key: 'plan',
      done,
      label: done ? 'Ticket plan set' : 'Set your ticket plan: seats, budget and sections',
      action: done || !user || !target ? undefined : { label: 'Set plan', run: () => navigate(`/tour/${tourId}?plan=${target.id}`) },
      reason: done ? undefined : !user ? 'Log in first.' : !target ? 'No queue sale is coming up for this tour.' : undefined,
    })
  }

  items.push({
    key: 'card',
    done: !!user?.paymentSaved,
    label: user?.paymentSaved ? 'Card saved for fast checkout (demo card ending 4242)' : 'Save a card so checkout takes seconds',
    action: user && !user.paymentSaved
      ? { label: 'Add card', run: () => { store.setPaymentSaved(true); store.toast('Demo card ending 4242 saved. QuickSeat never stores real card numbers in this prototype.') } }
      : undefined,
    reason: !user ? 'Log in first.' : undefined,
  })

  const ready = items.filter((i) => i.done).length
  const all = ready === items.length

  return (
    <section className="stack" aria-labelledby={`${id}-h`}>
      <div className="row between">
        <h2 id={`${id}-h`} style={{ fontSize: 20 }}>{title}</h2>
        <span className={`badge ${all ? 'badge-good' : 'badge-neutral'}`}>
          {all && <Icon name="check" />}
          {ready} of {items.length} ready
        </span>
      </div>
      <ul className="ready-list">
        {items.map((item) => (
          <li key={item.key} className={item.done ? 'done' : ''}>
            <span className="ready-status" aria-hidden="true">{item.done && <Icon name="check" />}</span>
            <span className="ready-text">
              <span className="visually-hidden">{item.done ? 'Done: ' : 'To do: '}</span>
              {item.label}
              {item.reason && <span className="tiny muted ready-why">{item.reason}</span>}
            </span>
            {item.action && <button className="btn btn-secondary btn-sm" onClick={item.action.run}>{item.action.label}</button>}
          </li>
        ))}
      </ul>
    </section>
  )
}
