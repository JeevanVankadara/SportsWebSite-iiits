import { useEffect, useState } from 'react'
import { adminsApi } from '../../api/endpoints.js'
import Alert from '../../components/Alert.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import PasswordInput from '../../components/PasswordInput.jsx'
import Toast from '../../components/Toast.jsx'
import { CheckIcon } from '../components/icons.jsx'
import { LoadError, PageHeader } from '../components/ui.jsx'
import { SPORTS, sportLabels } from '../permissions.js'

const MIN_PASSWORD_LENGTH = 8

function SportChecks({ value, onChange, disabled }) {
  function toggle(key) {
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key])
  }
  return (
    <div className="check-grid">
      {SPORTS.map((sport) => {
        const checked = value.includes(sport.key)
        return (
          <label key={sport.key} className="check-card">
            <input type="checkbox" checked={checked} onChange={() => toggle(sport.key)} disabled={disabled} />
            <span className="check-box" aria-hidden="true">
              {checked && <CheckIcon size={14} />}
            </span>
            <span className="check-label">{sport.label}</span>
          </label>
        )
      })}
    </div>
  )
}

function AddAdminForm({ onAdded }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [sports, setSports] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { admin } = await adminsApi.create({ username, password, sports })
      onAdded(admin)
      setUsername('')
      setPassword('')
      setSports([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="panel form-stack" onSubmit={handleSubmit}>
      <div>
        <h2 className="panel-title">Add an admin</h2>
        <p className="field-hint">
          Give them a username and password to sign in here. They can add and run matches only for the sports you tick.
        </p>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="form-row">
        <label className="field">
          <span className="field-label">Username</span>
          <input
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            pattern="[A-Za-z0-9._]{3,30}"
            title="3 to 30 characters: letters, numbers, dots or underscores"
            required
          />
        </label>
        <div className="field">
          <label className="field-label" htmlFor="new-admin-password">
            Password
          </label>
          <PasswordInput id="new-admin-password" value={password} onChange={setPassword} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} />
          <p className="field-hint">At least {MIN_PASSWORD_LENGTH} characters.</p>
        </div>
      </div>
      <fieldset className="field">
        <legend className="field-label">Sports they manage</legend>
        <SportChecks value={sports} onChange={setSports} disabled={saving} />
      </fieldset>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Adding…' : 'Add admin'}
        </button>
      </div>
    </form>
  )
}

function AdminRow({ admin, onSaved, onRemoved, onMessage }) {
  const [sports, setSports] = useState(admin.sports)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const changed = password !== '' || [...sports].sort().join() !== [...admin.sports].sort().join()

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const { admin: updated } = await adminsApi.update(admin._id, password ? { sports, password } : { sports })
      onSaved(updated)
      setPassword('')
      onMessage(`Saved @${updated.username}`)
    } catch (err) {
      onMessage(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Remove the admin @${admin.username}? They will be signed out at once.`)) return
    setBusy(true)
    try {
      await adminsApi.remove(admin._id)
      onRemoved(admin._id)
    } catch (err) {
      onMessage(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="panel form-stack" onSubmit={save}>
      <div>
        <h3 className="panel-title">@{admin.username}</h3>
        <p className="field-hint">
          {admin.sports.length ? `Manages ${sportLabels(admin.sports).join(', ')}` : 'No sports yet: they can only look around.'}
        </p>
      </div>
      <fieldset className="field">
        <legend className="field-label">Sports they manage</legend>
        <SportChecks value={sports} onChange={setSports} disabled={busy} />
      </fieldset>
      <div className="field">
        <label className="field-label" htmlFor={`password-${admin._id}`}>
          New password <span className="optional">optional</span>
        </label>
        <PasswordInput id={`password-${admin._id}`} value={password} onChange={setPassword} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required={false} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>
          Remove admin
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy || !changed}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

// Super admin only (see AdminApp.jsx): add admins and choose the sports each one manages.
export default function AdminsPage() {
  const [admins, setAdmins] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let ignore = false
    adminsApi.list().then(
      (data) => {
        if (!ignore) setAdmins(data.admins)
      },
      (err) => {
        if (!ignore) setLoadError(err.message)
      },
    )
    return () => {
      ignore = true
    }
  }, [attempt])

  if (!admins) {
    return loadError ? (
      <LoadError
        message={loadError}
        onRetry={() => {
          setLoadError('')
          setAttempt((count) => count + 1)
        }}
      />
    ) : (
      <PageLoader />
    )
  }

  const others = admins.filter((admin) => admin.role !== 'super_admin')

  return (
    <>
      <PageHeader
        title="Admins"
        description="Admins you add can open every tournament, but add and run matches only for their sports. Only you can manage tournaments and admins."
      />
      <div className="form-stack">
        <AddAdminForm onAdded={(admin) => setAdmins((list) => [...list, admin])} />
        <h2 className="section-title">
          Added admins <span className="count">{others.length}</span>
        </h2>
        {others.length === 0 && <p className="muted">No admins added yet.</p>}
        {others.map((admin) => (
          <AdminRow
            key={admin._id}
            admin={admin}
            onSaved={(updated) => setAdmins((list) => list.map((item) => (item._id === updated._id ? updated : item)))}
            onRemoved={(adminId) => setAdmins((list) => list.filter((item) => item._id !== adminId))}
            onMessage={setToast}
          />
        ))}
      </div>
      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}
