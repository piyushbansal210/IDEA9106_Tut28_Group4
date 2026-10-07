import { useStore } from './store'
import { href, useRoute } from './router'
import Nav from './components/Nav'
import Home from './pages/Home'
import ArtistPage from './pages/ArtistPage'
import ShowPage from './pages/ShowPage'
import AuthPage from './pages/AuthPage'
import MyTickets from './pages/MyTickets'
import AdminPage from './pages/AdminPage'

export default function App() {
  const store = useStore()
  const [page, param] = useRoute()

  if (!store.ready) {
    return (
      <div className="loading-screen">
        <div className="logo-mark big" />
      </div>
    )
  }

  let content
  if (page === 'artists' && param) content = <ArtistPage key={param} store={store} name={param} />
  else if (page === 'shows' && param) content = <ShowPage key={param} store={store} id={param} />
  else if (page === 'login' || page === 'register') content = <AuthPage key={page} store={store} mode={page} />
  else if (page === 'tickets') content = <MyTickets store={store} />
  else if (page === 'admin') content = <AdminPage store={store} />
  else content = <Home store={store} />

  return (
    <>
      <Nav store={store} page={page ?? ''} />
      {store.error && <div className="banner-error">{store.error}</div>}
      <main>{content}</main>
      <footer className="footer">
        <div className="container footer-inner">
          <a href={href()} className="brand">
            <span className="logo-mark" /> QuickSeat
          </a>
          <p className="muted small">
            Pick your exact seat and book in seconds – no queues, no waiting rooms. A design thinking prototype,
            IDEA9106.
          </p>
          <p className="muted tiny">Artist photos from Wikimedia Commons (CC licences).</p>
        </div>
      </footer>
    </>
  )
}
