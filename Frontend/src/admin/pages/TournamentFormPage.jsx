import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { gamesApi, tournamentsApi } from '../../api/endpoints.js'
import PageLoader from '../../components/PageLoader.jsx'
import { adminPath } from '../../config.js'
import { CheckIcon } from '../components/icons.jsx'
import QuickAdd from '../components/QuickAdd.jsx'
import { Alert, LoadError, PageHeader } from '../components/ui.jsx'
import { toDateInput } from '../utils.js'

// A new tournament starts as ongoing; the status can only be changed when editing.
const STATUS_OPTIONS = [
  { value: 'live', label: 'Ongoing', hint: 'Shown on the dashboard under ongoing tournaments.' },
  { value: 'completed', label: 'Past', hint: 'Finished. Shown on the dashboard under past tournaments.' },
]

const MAX_HOUSES = 30

const EMPTY_FORM = { tournament_name: '', status: 'live', start_date: '', end_date: '', games: [], houses: [] }

function toForm(tournament) {
  return {
    tournament_name: tournament.tournament_name,
    status: tournament.status,
    start_date: toDateInput(tournament.start_date),
    end_date: toDateInput(tournament.end_date),
    games: tournament.games.map((game) => game._id),
    houses: tournament.houses.map(({ _id, house_name }) => ({ _id, house_name })),
  }
}

// Keyed by id so React starts a fresh form when switching between adding and editing.
export default function TournamentFormPage() {
  const { id } = useParams()
  return <TournamentForm key={id ?? 'new'} tournamentId={id} />
}

function TournamentForm({ tournamentId }) {
  const navigate = useNavigate()
  const isEditing = Boolean(tournamentId)
  const [sports, setSports] = useState(null) // the predefined sports to choose from
  const [form, setForm] = useState(EMPTY_FORM)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let ignore = false
    Promise.all([gamesApi.list(), tournamentId && tournamentsApi.get(tournamentId)]).then(
      ([{ games }, existing]) => {
        if (ignore) return
        if (existing) setForm(toForm(existing.tournament))
        setSports(games)
      },
      (err) => {
        if (!ignore) setLoadError(err.message)
      },
    )
    return () => {
      ignore = true
    }
  }, [tournamentId, attempt])

  function retry() {
    setLoadError('')
    setAttempt((count) => count + 1)
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function toggleSport(id) {
    setForm((current) => ({
      ...current,
      games: current.games.includes(id) ? current.games.filter((gameId) => gameId !== id) : [...current.games, id],
    }))
  }

  // Throwing shows the message under the "Add house" field.
  function addHouse(name) {
    if (form.houses.some((house) => house.house_name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`${name} is already added`)
    }
    if (form.houses.length >= MAX_HOUSES) throw new Error(`A tournament can have at most ${MAX_HOUSES} houses`)
    update('houses', [...form.houses, { house_name: name }])
  }

  function removeHouse(name) {
    update(
      'houses',
      form.houses.filter((house) => house.house_name !== name),
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaveError('')
    setSaving(true)
    try {
      const { tournament } = isEditing
        ? await tournamentsApi.update(tournamentId, form)
        : await tournamentsApi.create(form)
      navigate(adminPath(`tournaments/${tournament._id}`))
    } catch (err) {
      setSaveError(err.message)
      setSaving(false)
    }
  }

  if (!sports) return loadError ? <LoadError message={loadError} onRetry={retry} /> : <PageLoader />

  const statusHint = STATUS_OPTIONS.find((option) => option.value === form.status)?.hint

  return (
    <>
      <PageHeader
        title={isEditing ? 'Edit tournament' : 'Add tournament'}
        description={
          isEditing
            ? 'Update the details, sports and houses.'
            : 'Pick the sports and add the houses taking part. You can change them later.'
        }
      />

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Tournament name</span>
          <input
            className="input"
            value={form.tournament_name}
            onChange={(event) => update('tournament_name', event.target.value)}
            placeholder="e.g. Inter-UG Sports Meet 2026"
            maxLength={100}
            required
          />
        </label>

        <div className="form-row">
          <label className="field">
            <span className="field-label">
              Start date <span className="optional">optional</span>
            </span>
            <input
              className="input"
              type="date"
              value={form.start_date}
              onChange={(event) => update('start_date', event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">
              End date <span className="optional">optional</span>
            </span>
            <input
              className="input"
              type="date"
              value={form.end_date}
              min={form.start_date || undefined}
              onChange={(event) => update('end_date', event.target.value)}
            />
          </label>
        </div>

        {isEditing && (
          <fieldset className="field">
            <legend className="field-label">Status</legend>
            <div className="segmented">
              {STATUS_OPTIONS.map((option) => (
                <label key={option.value} className="segmented-option">
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={form.status === option.value}
                    onChange={() => update('status', option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <p className="field-hint">{statusHint}</p>
          </fieldset>
        )}

        <fieldset className="field">
          <legend className="field-label">Sports</legend>
          <div className="check-grid">
            {sports.map((sport) => {
              const checked = form.games.includes(sport._id)
              return (
                <label key={sport._id} className="check-card">
                  <input type="checkbox" checked={checked} onChange={() => toggleSport(sport._id)} />
                  <span className="check-box" aria-hidden="true">
                    {checked && <CheckIcon size={14} />}
                  </span>
                  <span className="check-label">{sport.game_name}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field-label">Houses</legend>
          {form.houses.length > 0 ? (
            <ul className="house-list">
              {form.houses.map((house) => (
                <li key={house._id ?? house.house_name} className="house-chip">
                  <span>{house.house_name}</span>
                  <button
                    type="button"
                    className="house-remove"
                    onClick={() => removeHouse(house.house_name)}
                    aria-label={`Remove ${house.house_name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-hint">No houses yet. Houses added here belong to this tournament only.</p>
          )}
          <QuickAdd label="House name" placeholder="House name, e.g. Red House" buttonLabel="Add house" onAdd={addHouse} />
        </fieldset>

        {saveError && <Alert>{saveError}</Alert>}

        <div className="form-actions">
          <Link to={isEditing ? adminPath(`tournaments/${tournamentId}`) : adminPath('dashboard')} className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create tournament'}
          </button>
        </div>
      </form>
    </>
  )
}
