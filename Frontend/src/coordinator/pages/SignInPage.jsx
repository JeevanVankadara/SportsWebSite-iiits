import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../../auth/authContext.js'
import PageLoader from '../../components/PageLoader.jsx'
import PasswordInput from '../../components/PasswordInput.jsx'
import { coordinatorPath } from '../../config.js'
import { Eyebrow } from '../components/ui.jsx'

export default function SignInPage() {
  const { status, signIn } = useAuth()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
  if (status === 'signed-in') return <Navigate to={location.state?.from ?? coordinatorPath('games')} replace />

  return (
    <main className="co-signin">
      <section className="co-signin-intro">
        <img src="/iiits-logo.jpg" alt="IIIT Sri City logo" className="co-signin-logo" width="435" height="459" />
        <Eyebrow>§ Co-ordinator access</Eyebrow>
        <h1 className="co-display co-display-xl">
          Run the <span className="co-accent">game.</span>
        </h1>
        <p className="co-lead">
          Set the match order, take the slips and keep the score for the fixtures you referee.
        </p>
      </section>

      <form className="co-panel co-signin-card" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Link to="/" className="co-btn co-btn-ghost co-btn-sm" style={{ padding: '0 10px' }}>
            ← Back to Live Scores
          </Link>
        </div>
        <h2 className="co-display co-display-md">Sign in</h2>
        <p className="co-muted">Use your player username and password.</p>

        {error && (
          <p className="co-alert" role="alert">
            {error}
          </p>
        )}

        <label className="co-field">
          <span className="co-label">Username</span>
          <input
            className="co-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
          />
        </label>

        <div className="co-field">
          <label className="co-label" htmlFor="coordinator-password">
            Password
          </label>
          <PasswordInput
            id="coordinator-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="co-btn co-btn-primary co-btn-block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="co-muted co-small">
          Not registered yet? <Link to="/register">Create a player account</Link>
        </p>
      </form>
    </main>
  )
}
