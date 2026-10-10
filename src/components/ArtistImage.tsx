import { useState } from 'react'

interface Props {
  name: string
  src?: string
  className?: string
}

// Artist photo, falling back to a gradient with initials when there's no image or it fails to load.
export default function ArtistImage({ name, src, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return <img className={`artist-img ${className}`} src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />
  }
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  // Pick a stable hue from the name so each artist keeps the same colour.
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
  return (
    <div
      className={`artist-img artist-fallback ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 80% 55%), hsl(${(hue + 60) % 360} 70% 35%))` }}
      role="img"
      aria-label={name}
    >
      {initials}
    </div>
  )
}
