import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import Alert from '../../components/Alert.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import PasswordInput from '../../components/PasswordInput.jsx'
import { adminPath } from '../../config.js'
import { useAuth } from '../../auth/authContext.js'

export default function LoginPage() {
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
  if (status === 'signed-in') {
    return <Navigate to={location.state?.from ?? adminPath('dashboard')} replace />
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-head">
          <img src="/iiits-logo.jpg" alt="IIIT Sri City logo" className="auth-logo" width="435" height="459" />
          <h1 className="auth-title">IIITS Sports</h1>
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
          <PasswordInput
            id="admin-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
