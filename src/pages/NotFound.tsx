import { href } from '../router'
import { useDocumentTitle } from './shared'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="container page narrow">
      <div className="empty stack" style={{ alignItems: 'center' }}>
        <h1 style={{ fontSize: 28 }}>We couldn't find that page</h1>
        <p className="muted">The link may be old, or the show may have been removed.</p>
        <a className="btn btn-primary" href={href('/')}>Go to the homepage</a>
      </div>
    </div>
  )
}
