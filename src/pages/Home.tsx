import { useState } from 'react'
import type { Store } from '../store'
import { arenas } from '../data'
import { capacity, dateParts, minPrice, money, ticketsLeft } from '../seats'
import { href } from '../router'
import ArtistImage from '../components/ArtistImage'
import ShowRow from '../components/ShowRow'

const cityOf = (arenaId: string) => arenas.find((a) => a.id === arenaId)?.city.split(',')[0] ?? ''
const CITIES = [...new Set(arenas.map((a) => a.city.split(',')[0]))]

export default function Home({ store }: { store: Store }) {
  const { artists, concerts, taken } = store
  const [query, setQuery] = useState('')
  const [city, setCity] = useState<string | null>(null)

  const artistOf = (name: string) => artists.find((a) => a.name === name)
  const showsFor = (name: string) => concerts.filter((c) => c.artist === name)

  // Artists with shows first, ordered by their next show.
  const lineup = artists
    .map((a) => ({ artist: a, shows: showsFor(a.name) }))
    .sort((x, y) => (x.shows[0]?.date ?? '9999').localeCompare(y.shows[0]?.date ?? '9999'))
  const next = concerts.find((c) => ticketsLeft(c, taken) > 0)
  const heroArtists = lineup.filter((l) => l.artist.imageUrl).slice(0, 3)

  const q = query.trim().toLowerCase()
  const filtered = concerts.filter((c) => {
    const arena = arenas.find((a) => a.id === c.arenaId)
    const text = `${c.artist} ${c.title} ${arena?.name} ${arena?.city}`.toLowerCase()
    return (!q || text.includes(q)) && (!city || cityOf(c.arenaId) === city)
  })

  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden />
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="pulse" /> Live across Australia · 2026–27
            </span>
            <h1>
              Skip the queue.
              <br />
              <span className="gradient-text">Pick your seat.</span>
            </h1>
            <p className="lead">
              No waiting rooms, no ballots. See the whole arena, choose the exact seats you want and book in
              seconds.
            </p>
            <div className="search">
              <svg viewBox="0 0 24 24" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search artists, tours or arenas"
                aria-label="Search shows"
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('shows')?.scrollIntoView({ behavior: 'smooth' })}
              />
            </div>
            <div className="chips">
              <button className={`chip${city === null ? ' active' : ''}`} onClick={() => setCity(null)}>All cities</button>
              {CITIES.map((c) => (
                <button key={c} className={`chip${city === c ? ' active' : ''}`} onClick={() => setCity(city === c ? null : c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-art" aria-hidden>
            {heroArtists.map(({ artist }, i) => (
              <a key={artist.name} href={href('artists', artist.name)} className={`hero-photo p${i}`} tabIndex={-1}>
                <ArtistImage name={artist.name} src={artist.imageUrl} />
                <span>{artist.name}</span>
              </a>
            ))}
            {next && (
              <a href={href('shows', next.id)} className="next-card" tabIndex={-1}>
                <span className="tiny muted">NEXT UP</span>
                <strong>{next.artist}</strong>
                <span className="small muted">
                  {dateParts(next.date).day} {dateParts(next.date).month} · {cityOf(next.arenaId)}
                </span>
              </a>
            )}
          </div>
        </div>

        <div className="container stats">
          <div><strong>{artists.length}</strong><span>artists on tour</span></div>
          <div><strong>{concerts.length}</strong><span>upcoming shows</span></div>
          <div><strong>{arenas.length}</strong><span>arenas</span></div>
          <div><strong>&lt;60s</strong><span>to book a seat</span></div>
        </div>
      </section>

      <section className="container block">
        <div className="block-head">
          <div>
            <span className="eyebrow">Line-up</span>
            <h2>Artists on tour</h2>
          </div>
        </div>
        <div className="artist-grid">
          {lineup.map(({ artist, shows }) => {
            const prices = shows.map((s) => arenas.find((a) => a.id === s.arenaId)).filter((a) => !!a).map((a) => minPrice(a!))
            return (
              <a key={artist.name} href={href('artists', artist.name)} className="artist-card">
                <ArtistImage name={artist.name} src={artist.imageUrl} />
                <div className="artist-card-body">
                  <span className="tag">{artist.genre || 'Live'}</span>
                  <h3>{artist.name}</h3>
                  <span className="small">
                    {shows.length === 0 ? 'No shows yet' : `${shows.length} show${shows.length > 1 ? 's' : ''}`}
                    {prices.length > 0 && ` · from ${money(Math.min(...prices))}`}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      </section>

      <section className="container block" id="shows">
        <div className="block-head">
          <div>
            <span className="eyebrow">Tickets</span>
            <h2>Upcoming shows</h2>
          </div>
          <span className="muted small">
            {filtered.length} of {concerts.length} shows{city && ` in ${city}`}
            {(q || city) && (
              <button className="link-btn" onClick={() => { setQuery(''); setCity(null) }}> · Clear filters</button>
            )}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty">No shows match that search. Try another artist or city.</div>
        ) : (
          <div className="show-list">
            {filtered.map((c) => (
              <ShowRow
                key={c.id}
                concert={c}
                arena={arenas.find((a) => a.id === c.arenaId)}
                artist={artistOf(c.artist)}
                left={ticketsLeft(c, taken)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="container block">
        <div className="block-head">
          <div>
            <span className="eyebrow">Venues</span>
            <h2>The arenas</h2>
          </div>
        </div>
        <div className="arena-grid">
          {arenas.map((a) => {
            const count = concerts.filter((c) => c.arenaId === a.id).length
            const prices = a.sections.map((s) => s.price)
            return (
              <div key={a.id} className="arena-card">
                <MiniArena sections={a.sections.length} />
                <h3>{a.name}</h3>
                <span className="muted small">{a.city}</span>
                <div className="arena-facts">
                  <span><strong>{capacity(a)}</strong> seats</span>
                  <span><strong>{a.sections.length}</strong> sections</span>
                  <span><strong>{count}</strong> show{count === 1 ? '' : 's'}</span>
                </div>
                <span className="small muted">
                  {money(Math.min(...prices))} – {money(Math.max(...prices))} · {a.sections.map((s) => s.name).join(', ')}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="container block">
        <div className="how">
          <div>
            <span className="eyebrow">How it works</span>
            <h2>From scrolling to seated in three taps</h2>
          </div>
          <ol className="steps">
            <li><span>1</span><strong>Find your show</strong><p className="muted small">Browse by artist or city and see live availability.</p></li>
            <li><span>2</span><strong>Pick exact seats</strong><p className="muted small">Tap seats on the arena map. Prices are shown per section.</p></li>
            <li><span>3</span><strong>Booked instantly</strong><p className="muted small">Your tickets are confirmed straight away. No queue.</p></li>
          </ol>
          {!store.user && (
            <a href={href('register')} className="btn primary">Create a free account</a>
          )}
        </div>
      </section>
    </>
  )
}

// Small decorative arena outline for the venue cards.
function MiniArena({ sections }: { sections: number }) {
  return (
    <svg className="mini-arena" viewBox="-60 -14 120 70" aria-hidden>
      {Array.from({ length: sections }, (_, i) => {
        const r = 18 + i * 12
        const a = 1.05
        const x = (r * Math.sin(a)).toFixed(1)
        const y = (r * Math.cos(a)).toFixed(1)
        return <path key={i} d={`M -${x} ${y} A ${r} ${r} 0 0 0 ${x} ${y}`} className={`ring r${i}`} />
      })}
      <rect x="-16" y="-10" width="32" height="12" rx="3" className="mini-stage" />
    </svg>
  )
}
