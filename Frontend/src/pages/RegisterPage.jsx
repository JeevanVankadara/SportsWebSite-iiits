import { useState } from 'react'
import { Link } from 'react-router'
import { playersApi } from '../api/endpoints.js'
import Alert from '../components/Alert.jsx'
import PasswordInput from '../components/PasswordInput.jsx'

const MIN_PASSWORD_LENGTH = 8
const EMPTY_FORM = { name: '', email: '', roll_number: '', username: '', password: '', confirm: '' }

// Player sign-up. Referees pick players for matches by the username chosen here.
export default function RegisterPage() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(null)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.password !== form.confirm) {
      setError('The two passwords do not match')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const { name, email, roll_number, username, password } = form
      const { player } = await playersApi.register({ name, email, roll_number, username, password })
      setRegistered(player)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (registered) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-head">
            <img src="/iiits-logo.jpg" alt="IIIT Sri City logo" className="auth-logo" width="435" height="459" />
            <h1 className="auth-title">You're registered</h1>
            <p className="muted">
              Your username is <strong>@{registered.username}</strong>. Give it to the referee when you play.
            </p>
          </div>
          <Link to="/" className="btn btn-primary btn-block">
            Go to home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Link to="/" className="btn btn-ghost btn-sm" style={{ padding: '0 8px', fontSize: '0.8125rem' }}>
            ← Back to Home
          </Link>
        </div>

        <div className="auth-head">
          <img src="/iiits-logo.jpg" alt="IIIT Sri City logo" className="auth-logo" width="435" height="459" />
          <h1 className="auth-title">Player sign-up</h1>
          <p className="muted">Register once to play in IIITS tournaments</p>
        </div>

        {error && <Alert>{error}</Alert>}

        <label className="field">
          <span className="field-label">Full name</span>
          <input
            className="input"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            autoComplete="name"
            maxLength={80}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">College email</span>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            autoComplete="email"
            maxLength={120}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">Roll number</span>
          <input
            className="input"
            value={form.roll_number}
            onChange={(event) => update('roll_number', event.target.value)}
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={30}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">Username</span>
          <input
            className="input"
            value={form.username}
            onChange={(event) => update('username', event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            pattern="[A-Za-z0-9._]{3,30}"
            title="3 to 30 characters: letters, numbers, dots or underscores"
            required
          />
          <span className="field-hint">3 to 30 characters: letters, numbers, dots or underscores.</span>
        </label>

        <div className="field">
          <label className="field-label" htmlFor="player-password">
            Password
          </label>
          <PasswordInput
            id="player-password"
            value={form.password}
            onChange={(value) => update('password', value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
          />
          <span className="field-hint">At least {MIN_PASSWORD_LENGTH} characters.</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="player-password-confirm">
            Confirm password
          </label>
          <PasswordInput
            id="player-password-confirm"
            value={form.confirm}
            onChange={(value) => update('confirm', value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Registering…' : 'Register'}
        </button>
      </form>
    </main>
  )
}
