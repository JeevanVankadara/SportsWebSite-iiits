import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { badmintonApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import { CalendarIcon } from '../../components/icons.jsx'
import Toast from '../../../components/Toast.jsx'
import { Breadcrumbs, EmptyState, LoadError, StatusBadge } from '../../components/ui.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { formatDateTime } from '../../../utils/dates.js'
import { useBadminton } from './badmintonContext.js'
import FixtureDecision from './FixtureDecision.jsx'
import { fixtureResultText } from '../../../sports/badminton/format.js'
import MatchCard from './MatchCard.jsx'

export default function FixturePage() {
  const { fixtureId } = useParams()
  const { basePath, breadcrumbs, houseName } = useBadminton()
  const navigate = useNavigate()
  const { data: detail, setData, error, retry } = useResource(fixtureId, () => badmintonApi.fixture(fixtureId))
  const [editingMatchId, setEditingMatchId] = useState(null)
  const [toast, setToast] = useState('')

  if (!detail) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const { fixture, matches } = detail
  const team1 = houseName(fixture.team1)
  const team2 = houseName(fixture.team2)

  // Matches are played in order: only the first unfinished match can get a result,
  // and only the last finished one can be cleared.
  const firstOpen = matches.find((match) => match.status !== 'completed')
  const lastCompleted = matches.findLast((match) => match.status === 'completed')

  function handleSaved(newDetail) {
    setData(newDetail)
    setEditingMatchId(null)
  }

  async function clearResult(match) {
    if (!window.confirm(`Clear the result of match ${match.match_no}?`)) return
    try {
      handleSaved(await badmintonApi.clearResult(match._id))
    } catch (err) {
      setToast(err.message)
    }
  }

  async function deleteFixture() {
    if (!window.confirm(`Delete ${team1} vs ${team2} with all its matches and scores? This cannot be undone.`)) return
    try {
      await badmintonApi.deleteFixture(fixture._id)
      navigate(basePath)
    } catch (err) {
      setToast(err.message)
    }
  }

  return (
    <>
      <Breadcrumbs items={breadcrumbs({ label: `${team1} vs ${team2}` })} />

      <section className="panel scoreboard">
        <div className="scoreboard-meta">
          <StatusBadge status={fixture.status} />
          {fixture.result_type === 'abandoned' && <StatusBadge status="abandoned" />}
          {fixture.scheduled_at && (
            <span className="t-card-dates">
              <CalendarIcon size={15} />
              {formatDateTime(fixture.scheduled_at)}
            </span>
          )}
        </div>

        <div className="scoreboard-teams">
          <span className={`scoreboard-team${fixture.result === 'team1' ? ' is-winner' : ''}`}>{team1}</span>
          <span className="scoreboard-score" aria-label={`${fixture.team1_matches_won} to ${fixture.team2_matches_won}`}>
            {fixture.team1_matches_won} – {fixture.team2_matches_won}
          </span>
          <span className={`scoreboard-team${fixture.result === 'team2' ? ' is-winner' : ''}`}>{team2}</span>
        </div>
        <p className="scoreboard-result">{fixtureResultText(fixture, team1, team2)}</p>

        <p className="scoreboard-referees">
          {fixture.referees.length > 0
            ? `Referee${fixture.referees.length > 1 ? 's' : ''}: ${fixture.referees.map((referee) => referee.name).join(', ')}`
            : 'No referee assigned yet'}
        </p>

        <div className="page-actions scoreboard-actions">
          <Link to={`${basePath}/fixtures/${fixture._id}/edit`} className="btn btn-ghost">
            Edit fixture
          </Link>
          <button type="button" className="btn btn-danger" onClick={deleteFixture}>
            Delete fixture
          </button>
        </div>
      </section>

      <section className="dash-section" aria-labelledby="matches-heading">
        <h2 id="matches-heading" className="section-title">
          Matches <span className="count">{matches.length}</span>
        </h2>
        {matches.length === 0 && (
          <EmptyState
            title="Match order not set yet"
            text="The referee sets the order of matches, the sets and the points at the start of the fixture."
          />
        )}
        <div className="match-list">
          {matches.map((match) => (
            <MatchCard
              key={match._id}
              match={match}
              team1={team1}
              team2={team2}
              canEnter={match._id === firstOpen?._id && match.status === 'pending'}
              canClear={match._id === lastCompleted?._id}
              editing={editingMatchId === match._id}
              onEdit={() => setEditingMatchId(match._id)}
              onCancel={() => setEditingMatchId(null)}
              onSaved={handleSaved}
              onClear={() => clearResult(match)}
            />
          ))}
        </div>
      </section>

      <div className="dash-section">
        <FixtureDecision
          key={`${fixture.result_type}-${fixture.updated_at}`}
          fixture={fixture}
          team1={team1}
          team2={team2}
          onSaved={handleSaved}
          onError={setToast}
        />
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}
