import type { Store } from '../store'
import { href, navigate } from '../router'

interface Props {
  store: Store
  page: string
}

export default function Nav({ store, page }: Props) {
  const { user } = store
  const link = (to: string, label: string, active: boolean) => (
    <a href={to} className={`nav-link${active ? ' active' : ''}`}>{label}</a>
  )

  return (
    <header className="nav">
      <div className="container nav-inner">
        <a href={href()} className="brand">
          <span className="logo-mark" /> <span className="brand-name">QuickSeat</span>
        </a>
        <nav className="nav-links">
          {link(href(), 'Discover', page === '' || page === 'artists' || page === 'shows')}
          {user?.role === 'customer' && link(href('tickets'), 'My tickets', page === 'tickets')}
          {user?.role === 'admin' && link(href('admin'), 'Dashboard', page === 'admin')}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="avatar" title={user.email}>{user.name.charAt(0).toUpperCase()}</span>
              <span className="nav-user">
                <strong>{user.name.split(' ')[0]}</strong>
                <span className="tiny muted">{user.role === 'admin' ? 'Admin' : `@${user.username}`}</span>
              </span>
              <button
                className="btn ghost sm"
                onClick={async () => {
                  await store.logout()
                  navigate()
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <a href={href('login')} className="btn ghost sm">Log in</a>
              <a href={href('register')} className="btn primary sm">Sign up</a>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
