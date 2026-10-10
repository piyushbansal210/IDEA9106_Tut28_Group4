import { href } from '../router'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container stack">
        <nav className="footer-links" aria-label="Footer">
          <a href={href('/help')}>Help</a>
          <a href={href('/help')}>FAQ</a>
          <a href={href('/help')}>Accessibility</a>
          <a href={href('/help')}>Terms</a>
        </nav>
        <p className="small muted">
          QuickSeat is a student design prototype (IDEA9106). No real tickets are sold. Artist names are used for illustration only.
        </p>
      </div>
    </footer>
  )
}
