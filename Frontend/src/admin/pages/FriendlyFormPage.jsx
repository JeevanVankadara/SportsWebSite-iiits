import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { friendliesApi, gamesApi } from '../../api/endpoints.js'
import Alert from '../../components/Alert.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import { adminPath } from '../../config.js'
import { useResource } from '../../hooks/useResource.js'
import RefereePicker from '../components/RefereePicker.jsx'
import { Breadcrumbs, LoadError, PageHeader } from '../components/ui.jsx'

const TEAM_NAME_MAX = 60

// Super admin: a friendly match between any two teams, outside every tournament. Once made it opens
// on the sport's own fixture page, where it is edited, decided or deleted like any other fixture.
export default function FriendlyFormPage() {
  const { data: games, error, retry } = useResource('games', () => gamesApi.list().then((data) => data.games))
  if (!games) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />
  return <FriendlyForm games={games} />
}

function FriendlyForm({ games }) {
  const navigate = useNavigate()
  const [game, setGame] = useState('')
  const [team1, setTeam1] = useState('')
  const [team2, setTeam2] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [referees, setReferees] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (team1.trim().toLowerCase() === team2.trim().toLowerCase()) {
      setError('The two teams need different names')
      return
    }
    setError('')
    setSaving(true)
    try {
      const { fixture } = await friendliesApi.create({
        game,
        team1_name: team1,
        team2_name: team2,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        referees: referees.map((referee) => referee._id),
      })
      navigate(adminPath(`tournaments/${fixture.tournament}/sports/${game}/fixtures/${fixture._id}`))
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const teamField = (label, value, onChange) => (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={TEAM_NAME_MAX}
        placeholder="Any name, e.g. Faculty XI"
        required
      />
    </label>
  )

  return (
    <>
      <Breadcrumbs items={[{ label: 'Friendly matches', to: adminPath('friendlies') }, { label: 'Add friendly match' }]} />
      <PageHeader
        title="Add friendly match"
        description="A single match outside every tournament. Name the two teams any way you like, pick when they play and the referees. The referee sets up and scores the match as usual."
      />

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Sport</span>
          <select className="input" value={game} onChange={(event) => setGame(event.target.value)} required>
            <option value="" disabled>
              Choose a sport
            </option>
            {games.map((item) => (
              <option key={item._id} value={item._id}>
                {item.game_name}
              </option>
            ))}
          </select>
        </label>

        <div className="form-row">
          {teamField('Team 1', team1, setTeam1)}
          {teamField('Team 2', team2, setTeam2)}
        </div>

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
        </label>

        <div className="field">
          <span className="field-label">Referees</span>
          <RefereePicker referees={referees} onChange={setReferees} />
          <span className="field-hint">
            Referees sign in with their Google account, so they must be registered. Players who are not registered can
            be added by name by the referee when picking the teams.
          </span>
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="form-actions">
          <Link to={adminPath('friendlies')} className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Create friendly match'}
          </button>
        </div>
      </form>
    </>
  )
}
