import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { usePresale } from '../presale'
import { cities } from '../data'
import { href, navigate, useRoute } from '../router'
import Icon from './Icon'
import ThemePicker from './ThemePicker'

function SearchBox({ id }: { id: string }) {
  const { search, setSearch } = useStore()
  const route = useRoute()
  return (
    <form className="nav-search" role="search" onSubmit={(e) => { e.preventDefault(); navigate('/'); document.getElementById('tours')?.scrollIntoView() }}>
      <label htmlFor={id} className="visually-hidden">Search artist, city or venue</label>
      <Icon name="search" />
      <input
        id={id}
        type="search"
        placeholder="Search artist, city or venue"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          if (route.path !== '/') navigate('/')
        }}
      />
    </form>
  )
}

function UserMenu() {
  const store = useStore()
  const { user, logout } = store
  const presale = usePresale()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!user) return null
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="relative" ref={wrap} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button className="icon-btn" aria-label={`Account menu for ${user.name}`} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <span className="avatar">{initials}</span>
      </button>
      {open && (
        <div className="menu" role="menu" onClick={() => setOpen(false)}>
          <div style={{ padding: '8px 12px' }}>
            <strong>{user.name}</strong>
            <div className="small muted">{user.email}</div>
          </div>
          <hr />
          <a role="menuitem" href={href('/tickets')}>My tickets</a>
          {presale.myRegistrations.map((r) => {
            const show = store.findShow(r.showId)
            if (!show) return null
            return (
              <a key={r.showId} role="menuitem" href={href(`/tour/${show.tourId}/show/${show.id}/hub`)}>
                Pre-sale hub: {store.artistOf(store.tourOf(show)).name} · {store.arenaOf(show).city}
              </a>
            )
          })}
          {user.role === 'admin' && <a role="menuitem" href={href('/admin')}>Admin dashboard</a>}
          <hr />
          <button role="menuitem" onClick={() => { logout(); navigate('/') }}>Log out</button>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, openLogin, city, setCity } = useStore()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <a className="wordmark" href={href('/')} aria-label="QuickSeat home">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="15" fill="currentColor" />
            <circle cx="16" cy="16" r="9" fill="none" stroke="var(--nav-bg)" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="3.5" fill="var(--nav-bg)" />
          </svg>
          QuickSeat
        </a>
        <SearchBox id="nav-search" />
        <div className="nav-actions">
          <button className="icon-btn only-mobile" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen(!searchOpen)}>
            <Icon name="search" size={22} />
          </button>
          <label className="visually-hidden" htmlFor="nav-city">City</label>
          <select id="nav-city" className="nav-select hide-mobile" value={city} onChange={(e) => { setCity(e.target.value); navigate('/') }}>
            <option value="">All cities</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <ThemePicker />
          {user ? (
            <UserMenu />
          ) : (
            <>
              <button className="nav-btn nav-btn-outline hide-mobile" onClick={() => openLogin('signup')}>Sign up</button>
              <button className="nav-btn" onClick={() => openLogin('login')}>Log in</button>
            </>
          )}
        </div>
      </div>
      <div className={`container nav-mobile-search ${searchOpen ? 'open' : ''}`}>
        {searchOpen && <SearchBox id="nav-search-mobile" />}
      </div>
    </header>
  )
}
