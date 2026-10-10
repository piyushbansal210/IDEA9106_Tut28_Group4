import { useState, type FormEvent } from 'react'
import type { Store } from '../store'
import { api, ApiError } from '../api'
import { authHref, routeQuery } from '../router'
import ArtistImage from '../components/ArtistImage'

type Mode = 'login' | 'register'
type Fields = { name: string; email: string; username: string; password: string; confirm: string }
type Errors = Partial<Record<keyof Fields | 'form', string>>

const empty: Fields = { name: '', email: '', username: '', password: '', confirm: '' }

// Same rules as the server, checked first so people get instant feedback.
function validate(mode: Mode, f: Fields): Errors {
  const e: Errors = {}
  if (mode === 'login') {
    if (!f.username.trim()) e.username = 'Enter your username or email.'
    if (!f.password) e.password = 'Enter your password.'
    return e
  }
  if (!f.name.trim()) e.name = 'Tell us your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address.'
  if (!/^[a-zA-Z0-9_.]{3,20}$/.test(f.username.trim())) e.username = '3–20 letters, numbers, dots or underscores.'
  if (f.password.length < 6) e.password = 'Use at least 6 characters.'
  if (f.confirm !== f.password) e.confirm = "Passwords don't match."
  return e
}

function strength(pw: string) {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  return { score, label: ['Too short', 'Weak', 'Okay', 'Good', 'Strong'][score] }
}

export default function AuthPage({ store, mode }: { store: Store; mode: Mode }) {
  const [fields, setFields] = useState<Fields>(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const next = routeQuery().get('next') ?? undefined
  const isLogin = mode === 'login'

  const set = (key: keyof Fields) => (e: { target: { value: string } }) => {
    const updated = { ...fields, [key]: e.target.value }
    setFields(updated)
    // Re-check fields the person has already visited as they type.
    if (touched[key] || errors[key]) setErrors((prev) => ({ ...prev, [key]: validate(mode, updated)[key], form: undefined }))
  }
  const blur = (key: keyof Fields) => () => {
    setTouched((t) => ({ ...t, [key]: true }))
    if (fields[key]) setErrors((prev) => ({ ...prev, [key]: validate(mode, fields)[key] }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(mode, fields)
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const user = isLogin
        ? await api.login(fields.username.trim(), fields.password)
        : await api.register({
            name: fields.name.trim(),
            email: fields.email.trim(),
            username: fields.username.trim(),
            password: fields.password,
          })
      store.setUser(user)
      window.location.hash = next ? `#/${next}` : user.role === 'admin' ? '#/admin' : '#/'
    } catch (err) {
      const field = err instanceof ApiError ? (err.field as keyof Fields | undefined) : undefined
      setErrors(field && field in empty ? { [field]: err instanceof Error ? err.message : '' } : { form: (err as Error).message })
      setBusy(false)
    }
  }

  const field = (key: keyof Fields, label: string, props: Record<string, unknown> = {}) => (
    <label className={`field${errors[key] ? ' invalid' : ''}`}>
      <span>{label}</span>
      <input
        value={fields[key]}
        onChange={set(key)}
        onBlur={blur(key)}
        aria-invalid={!!errors[key]}
        {...props}
      />
      {errors[key] && <small className="field-error">{errors[key]}</small>}
    </label>
  )

  const pw = strength(fields.password)
  const collage = store.artists.filter((a) => a.imageUrl).slice(0, 4)

  return (
    <section className="auth">
      <div className="auth-art">
        <div className="auth-collage" aria-hidden>
          {collage.map((a) => <ArtistImage key={a.name} name={a.name} src={a.imageUrl} />)}
        </div>
        <div className="auth-art-copy">
          <h2>{isLogin ? 'Welcome back.' : 'Your front row starts here.'}</h2>
          <ul className="perks">
            <li>Choose your exact seat on a live arena map</li>
            <li>Book instantly – no queues or waiting rooms</li>
            <li>All your tickets in one place</li>
          </ul>
        </div>
      </div>

      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="tabs" role="tablist">
            <a role="tab" aria-selected={isLogin} className={isLogin ? 'active' : ''} href={authHref('login', next)}>Log in</a>
            <a role="tab" aria-selected={!isLogin} className={!isLogin ? 'active' : ''} href={authHref('register', next)}>Create account</a>
          </div>

          <div>
            <h1>{isLogin ? 'Log in to QuickSeat' : 'Create your account'}</h1>
            <p className="muted small">
              {isLogin ? 'Use your username or email address.' : 'It takes 30 seconds, and your seat picks are kept.'}
            </p>
          </div>

          {!isLogin && field('name', 'Full name', { autoComplete: 'name', placeholder: 'Alex Chen' })}
          {!isLogin && field('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'alex@example.com' })}
          {field('username', isLogin ? 'Username or email' : 'Username', {
            autoComplete: 'username',
            placeholder: isLogin ? 'customer' : 'alexchen',
            autoCapitalize: 'none',
          })}

          <label className={`field${errors.password ? ' invalid' : ''}`}>
            <span>Password</span>
            <div className="pw">
              <input
                type={showPassword ? 'text' : 'password'}
                value={fields.password}
                onChange={set('password')}
                onBlur={blur('password')}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                aria-invalid={!!errors.password}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <small className="field-error">{errors.password}</small>}
            {!isLogin && fields.password && (
              <div className={`strength s${pw.score}`}>
                <div><span /><span /><span /><span /></div>
                <small>{pw.label}</small>
              </div>
            )}
          </label>

          {!isLogin && field('confirm', 'Confirm password', { type: showPassword ? 'text' : 'password', autoComplete: 'new-password' })}

          {errors.form && <p className="form-error">{errors.form}</p>}

          <button type="submit" className="btn primary wide lg" disabled={busy}>
            {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
          </button>

          <p className="small muted center">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <a href={authHref(isLogin ? 'register' : 'login', next)}>{isLogin ? 'Sign up' : 'Log in'}</a>
          </p>

          {isLogin && (
            <div className="demo">
              <span className="tiny muted">Demo accounts</span>
              <button type="button" className="chip" onClick={() => setFields({ ...empty, username: 'customer', password: 'customer123' })}>
                customer / customer123
              </button>
              <button type="button" className="chip" onClick={() => setFields({ ...empty, username: 'admin', password: 'admin123' })}>
                admin / admin123
              </button>
            </div>
          )}
        </form>
      </div>
    </section>
  )
}
