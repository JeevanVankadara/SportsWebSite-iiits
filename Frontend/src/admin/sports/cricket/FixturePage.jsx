import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { cricketApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import Toast from '../../../components/Toast.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { playerIndex, resultText, superOverScores, teamScore } from '../../../sports/cricket/format.js'
import { formatDateTime } from '../../../utils/dates.js'
import { CalendarIcon } from '../../components/icons.jsx'
import { Breadcrumbs, EmptyState, LoadError, StatusBadge } from '../../components/ui.jsx'
import { useCricket } from './cricketContext.js'
import FixtureDecision from './FixtureDecision.jsx'
import InningsCard from './InningsCard.jsx'

export default function FixturePage() {
  const { fixtureId } = useParams()
  const { basePath, breadcrumbs, houseName } = useCricket()
  const navigate = useNavigate()
  const { data: detail, setData, error, retry } = useResource(fixtureId, () => cricketApi.fixture(fixtureId))
  const [toast, setToast] = useState('')

  if (!detail) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const { fixture, innings } = detail
  const names = { team1: houseName(fixture.team1), team2: houseName(fixture.team2) }
  const players = playerIndex(fixture)

  async function deleteFixture() {
    if (!window.confirm(`Delete ${names.team1} vs ${names.team2} with all its scores? This cannot be undone.`)) return
    try {
      await cricketApi.deleteFixture(fixture._id)
      navigate(basePath)
    } catch (err) {
      setToast(err.message)
    }
  }

  return (
    <>
      <Breadcrumbs items={breadcrumbs({ label: `${names.team1} vs ${names.team2}` })} />

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
          {fixture.overs && (
            <span className="t-card-dates">
              {fixture.overs} overs · powerplay {fixture.powerplay_overs}
            </span>
          )}
        </div>

        <div className="scoreboard-teams">
          <TeamScore fixture={fixture} team="team1" name={names.team1} />
          <span className="scoreboard-score">vs</span>
          <TeamScore fixture={fixture} team="team2" name={names.team2} />
        </div>
        <p className="scoreboard-result">{resultText(fixture, names)}</p>

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

      <section className="dash-section" aria-labelledby="scorecard-heading">
        <h2 id="scorecard-heading" className="section-title">
          Scorecard
        </h2>
        {innings.length === 0 ? (
          <EmptyState
            title="Not started yet"
            text="The referee sets the overs, powerplay, squads and toss, then scores ball by ball."
          />
        ) : (
          <div className="cr-cards">
            {innings.map((item) => (
              <InningsCard key={item._id} innings={item} fixture={fixture} names={names} players={players} />
            ))}
          </div>
        )}
      </section>

      <div className="dash-section">
        <FixtureDecision
          key={`${fixture.result_type}-${fixture.updated_at}`}
          fixture={fixture}
          names={names}
          onSaved={setData}
          onError={setToast}
        />
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}

function TeamScore({ fixture, team, name }) {
  const superOvers = superOverScores(fixture, team)
  return (
    <span className={`scoreboard-team cr-board-team${fixture.result === team ? ' is-winner' : ''}`}>
      {name}
      <small>{teamScore(fixture, team) || 'Yet to bat'}</small>
      {superOvers.length > 0 && <small>Super over: {superOvers.join(', ')}</small>}
    </span>
  )
}
