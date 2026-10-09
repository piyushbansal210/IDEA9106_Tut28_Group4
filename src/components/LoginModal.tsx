import { useState, type FormEvent } from 'react'
import { useStore } from '../store'
import Modal from './Modal'

export const WELCOME = 'welcome'

function passwordScore(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(4, Math.max(pw ? 1 : 0, score))
}
const strengthLabel = ['', 'Weak', 'Okay', 'Good', 'Strong']

function LoginForm() {
  const { login } = useStore()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(login(identifier, password) ?? '')
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <label className="field">
        Username or email
        <input data-autofocus autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
      </label>
      <label className="field">
        Password
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block" type="submit" disabled={!identifier || !password}>Log in</button>
      <p className="tiny muted">Demo accounts: customer / customer123 · admin / admin123</p>
    </form>
  )
}

function SignupForm() {
  const { register } = useStore()
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '' })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')

  const errors = {
    name: form.name.trim().length < 2 ? 'Enter your name.' : '',
    email: !/^\S+@\S+\.\S+$/.test(form.email) ? 'Enter an email like name@example.com.' : '',
    username: !/^[a-zA-Z0-9_.]{3,20}$/.test(form.username) ? '3–20 letters, numbers, dots or underscores.' : '',
    password: form.password.length < 8 ? 'Use at least 8 characters.' : '',
  }
  const valid = Object.values(errors).every((e) => !e)
  const score = passwordScore(form.password)

  const field = (key: keyof typeof form, label: string, type = 'text', autoComplete?: string) => (
    <label className="field">
      {label}
      <input
        type={type}
        autoComplete={autoComplete}
        value={form[key]}
        aria-invalid={touched[key] && !!errors[key]}
        aria-describedby={`su-${key}-err`}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        onBlur={() => setTouched({ ...touched, [key]: true })}
        data-autofocus={key === 'name' ? true : undefined}
      />
      <span id={`su-${key}-err`} className="error-text">{touched[key] && errors[key]}</span>
    </label>
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, email: true, username: true, password: true })
    if (valid) setError(register(form) ?? '')
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      {field('name', 'Full name', 'text', 'name')}
      {field('email', 'Email', 'email', 'email')}
      {field('username', 'Username', 'text', 'username')}
      {field('password', 'Password', 'password', 'new-password')}
      {form.password && (
        <div className="stack-sm" style={{ marginTop: -8 }}>
          <div className="strength" data-score={score} aria-hidden="true"><span /><span /><span /><span /></div>
          <span className="tiny muted">Password strength: {strengthLabel[score]}</span>
        </div>
      )}
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block" type="submit">Create account</button>
    </form>
  )
}

export default function LoginModal() {
  const { loginRequest, closeLogin, openLogin, toast } = useStore()
  if (!loginRequest) return null
  const soft = loginRequest.reason === WELCOME
  const tab = loginRequest.tab

  return (
    <Modal title={soft ? 'Welcome to QuickSeat' : tab === 'login' ? 'Log in' : 'Create your account'} onClose={closeLogin}>
      <div className="stack" style={{ marginTop: 12 }}>
        <p className="muted">
          {soft ? 'Log in to set your ticket plan and get queue alerts.' : loginRequest.reason ?? 'Log in to save plans, join queues and see your tickets.'}
        </p>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'login'} onClick={() => openLogin('login', loginRequest.reason)}>Log in</button>
          <button role="tab" aria-selected={tab === 'signup'} onClick={() => openLogin('signup', loginRequest.reason)}>Sign up</button>
        </div>
        {tab === 'login' ? <LoginForm /> : <SignupForm />}
        <div className="divider">or</div>
        <button className="btn btn-secondary btn-block" onClick={() => toast('Spotify login is coming soon.')}>Continue with Spotify</button>
        {soft && (
          <button className="btn btn-ghost btn-block" onClick={closeLogin}>Just browsing</button>
        )}
      </div>
    </Modal>
  )
}
