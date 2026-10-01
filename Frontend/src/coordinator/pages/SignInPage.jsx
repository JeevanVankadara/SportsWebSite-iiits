import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../../auth/authContext.js'
import GoogleButton, { COLLEGE_DOMAIN } from '../../components/GoogleButton.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import { coordinatorPath } from '../../config.js'
import { Eyebrow } from '../components/ui.jsx'

export default function SignInPage() {
  const { status, signIn } = useAuth()
  const location = useLocation()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCredential(credential) {
    setError('')
    setSubmitting(true)
    try {
      await signIn(credential)
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

      <div className="co-panel co-signin-card">
        <h2 className="co-display co-display-md">Sign in</h2>
        <p className="co-muted">Use the college Google account (@{COLLEGE_DOMAIN}) you registered with.</p>

        {error && (
          <p className="co-alert" role="alert">
            {error}
          </p>
        )}

        {submitting ? (
          <p className="co-muted" role="status">
            Signing in…
          </p>
        ) : (
          <GoogleButton onCredential={handleCredential} theme="filled_black" className="co-muted" />
        )}

        <p className="co-muted co-small">
          Not registered yet? <Link to="/register">Create a player account</Link>
        </p>
      </div>
    </main>
  )
}
