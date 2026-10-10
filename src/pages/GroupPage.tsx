import { useStore } from '../store'
import { href, navigate } from '../router'
import { showPath } from '../sale'
import { money, seatLabel } from '../seats'
import { planSummary } from '../components/PlanModal'
import StatusBadge from '../components/StatusBadge'
import Icon from '../components/Icon'
import { LoginGate, ShowHeader, useDocumentTitle } from './shared'
import NotFound from './NotFound'

export const MAX_GROUP = 8

export const groupLink = (id: string) => `${location.origin}${location.pathname}#/group/${id}`

export function copyGroupLink(id: string) {
  void navigator.clipboard?.writeText(groupLink(id)).catch(() => {})
}

function Group({ id }: { id: string }) {
  const store = useStore()
  useDocumentTitle('Group')
  const group = store.groups.find((g) => g.id === id)
  const show = group && store.findShow(group.showId)
  if (!group || !show) {
    return (
      <div className="container page narrow">
        <div className="empty stack" style={{ alignItems: 'center' }}>
          <h1 style={{ fontSize: 28 }}>This group has ended</h1>
          <p className="muted">The organiser may have left it, or the link was mistyped. Groups live in this browser only, so a link opened on another device won't find it.</p>
          <a className="btn btn-primary" href={href('/')}>Browse tours</a>
        </div>
      </div>
    )
  }

  const me = store.user!.username
  const arena = store.arenaOf(show)
  const status = store.statusOf(show)
  const nameOf = (u: string) => store.users.find((x) => x.username === u)?.name ?? u
  const isLeader = group.leader === me
  const isMember = group.members.includes(me)
  const otherGroup = !isMember && store.groupFor(show.id)
  const plan = store.planOf(group.leader, show.id)
  const full = group.members.length >= MAX_GROUP
  const tooFewSeats = plan && plan.quantity < group.members.length

  // Results the whole group can see: who holds which seat, or the waitlist if it sold out.
  const seatsOf = (u: string) => store.bookings.filter((b) => b.showId === show.id && b.username === u).flatMap((b) => b.seats)
  const leaderSeats = seatsOf(group.leader)
  const leaderWaitlisted = store.waitlists.some((w) => w.showId === show.id && w.username === group.leader)

  return (
    <div className="container page narrow stack-lg">
      <ShowHeader show={show} right={<StatusBadge status={status} />} />
      <div className="stack-sm">
        <span className="eyebrow">Group of {group.members.length}</span>
        <h1 style={{ fontSize: 32 }}>{isLeader ? 'Your group' : `${nameOf(group.leader)}'s group`}</h1>
        <p className="muted">One person queues and buys seats together for everyone. Nobody else needs to join the queue, so the group can't be split across different queue places.</p>
      </div>

      <section className="card stack" aria-labelledby="members-h">
        <h2 id="members-h" style={{ fontSize: 20 }}>Who's going</h2>
        <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {group.members.map((m) => {
            const seats = seatsOf(m)
            return (
              <li key={m} className="row between">
                <span>
                  <b>{nameOf(m)}</b>{m === me && ' (you)'}{' '}
                  {m === group.leader && <span className="badge badge-info">Queues for the group</span>}
                </span>
                <span className="row" style={{ gap: 8 }}>
                  {seats.length > 0 && <span className="chip">{seats.map((s) => seatLabel(arena, s)).join('; ')}</span>}
                  {isLeader && m !== me && <button className="link-btn small" onClick={() => { store.leaveGroup(group.id, m); store.toast(`${nameOf(m)} removed from the group.`) }}>Remove</button>}
                </span>
              </li>
            )
          })}
        </ul>
        {isLeader && (
          <div className="row">
            <button className="btn btn-secondary" disabled={full} onClick={() => { copyGroupLink(group.id); store.toast('Invite link copied. Send it to your friends.') }}>
              <Icon name="share" size={18} /> Copy invite link
            </button>
            <span className="small muted">{full ? `Groups are capped at ${MAX_GROUP}, the most tickets one order can hold.` : `Up to ${MAX_GROUP} people.`}</span>
          </div>
        )}
      </section>

      <section className="card stack-sm" aria-labelledby="plan-h">
        <h2 id="plan-h" style={{ fontSize: 20 }}>The group's plan</h2>
        {plan ? <p>{planSummary(plan, arena.sections)}</p> : <p className="muted">{isLeader ? 'You haven\'t set a ticket plan yet.' : `${nameOf(group.leader)} hasn't set a ticket plan yet.`}</p>}
        {tooFewSeats && (
          <p className="small" style={{ color: 'var(--warning-ink)' }}>
            The plan is for {plan.quantity} {plan.quantity === 1 ? 'ticket' : 'tickets'}, but there are {group.members.length} of you.
          </p>
        )}
        {isLeader && tooFewSeats && (
          <div><button className="btn btn-primary btn-sm" onClick={() => { store.savePlan({ ...plan, quantity: group.members.length }); store.toast(`Plan updated to ${group.members.length} tickets together.`) }}>Change the plan to {group.members.length} tickets</button></div>
        )}
        {isLeader && !plan && <div><a className="btn btn-primary btn-sm" href={href(`/tour/${show.tourId}?plan=${show.id}`)}>Set the plan</a></div>}
        {plan && <p className="small muted">Budget check: up to {money(plan.maxPricePerTicket * group.members.length)} for the whole group before fees.</p>}
      </section>

      <section className="card surface stack-sm" aria-live="polite">
        <span className="eyebrow">Group update</span>
        {leaderSeats.length > 0 || group.ticketsSent ? (
          <p><Icon name="check" size={16} /> {isLeader ? 'You got' : `${nameOf(group.leader)} got`} tickets!{group.ticketsSent ? ' Everyone\'s ticket is in their own My tickets.' : ' Tickets will be sent to each of you shortly.'}</p>
        ) : status === 'sold-out' ? (
          <p>Sold out. {leaderWaitlisted ? `${isLeader ? 'You hold' : `${nameOf(group.leader)} holds`} a waitlist place for the group.` : 'Nobody in the group got tickets this time.'}</p>
        ) : (
          <p>No tickets yet. {isLeader ? 'You\'ll queue for everyone when the sale opens.' : `${nameOf(group.leader)} will queue for everyone. You can look away: this page updates when there's news.`}</p>
        )}
      </section>

      <div className="row">
        {otherGroup ? (
          <p className="small muted">You're already in another group for this show. <a href={href(`/group/${otherGroup.id}`)}>Open it</a></p>
        ) : !isMember ? (
          <button className="btn btn-primary btn-lg" disabled={full} onClick={() => { store.joinGroup(group.id); store.toast(`You've joined ${nameOf(group.leader)}'s group.`) }}>
            Join {nameOf(group.leader)}'s group
          </button>
        ) : isLeader ? (
          <>
            {(status === 'waiting-room' || status === 'queue-open' || status === 'on-sale') && <a className="btn btn-primary" href={href(showPath(show, status === 'waiting-room' ? 'waiting' : status === 'queue-open' ? 'queue' : 'seats'))}>Go to the sale</a>}
            <button className="btn btn-ghost" onClick={() => confirm('End this group for everyone?') && (store.leaveGroup(group.id), navigate('/tickets'))}>End group</button>
          </>
        ) : (
          <button className="btn btn-ghost" onClick={() => { store.leaveGroup(group.id); store.toast('You left the group.'); navigate(`/tour/${show.tourId}`) }}>Leave group</button>
        )}
      </div>
    </div>
  )
}

export default function GroupPage({ id }: { id: string }) {
  const { groups } = useStore()
  if (!id) return <NotFound />
  return (
    <LoginGate reason={groups.some((g) => g.id === id) ? 'Log in to join your friend\'s group.' : 'Log in to see this group.'}>
      <Group id={id} />
    </LoginGate>
  )
}
