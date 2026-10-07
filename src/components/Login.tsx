import { useState, type FormEvent } from 'react'
import type { User } from '../types'

interface Props {
  users: User[]
  onLogin: (user: User) => void
  onRegister: (user: User) => void
}

export default function Login({ users, onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const name = username.trim()
    if (mode === 'login') {
      const user = users.find((u) => u.username === name && u.password === password)
      if (!user) return setError('Invalid username or password.')
      onLogin(user)
    } else {
      if (users.some((u) => u.username === name)) return setError('That username is taken.')
      onRegister({ username: name, password, role: 'customer' })
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  return (
    <section className="login">
      <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
      <form className="card" onSubmit={handleSubmit}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">{mode === 'login' ? 'Log in' : 'Sign up'}</button>
        <button type="button" className="link" onClick={switchMode}>
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
        </button>
      </form>
      <p className="muted small">
        Demo accounts: <b>admin / admin123</b> (admin) · <b>customer / customer123</b> (customer)
      </p>
    </section>
  )
}
