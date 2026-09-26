import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import PageLoader from '../../components/PageLoader.jsx'
import { adminPath } from '../../config.js'
import { useAuth } from '../auth/authContext.js'
import { Alert } from '../components/ui.jsx'

export default function LoginPage() {
  const { status, signIn } = useAuth()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(username, password)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (status === 'checking') return <PageLoader />
  if (status === 'signed-in') {
    return <Navigate to={location.state?.from ?? adminPath('dashboard')} replace />
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-head">
          <img src="/iiits-logo.jpg" alt="IIIT Sri City logo" className="login-logo" width="435" height="459" />
          <h1 className="login-title">IIITS Sports</h1>
          <p className="muted">Sign in to the admin dashboard</p>
        </div>

        {error && <Alert>{error}</Alert>}

        <label className="field">
          <span className="field-label">Username</span>
          <input
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
          />
        </label>

        <div className="field">
          <label className="field-label" htmlFor="admin-password">
            Password
          </label>
          <div className="password-input">
            <input
              id="admin-password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
