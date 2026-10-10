import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { cities } from '../data'
import { href } from '../router'
import { countdownTarget } from '../sale'
import { formatShortDate, formatShowDate } from '../seats'
import { readStored, writeStored } from '../storage'
import { useActionLabel, useFeaturedShow, useShowAction } from '../actions'
import type { Show, Tour } from '../types'
import Poster from '../components/Poster'
import StatusBadge from '../components/StatusBadge'
import Countdown from '../components/Countdown'
import Icon from '../components/Icon'
import { WELCOME } from '../components/LoginModal'

const countdownLabel: Partial<Record<string, string>> = {
  announced: 'On sale in',
  'presale-soon': 'On sale in',
  'waiting-room': 'Queue opens in',
}

function SaleLine({ show }: { show: Show }) {
  const { statusOf } = useStore()
  const status = statusOf(show)
  const target = countdownTarget(show, status)
  return (
    <div className="row" style={{ gap: 8 }}>
      <StatusBadge status={status} />
      {target && (
        <span className="small muted">
          {countdownLabel[status]} <Countdown to={target} />
        </span>
      )}
    </div>
  )
}

function Hero({ tours }: { tours: Tour[] }) {
  const store = useStore()
  const featured = useFeaturedShow()
  const act = useShowAction()
  const label = useActionLabel()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (paused || reduced || tours.length < 2) return
    const t = setInterval(() => setIndex((i) => (i + 1) % tours.length), 8000)
    return () => clearInterval(t)
  }, [paused, reduced, tours.length])

  if (!tours.length) return null
  const tour = tours[index % tours.length]
  const artist = store.artistOf(tour)
  const show = featured(tour.id)
  const status = show && store.statusOf(show)
  const target = show && status && countdownTarget(show, status)

  return (
    <section className="hero" aria-roledescription="carousel" aria-label="Featured tours" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="container">
        <div className="hero-slide" aria-roledescription="slide" aria-label={`${index + 1} of ${tours.length}`}>
          <a href={href(`/tour/${tour.id}`)} aria-label={`${tour.name} by ${artist.name}`}><Poster artist={artist} tour={tour} /></a>
          <div className="stack">
            <span className="eyebrow">{artist.name} · {artist.genre}</span>
            <h1>{tour.name}</h1>
            <p className="muted" style={{ fontSize: 18 }}>{tour.tagline}</p>
            {show && status && (
              <>
                <p>
                  <span className="inline-icon"><Icon name="pin" size={16} /></span> <b>{store.arenaOf(show).city}</b> · {store.arenaOf(show).name} · {formatShowDate(show.date)}
                </p>
                <StatusBadge status={status} />
                {target && (
                  <div>
                    <div className="small muted">{countdownLabel[status]}</div>
                    <Countdown to={target} className="hero-countdown" />
                  </div>
                )}
                <div className="row">
                  <button className="btn btn-primary btn-lg" onClick={() => act(show)}>{label(show)}</button>
                  <a className="btn btn-ghost" href={href(`/tour/${tour.id}`)}>All dates <Icon name="arrowRight" size={16} /></a>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="carousel-controls">
          <button className="icon-btn" aria-label="Previous tour" onClick={() => setIndex((index - 1 + tours.length) % tours.length)}><Icon name="left" size={22} /></button>
          <div className="dots">
            {tours.map((t, i) => (
              <button key={t.id} aria-label={`Show ${t.name}`} aria-current={i === index} onClick={() => setIndex(i)}><span /></button>
            ))}
          </div>
          <button className="icon-btn" aria-label="Next tour" onClick={() => setIndex((index + 1) % tours.length)}><Icon name="right" size={22} /></button>
        </div>
      </div>
    </section>
  )
}

function TourCard({ tour }: { tour: Tour }) {
  const store = useStore()
  const featured = useFeaturedShow()
  const artist = store.artistOf(tour)
  const show = featured(tour.id)
  const tourCities = [...new Set(store.shows.filter((s) => s.tourId === tour.id).map((s) => store.arenaOf(s).city))]
  const dates = store.shows.filter((s) => s.tourId === tour.id).map((s) => s.date)

  return (
    <a className="tour-card" href={href(`/tour/${tour.id}`)}>
      <Poster artist={artist} tour={tour} />
      <div className="stack-sm">
        <h3>{tour.name}</h3>
        <span className="muted">{artist.name} · {dates.length ? `${formatShortDate(dates[0])} – ${formatShortDate(dates[dates.length - 1])}` : 'Dates TBA'}</span>
        <div className="row" style={{ gap: 6 }}>
          {tourCities.map((c) => <span className="chip" key={c}>{c}</span>)}
        </div>
        {show && <SaleLine show={show} />}
      </div>
    </a>
  )
}

const steps = [
  { icon: 'list' as const, title: 'Set your plan', body: 'Before the sale, choose how many tickets, your budget and up to three sections in order.' },
  { icon: 'shield' as const, title: 'Join a fair queue', body: 'Everyone in the waiting room gets a random place. Refreshing never changes it.' },
  { icon: 'bell' as const, title: 'Get alerted, look away', body: 'We track your sections live and only interrupt you when your plan changes.' },
]

export default function Landing() {
  const store = useStore()
  const { search, city, setCity, setSearch, user, openLogin } = store

  // Soft welcome pop-up: once per session, ~2s after landing or on first scroll. Never blocks browsing.
  useEffect(() => {
    if (user || readStored('quickseat:welcomed', false, true)) return
    const show = () => {
      if (readStored('quickseat:welcomed', false, true)) return
      writeStored('quickseat:welcomed', true, true)
      openLogin('login', WELCOME)
    }
    const t = setTimeout(show, 2000)
    window.addEventListener('scroll', show, { once: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', show)
    }
  }, [user, openLogin])

  const q = search.trim().toLowerCase()
  const visible = store.tours.filter((t) => {
    const artist = store.artistOf(t)
    const shows = store.shows.filter((s) => s.tourId === t.id)
    const places = shows.map((s) => `${store.arenaOf(s).city} ${store.arenaOf(s).name}`.toLowerCase())
    const matchesQ = !q || [artist.name, t.name, artist.genre].some((x) => x.toLowerCase().includes(q)) || places.some((p) => p.includes(q))
    const matchesCity = !city || shows.some((s) => store.arenaOf(s).city === city)
    return matchesQ && matchesCity
  })

  return (
    <>
      <Hero tours={store.tours} />
      <div className="container page">
        <section id="tours" aria-labelledby="tours-h" className="stack-lg">
          <div className="row between">
            <div className="stack-sm">
              <h2 id="tours-h">On sale soon</h2>
              <p className="muted">{city ? `Tours playing ${city}` : 'Every tour, every city. Times are shown in your time zone.'}</p>
            </div>
            {(q || city) && <button className="link-btn" onClick={() => { setSearch(''); setCity('') }}>Clear filters</button>}
          </div>
          {visible.length ? (
            <div className="tour-grid">{visible.map((t) => <TourCard key={t.id} tour={t} />)}</div>
          ) : (
            <div className="empty stack-sm" role="status">
              <strong>No results for "{search || city}"</strong>
              <p className="muted">Try an artist like BTS, or a city like Sydney.</p>
              <div><button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setCity('') }}>Show all tours</button></div>
            </div>
          )}
        </section>

        <section className="section-gap stack" aria-labelledby="city-h">
          <h2 id="city-h">Browse by city</h2>
          <div className="city-grid">
            {cities.map((c) => {
              const count = store.shows.filter((s) => store.arenaOf(s).city === c).length
              return (
                <button key={c} className="city-tile" aria-pressed={city === c} onClick={() => { setCity(city === c ? '' : c); document.getElementById('tours')?.scrollIntoView() }}>
                  <span>{c}</span>
                  <span className="small" style={{ fontWeight: 500, opacity: 0.8 }}>{count} {count === 1 ? 'show' : 'shows'}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="section-gap stack" aria-labelledby="how-h">
          <h2 id="how-h">How QuickSeat works</h2>
          <div className="steps">
            {steps.map((s, i) => (
              <div key={s.title} className="card surface stack-sm">
                <div className="step-icon"><Icon name={s.icon} /></div>
                <span className="eyebrow">Step {i + 1}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
