import { useState } from 'react'
import type { Artist, Tour } from '../types'

interface Props {
  artist: Artist
  tour: Tour
  small?: boolean
}

// Uses a real poster when one is configured, otherwise a generated typographic poster.
export default function Poster({ artist, tour, small }: Props) {
  const [failed, setFailed] = useState(false)
  const url = tour.posterUrl || artist.posterUrl
  const [from, to] = artist.posterGradient
  const label = `${artist.name}: ${tour.name} poster`

  if (url && !failed) {
    return (
      <div className={`poster ${small ? 'poster-sm' : ''}`}>
        <img src={url} alt={label} onError={() => setFailed(true)} loading="lazy" />
      </div>
    )
  }

  return (
    <div className={`poster ${small ? 'poster-sm' : ''}`} role="img" aria-label={label}>
      <div className="poster-gen" style={{ background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)` }}>
        <svg className="grain" aria-hidden="true">
          <filter id={`n-${artist.id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#n-${artist.id})`} />
        </svg>
        <svg className="rings" viewBox="0 0 200 200" aria-hidden="true">
          {[96, 80, 64, 48, 32].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#fff" strokeWidth="1.2" />
          ))}
          <circle cx="100" cy="100" r="14" fill="#fff" />
        </svg>
        <div className="poster-artist">{artist.name}</div>
        <div className="poster-tour">{tour.name}</div>
      </div>
    </div>
  )
}
