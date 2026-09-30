import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Trophy, Users, Zap } from 'lucide-react'
import { playersApi } from '../api/endpoints.js'
import './register.css'
import { instituteLogo, useAppearance } from '../hooks/useAppearance.js'
import ThemeToggle from '../viewer/ThemeToggle.jsx'

const MIN_PASSWORD_LENGTH = 8
const EMPTY_FORM = { name: '', email: '', roll_number: '', username: '', password: '', confirm: '' }

function strength(password) {
  let score = 0
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1
  return score
}
const STRENGTH_LABEL = ['Too short', 'Weak', 'Okay', 'Good', 'Strong']

function Field({ label, hint, children, htmlFor }) {
  return <div className="reg-field">
    <label className="reg-label" htmlFor={htmlFor}>{label}</label>
    {children}
    {hint && <p className="reg-hint">{hint}</p>}
  </div>
}

function Secret({ id, value, onChange, autoComplete, invalid }) {
  const [shown, setShown] = useState(false)
  return <div className="reg-secret">
    <input id={id} className="reg-input" type={shown ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)} autoComplete={autoComplete} minLength={MIN_PASSWORD_LENGTH} aria-invalid={invalid || undefined} required />
    <button type="button" onClick={() => setShown(current => !current)} aria-label={shown ? 'Hide password' : 'Show password'}>{shown ? <EyeOff size={18} /> : <Eye size={18} />}</button>
  </div>
}

// Player sign-up. Referees pick players for matches by the username chosen here.
export default function RegisterPage() {
  const { theme, changeTheme } = useAppearance()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(null)
  const update = (field, value) => setForm(current => ({ ...current, [field]: value }))
  const score = strength(form.password)
  const mismatch = form.confirm.length > 0 && form.confirm !== form.password

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.password !== form.confirm) { setError('The two passwords do not match'); return }
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
      {registered ? <div className="reg-done">
        <span className="reg-done-icon"><Check size={28} /></span>
        <h1>You're registered</h1>
        <p>Your username is <strong>@{registered.username}</strong>. Give it to the referee when you play.</p>
        <Link to="/" className="reg-submit">Go to home <ArrowRight size={18} /></Link>
      </div> : <form className="reg-form" onSubmit={handleSubmit}>
        <header>
          <h1>Create your player account</h1>
          <p>Register once to play in IIITS tournaments.</p>
        </header>
        {error && <div className="reg-error" role="alert">{error}</div>}
        <div className="reg-row">
          <Field label="Full name" htmlFor="reg-name"><input id="reg-name" className="reg-input" value={form.name} onChange={event => update('name', event.target.value)} autoComplete="name" maxLength={80} required /></Field>
          <Field label="Roll number" htmlFor="reg-roll"><input id="reg-roll" className="reg-input" value={form.roll_number} onChange={event => update('roll_number', event.target.value)} autoCapitalize="characters" spellCheck={false} maxLength={30} required /></Field>
        </div>
        <Field label="College email" htmlFor="reg-email"><input id="reg-email" className="reg-input" type="email" value={form.email} onChange={event => update('email', event.target.value)} autoComplete="email" maxLength={120} required /></Field>
        <Field label="Username" htmlFor="reg-username" hint="3 to 30 characters: letters, numbers, dots or underscores.">
          <div className="reg-prefix"><span>@</span><input id="reg-username" className="reg-input" value={form.username} onChange={event => update('username', event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} pattern="[A-Za-z0-9._]{3,30}" title="3 to 30 characters: letters, numbers, dots or underscores" required /></div>
        </Field>
        <div className="reg-row">
          <Field label="Password" htmlFor="reg-password"><Secret id="reg-password" value={form.password} onChange={value => update('password', value)} autoComplete="new-password" /></Field>
          <Field label="Confirm password" htmlFor="reg-confirm"><Secret id="reg-confirm" value={form.confirm} onChange={value => update('confirm', value)} autoComplete="new-password" invalid={mismatch} /></Field>
        </div>
        <div className="reg-meter" data-score={form.password ? score : undefined} aria-live="polite">
          <span /><span /><span /><span />
          <small>{mismatch ? 'Passwords do not match' : form.password ? STRENGTH_LABEL[score] : `At least ${MIN_PASSWORD_LENGTH} characters`}</small>
        </div>
        <button type="submit" className="reg-submit" disabled={submitting}>{submitting ? 'Registering…' : <>Register <ArrowRight size={18} /></>}</button>
      </form>}
    </section>
  </main>
}
