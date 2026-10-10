import { useStore } from '../store'
import type { Booking, Show } from '../types'
import Icon from './Icon'

// After the leader checks out: hand each friend in the group their own ticket in one go.
export default function GroupCard({ show, booking }: { show: Show; booking: Booking }) {
  const store = useStore()
  const group = store.groupFor(show.id, booking.username)
  if (!group || group.leader !== booking.username || group.members.length < 2) return null
  const nameOf = (u: string) => store.users.find((x) => x.username === u)?.name ?? u
  const friends = group.members.filter((m) => m !== group.leader)
  const short = Math.max(0, friends.length - (booking.seats.length - 1))

  return (
    <section className="card surface stack-sm" aria-labelledby="group-h">
      <h2 id="group-h" style={{ fontSize: 20 }}><Icon name="users" size={20} /> Your group</h2>
      {group.ticketsSent ? (
        <p><Icon name="check" size={16} /> Tickets sent to {friends.map(nameOf).join(', ')}. They're in each friend's My tickets, and the group page shows everyone the result.</p>
      ) : (
        <>
          <p className="small">You queued for {friends.map(nameOf).join(', ')}. Send each friend their own ticket so you don't have to meet up at the door.</p>
          {short > 0 && <p className="small" style={{ color: 'var(--warning-ink)' }}>You bought {booking.seats.length} {booking.seats.length === 1 ? 'ticket' : 'tickets'} for {group.members.length} people, so {short} {short === 1 ? 'friend misses' : 'friends miss'} out.</p>}
          <div>
            <button className="btn btn-primary" onClick={() => {
              const sent = store.sendGroupTickets(group.id, booking.id)
              store.toast(sent ? `Sent ${sent} ${sent === 1 ? 'ticket' : 'tickets'} to your group.` : 'No spare tickets to send.')
            }}>Send each friend their ticket</button>
          </div>
        </>
      )}
    </section>
  )
}
