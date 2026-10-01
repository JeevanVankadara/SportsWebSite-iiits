import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Check, Trophy, Users, Zap } from 'lucide-react'
import { playersApi } from '../api/endpoints.js'
import GoogleButton, { COLLEGE_DOMAIN } from '../components/GoogleButton.jsx'
import './register.css'
import { instituteLogo, useAppearance } from '../hooks/useAppearance.js'
import ThemeToggle from '../viewer/ThemeToggle.jsx'

// Same rule as the backend (models/Player.js): S + batch year (2023 to this year) + 7 digits.
const FIRST_BATCH_YEAR = 2023
const ROLL_EXAMPLE = 'S20230010250'

function rollNumberError(value) {
  const match = /^S(\d{4})\d{7}$/.exec(value)
  const year = Number(match?.[1])
  if (!match) return `Roll number is S, the batch year and 7 digits, e.g. ${ROLL_EXAMPLE}`
  if (year < FIRST_BATCH_YEAR || year > new Date().getFullYear()) {
    return `Batch year must be between ${FIRST_BATCH_YEAR} and ${new Date().getFullYear()}`
  }
  return ''
}

// Player sign-up with the college Google account: Google gives the name and email, the player types
// only their roll number. The username (first + last name) is picked by the server.
export default function RegisterPage() {
  const { theme, changeTheme } = useAppearance()
  // { credential, profile: { name, email } } once Google has answered and the account is new.
  const [pending, setPending] = useState(null)
  const [rollNumber, setRollNumber] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // { player, already } when done.
  const [done, setDone] = useState(null)

  const rollError = rollNumberError(rollNumber)

  async function handleCredential(credential) {
    setError('')
    setBusy(true)
    try {
      const { registered, player, profile } = await playersApi.checkGoogle(credential)
      if (registered) setDone({ player, already: true })
      else setPending({ credential, profile })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setTouched(true)
    if (rollError) return
    setError('')
    setBusy(true)
    try {
      const { player } = await playersApi.register({ credential: pending.credential, roll_number: rollNumber })
      setDone({ player, already: false })
    } catch (err) {
      setError(err.message)
      // Google's token lasts about an hour; after that the player has to pick the account again.
      if (err.status === 401) setPending(null)
    } finally {
      setBusy(false)
    }
  }

  function startOver() {
    setPending(null)
    setRollNumber('')
    setTouched(false)
    setError('')
  }

  return <main className="reg-page" data-theme={theme}>
    <aside className="reg-side">
      <div className="reg-brand"><img src="/iiits-logo-dark.png" alt="IIIT Sri City" className="reg-logo" width="56" height="60" /><strong>IIITS Sports</strong></div>
      <div>
        <h2>Play for your house.</h2>
        <p>One sign-up gets you into every IIITS tournament.</p>
        <ul>
          <li><Trophy size={18} /> Join cricket, football and badminton fixtures</li>
          <li><Users size={18} /> Get picked by referees using your username</li>
          <li><Zap size={18} /> Your matches and stats in one place</li>
        </ul>
      </div>
      <small>IIIT Sri City · Sports</small>
    </aside>
    <section className="reg-panel">
      <div className="reg-toolbar"><Link to="/" className="reg-back"><ArrowLeft size={16} /> Back to home</Link><ThemeToggle theme={theme} onChange={changeTheme} /></div>
      <img src={instituteLogo(theme)} alt="" className="reg-mobile-logo" width="52" height="56" />
      {done ? <div className="reg-done">
        <span className="reg-done-icon"><Check size={28} /></span>
        <h1>{done.already ? 'You are already registered' : 'You are registered'}</h1>
        <p>Your username is <strong>@{done.player.username}</strong>. Give it to the referee when you play.</p>
        <Link to="/" className="reg-submit">Go to home <ArrowRight size={18} /></Link>
      </div> : pending ? <form className="reg-form" onSubmit={handleSubmit} noValidate>
        <header>
          <h1>One last step</h1>
          <p>Add your roll number to finish your player account.</p>
        </header>
        {error && <div className="reg-error" role="alert">{error}</div>}
        <div className="reg-profile">
          <strong>{pending.profile.name}</strong>
          <span>{pending.profile.email}</span>
        </div>
        <div className="reg-field">
          <label className="reg-label" htmlFor="reg-roll">Roll number</label>
          <input id="reg-roll" className="reg-input" value={rollNumber} onChange={event => setRollNumber(event.target.value.toUpperCase().replace(/\s/g, ''))} onBlur={() => setTouched(true)} placeholder={ROLL_EXAMPLE} autoCapitalize="characters" spellCheck={false} maxLength={12} aria-invalid={(touched && Boolean(rollError)) || undefined} aria-describedby="reg-roll-hint" autoFocus required />
          <p className="reg-hint" id="reg-roll-hint">{touched && rollError ? rollError : `For example ${ROLL_EXAMPLE}. You cannot change it later.`}</p>
        </div>
        <button type="submit" className="reg-submit" disabled={busy}>{busy ? 'Registering…' : <>Register <ArrowRight size={18} /></>}</button>
        <button type="button" className="reg-link" onClick={startOver} disabled={busy}>Use a different Google account</button>
      </form> : <div className="reg-form">
        <header>
          <h1>Create your player account</h1>
          <p>Sign up with your college Google account (@{COLLEGE_DOMAIN}). Your name comes from Google.</p>
        </header>
        {error && <div className="reg-error" role="alert">{error}</div>}
        {busy ? <p className="reg-hint" role="status">Checking your account…</p> : <GoogleButton onCredential={handleCredential} text="signup_with" theme={theme === 'dark' ? 'filled_black' : 'outline'} className="reg-google" />}
        <p className="reg-hint">Referees sign in at <Link to="/coordinator">/coordinator</Link> with the same Google account.</p>
      </div>}
    </section>
  </main>
}
