import type { Store } from '../store'
import { arenas } from '../data'
import { minPrice, money, ticketsLeft } from '../seats'
import { href } from '../router'
import ArtistImage from '../components/ArtistImage'
import ShowRow from '../components/ShowRow'

export default function ArtistPage({ store, name }: { store: Store; name: string }) {
  const artist = store.artists.find((a) => a.name === name)
  const shows = store.concerts.filter((c) => c.artist === name)

  if (!artist && shows.length === 0) {
    return (
      <div className="container block">
        <div className="empty">
          We couldn't find that artist. <a href={href()}>Back to all shows</a>
        </div>
      </div>
    )
  }

  const showArenas = shows.map((s) => arenas.find((a) => a.id === s.arenaId)).filter((a) => !!a)
  const cities = [...new Set(showArenas.map((a) => a!.city.split(',')[0]))]
  const from = showArenas.length ? Math.min(...showArenas.map((a) => minPrice(a!))) : null
  const left = shows.reduce((n, s) => n + ticketsLeft(s, store.taken), 0)

  return (
    <>
      <section className="artist-hero">
        {artist?.imageUrl && <div className="artist-hero-bg" style={{ backgroundImage: `url("${artist.imageUrl}")` }} aria-hidden />}
        <div className="container artist-hero-inner">
          <ArtistImage name={name} src={artist?.imageUrl} className="artist-portrait" />
          <div>
            <a href={href()} className="back-link">← All artists</a>
            {artist?.genre && <span className="tag">{artist.genre}</span>}
            <h1>{name}</h1>
            {artist?.bio && <p className="lead">{artist.bio}</p>}
            <div className="artist-stats">
              <div><strong>{shows.length}</strong><span>show{shows.length === 1 ? '' : 's'}</span></div>
              <div><strong>{cities.length}</strong><span>cit{cities.length === 1 ? 'y' : 'ies'}</span></div>
              <div><strong>{left}</strong><span>tickets left</span></div>
              {from !== null && <div><strong>{money(from)}</strong><span>tickets from</span></div>}
            </div>
          </div>
        </div>
      </section>

      <section className="container block">
        <div className="block-head">
          <div>
            <span className="eyebrow">Tour dates</span>
            <h2>{shows[0]?.title ?? 'Shows'}</h2>
          </div>
          {cities.length > 0 && <span className="muted small">{cities.join(' · ')}</span>}
        </div>
        {shows.length === 0 ? (
          <div className="empty">No shows announced yet. Check back soon.</div>
        ) : (
          <div className="show-list">
            {shows.map((c) => (
              <ShowRow
                key={c.id}
                concert={c}
                arena={arenas.find((a) => a.id === c.arenaId)}
                artist={artist}
                left={ticketsLeft(c, store.taken)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
