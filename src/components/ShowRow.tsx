import type { Arena, Artist, Concert } from '../types'
import { dateParts, minPrice, money } from '../seats'
import { href } from '../router'
import ArtistImage from './ArtistImage'

interface Props {
  concert: Concert
  arena?: Arena
  artist?: Artist
  left: number
}

// One upcoming show: date, artist, venue, availability and a booking link.
export default function ShowRow({ concert, arena, artist, left }: Props) {
  const d = dateParts(concert.date)
  const soldPct = Math.round(((concert.ticketLimit - left) / concert.ticketLimit) * 100)
  const status = left === 0 ? 'Sold out' : left <= concert.ticketLimit * 0.15 ? `Only ${left} left` : `${left} tickets left`

  return (
    <a href={left === 0 ? undefined : href('shows', concert.id)} className={`show-row${left === 0 ? ' sold-out' : ''}`}>
      <div className="date-badge">
        <span className="month">{d.month}</span>
        <span className="day">{d.day}</span>
        <span className="weekday">{d.weekday}</span>
      </div>
      <ArtistImage name={concert.artist} src={artist?.imageUrl} className="show-thumb" />
      <div className="show-info">
        <strong>{concert.artist}</strong>
        <span className="muted">{concert.title}</span>
        <span className="small venue">
          {arena ? `${arena.name} · ${arena.city}` : 'Venue TBA'}
        </span>
      </div>
      <div className="show-avail">
        <div className="meter" aria-hidden>
          <span style={{ width: `${soldPct}%` }} />
        </div>
        <span className={`small${left > 0 && left <= concert.ticketLimit * 0.15 ? ' hot' : ' muted'}`}>{status}</span>
      </div>
      <div className="show-cta">
        {arena && <span className="small muted">From {money(minPrice(arena))}</span>}
        <span className={`btn sm ${left === 0 ? 'disabled' : 'primary'}`}>{left === 0 ? 'Sold out' : 'Get tickets'}</span>
      </div>
    </a>
  )
}
