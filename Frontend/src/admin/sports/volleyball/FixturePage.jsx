import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { volleyballApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import Toast from '../../../components/Toast.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { configOf, fixtureResultText } from '../../../sports/volleyball/format.js'
import VolleyballConsole from '../../../sports/volleyball/VolleyballConsole.jsx'
import { formatDateTime } from '../../../utils/dates.js'
import { Breadcrumbs, LoadError, StatusBadge } from '../../components/ui.jsx'
import { useVolleyball } from './volleyballContext.js'
import FixtureDecision from './FixtureDecision.jsx'

// One volleyball fixture for the admin. Like every other sport, the admin only creates, edits and deletes
// the fixture and sets the final decision. The match itself (rules, lineups and scoring) is run
// by the assigned referee from the co-ordinator area, so this page is a read-only view of it.
export default function FixturePage() {
  const { fixtureId } = useParams()
  const { basePath, breadcrumbs, houseName } = useVolleyball()
  const navigate = useNavigate()
  const { data, setData, error, retry } = useResource(fixtureId, () => volleyballApi.fixture(fixtureId))
  const [toast, setToast] = useState('')

  if (!data) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const { fixture } = data
  const names = { team1: houseName(fixture.team1), team2: houseName(fixture.team2) }
  const config = configOf(fixture)

  async function deleteFixture() {
    if (!window.confirm(`Delete ${names.team1} vs ${names.team2} with all its events? This cannot be undone.`)) return
    try {
      await volleyballApi.deleteFixture(fixture._id)
      navigate(basePath)
    } catch (err) {
      setToast(err.message)
    }
  }

  return (
    <>
      <Breadcrumbs items={breadcrumbs({ label: `${names.team1} vs ${names.team2}` })} />

      <section className="panel vb-admin-head">
        <div className="vb-admin-title">
          <h1>
            {names.team1} <span className="muted">vs</span> {names.team2}
          </h1>
          <div className="page-actions">
            <Link to={`${basePath}/fixtures/${fixture._id}/edit`} className="btn btn-ghost btn-sm">
              Edit fixture
            </Link>
            <button type="button" className="btn btn-danger btn-sm" onClick={deleteFixture}>
              Delete
            </button>
          </div>
        </div>
        <div className="vb-admin-meta">
          <StatusBadge status={fixture.status} />
          {fixture.result_type === 'abandoned' && <StatusBadge status="abandoned" />}
          <span>{fixtureResultText(fixture, names.team1, names.team2)}</span>
          {fixture.scheduled_at && <span>{formatDateTime(fixture.scheduled_at)}</span>}
          <span>
            Best of 3 sets · {config.points_to_win} to win · {config.point_cap} cap
          </span>
          <span>
            {fixture.referees.length > 0
              ? `Referee: ${fixture.referees.map((referee) => referee.name).join(', ')}`
              : 'No referee yet'}
          </span>
        </div>
      </section>

      {fixture.status === 'scheduled' && !fixture.lineup_locked_at ? (
        <section className="panel">
          <p className="field-hint">
            The referee sets the rules and both lineups, then scores the match live. The score, court and
            full substitution log will appear here once the match starts.
          </p>
        </section>
      ) : (
        <div className="vb-admin-panel">
          <VolleyballConsole detail={data} names={names} readOnly />
        </div>
      )}

      <div className="dash-section">
        <FixtureDecision
          key={`${fixture.result_type}-${fixture.updated_at}`}
          fixture={fixture}
          team1={names.team1}
          team2={names.team2}
          onSaved={setData}
          onError={setToast}
        />
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}
