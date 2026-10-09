import { StoreProvider } from './store'
import { PresaleProvider } from './presale'
import { useRoute } from './router'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LoginModal from './components/LoginModal'
import RecordPlayer from './components/RecordPlayer'
import Toasts from './components/Toasts'
import PreRegisterModal from './components/PreRegisterModal'
import TriviaModal from './components/TriviaModal'
import Nudge, { NudgeScheduler } from './components/Nudge'
import PresaleHub from './pages/PresaleHub'
import InboxPage from './pages/InboxPage'
import EmailScheduler from './components/EmailScheduler'
import Landing from './pages/Landing'
import TourPage from './pages/TourPage'
import WaitingRoom from './pages/WaitingRoom'
import QueuePage from './pages/QueuePage'
import SeatsPage from './pages/SeatsPage'
import OutcomePage from './pages/OutcomePage'
import MyTickets from './pages/MyTickets'
import AdminPage from './pages/AdminPage'
import HelpPage from './pages/HelpPage'
import NotFound from './pages/NotFound'

function Page() {
  const { parts } = useRoute()
  const [a, id, b, showId, page] = parts

  if (!a) return <Landing />
  if (a === 'tickets' && !id) return <MyTickets />
  if (a === 'admin' && !id) return <AdminPage />
  if (a === 'help' && !id) return <HelpPage />
  if (a === 'inbox' && !id) return <InboxPage />
  if (a === 'tour' && id && !b) return <TourPage key={id} tourId={id} />
  if (a === 'tour' && b === 'show' && showId) {
    if (page === 'hub') return <PresaleHub showId={showId} />
    if (page === 'waiting') return <WaitingRoom showId={showId} />
    if (page === 'queue') return <QueuePage showId={showId} />
    if (page === 'seats') return <SeatsPage showId={showId} />
    if (page === 'outcome') return <OutcomePage showId={showId} />
  }
  return <NotFound />
}

export default function App() {
  return (
    <StoreProvider>
      <PresaleProvider>
      <a className="visually-hidden" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>Skip to content</a>
      <Navbar />
      <main id="main" tabIndex={-1}>
        <Page />
      </main>
      <Footer />
      <LoginModal />
      <RecordPlayer />
      <PreRegisterModal />
      <TriviaModal />
      <Nudge />
      <NudgeScheduler />
      <EmailScheduler />
      <Toasts />
      </PresaleProvider>
    </StoreProvider>
  )
}
