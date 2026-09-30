import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { cricketApi } from '../../../api/endpoints.js'
import Alert from '../../../components/Alert.jsx'
import PageLoader from '../../../components/PageLoader.jsx'
import { adminPath } from '../../../config.js'
import { useResource } from '../../../hooks/useResource.js'
import { toDateTimeInput } from '../../../utils/dates.js'
import RefereePicker from '../../components/RefereePicker.jsx'
import { Breadcrumbs, EmptyState, LoadError, PageHeader } from '../../components/ui.jsx'
import { useCricket } from './cricketContext.js'

// The admin declares a fixture: the two houses, when it is played and who referees it.
// The referee sets the overs, powerplay, squads and toss at the ground.
export default function FixtureFormPage() {
  const { fixtureId } = useParams()
  return <FixtureFormLoader key={fixtureId ?? 'new'} fixtureId={fixtureId} />
}

function FixtureFormLoader({ fixtureId }) {
  const { data, error, retry } = useResource(fixtureId ?? 'new', () =>
    fixtureId ? cricketApi.fixture(fixtureId) : Promise.resolve({ fixture: null }),
  )
  if (!data) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />
  return <FixtureForm fixture={data.fixture} />
}

function FixtureForm({ fixture }) {
  const { tournament, basePath, breadcrumbs, houseName } = useCricket()
  const navigate = useNavigate()
  const isEditing = Boolean(fixture)

  const [team1, setTeam1] = useState(fixture?.team1 ?? '')
  const [team2, setTeam2] = useState(fixture?.team2 ?? '')
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeInput(fixture?.scheduled_at))
  const [referees, setReferees] = useState(fixture?.referees ?? [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const teamsLocked = isEditing && fixture.status !== 'scheduled'
  const cancelPath = isEditing ? `${basePath}/fixtures/${fixture._id}` : basePath

  async function handleSubmit(event) {
    event.preventDefault()
    if (team1 === team2) {
      setError('Pick two different houses')
      return
    }
    setError('')
    setSaving(true)

    const data = {
      referees: referees.map((referee) => referee._id),
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    }
    if (!teamsLocked) Object.assign(data, { team1, team2 })

    try {
      const { fixture: saved } = isEditing
        ? await cricketApi.updateFixture(fixture._id, data)
        : await cricketApi.createFixture(tournament._id, data)
      navigate(`${basePath}/fixtures/${saved._id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (!isEditing && tournament.houses.length < 2) {
    return (
      <>
        <Breadcrumbs items={breadcrumbs({ label: 'Add fixture' })} />
        <EmptyState
          title="Add houses first"
          text="A fixture is played between two houses of this tournament."
          action={
            <Link to={adminPath(`tournaments/${tournament._id}/edit`)} className="btn btn-primary">
              Edit tournament
            </Link>
          }
        />
      </>
    )
  }

  return (
    <>
      <Breadcrumbs items={breadcrumbs({ label: isEditing ? 'Edit fixture' : 'Add fixture' })} />
      <PageHeader
        title={isEditing ? `Edit ${houseName(fixture.team1)} vs ${houseName(fixture.team2)}` : 'Add fixture'}
        description="Pick the two houses, when they play and the referees. The referee sets the overs, squads and toss."
      />

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <div className="form-row">
          <HouseSelect label="Team 1" value={team1} other={team2} onChange={setTeam1} disabled={teamsLocked} />
          <HouseSelect label="Team 2" value={team2} other={team1} onChange={setTeam2} disabled={teamsLocked} />
        </div>
        {teamsLocked && <p className="field-hint">The houses cannot change after the fixture has started.</p>}

        <label className="field">
          <span className="field-label">
            Date and time <span className="optional">optional</span>
          </span>
          <input
            className="input"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
          <span className="field-hint">Only used to announce the fixture. It can be left empty or changed any time.</span>
        </label>

        <div className="field">
          <span className="field-label">Referees</span>
          <RefereePicker referees={referees} onChange={setReferees} />
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="form-actions">
          <Link to={cancelPath} className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create fixture'}
          </button>
        </div>
      </form>
    </>
  )
}

function HouseSelect({ label, value, other, onChange, disabled }) {
  const { tournament } = useCricket()
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required
      >
        <option value="" disabled>
          Choose a house
        </option>
        {tournament.houses.map((house) => (
          <option key={house._id} value={house._id} disabled={house._id === other}>
            {house.house_name}
          </option>
        ))}
      </select>
    </label>
  )
}
