import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { kabaddiApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import Toast from '../../../components/Toast.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { configOf, fixtureResultText } from '../../../sports/kabaddi/format.js'
import MatchConsole from '../../../sports/kabaddi/MatchConsole.jsx'
import { formatDateTime } from '../../../utils/dates.js'
import { Breadcrumbs, LoadError, StatusBadge } from '../../components/ui.jsx'
import { useKabaddi } from './kabaddiContext.js'
import FixtureDecision from './FixtureDecision.jsx'

// One kabaddi fixture for the admin. Like every other sport, the admin only creates, edits and deletes
// the fixture and sets the final decision. The match itself (rules, lineups, clock and scoring) is run
// by the assigned referee from the co-ordinator area, so this page is a read-only view of it.
export default function FixturePage() {
  const { fixtureId } = useParams()
  const { basePath, breadcrumbs, houseName } = useKabaddi()
  const navigate = useNavigate()
  const { data, setData, error, retry } = useResource(fixtureId, () => kabaddiApi.fixture(fixtureId))
  const [toast, setToast] = useState('')

  if (!data) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const { fixture } = data
  const names = { team1: houseName(fixture.team1), team2: houseName(fixture.team2) }
  const config = configOf(fixture)

  async function deleteFixture() {
    if (!window.confirm(`Delete ${names.team1} vs ${names.team2} with all its events? This cannot be undone.`)) return
    try {
      await kabaddiApi.deleteFixture(fixture._id)
      navigate(basePath)
    } catch (err) {
      setToast(err.message)
    }
  }

  return (
    <>
      <Breadcrumbs items={breadcrumbs({ label: `${names.team1} vs ${names.team2}` })} />

      <section className="panel kb-admin-head">
        <div className="kb-admin-title">
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
        <div className="kb-admin-meta">
          <StatusBadge status={fixture.status} />
          {fixture.result_type === 'abandoned' && <StatusBadge status="abandoned" />}
          <span>{fixtureResultText(fixture, names.team1, names.team2)}</span>
          {fixture.scheduled_at && <span>{formatDateTime(fixture.scheduled_at)}</span>}
          <span>
            {config.players_on_court} a side · {config.half_duration_minutes} min halves
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
            full event log will appear here once the match starts.
          </p>
        </section>
      ) : (
        <div className="kb-admin-panel">
          <MatchConsole detail={data} names={names} readOnly />
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
