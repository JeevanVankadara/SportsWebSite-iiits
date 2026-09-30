import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { footballApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import Toast from '../../../components/Toast.jsx'
import { useResource } from '../../../hooks/useResource.js'
import {
  EVENT_TYPE_LABELS,
  fixtureResultText,
  GOAL_TYPE_LABELS,
  PERIOD_LABELS,
  sortEvents,
} from '../../../sports/football/format.js'
import { formatDateTime } from '../../../utils/dates.js'
import { CalendarIcon } from '../../components/icons.jsx'
import { Breadcrumbs, EmptyState, LoadError, StatusBadge } from '../../components/ui.jsx'
import { useFootball } from './footballContext.js'
import FixtureDecision from './FixtureDecision.jsx'

// One football fixture for the admin: score, lineups and the referee's event log, plus corrections.
export default function FixturePage() {
  const { fixtureId } = useParams()
  const { basePath, breadcrumbs, houseName } = useFootball()
  const navigate = useNavigate()
  const { data, setData, error, retry } = useResource(fixtureId, () => footballApi.fixture(fixtureId))
  const [toast, setToast] = useState('')

  if (!data) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const { fixture } = data
  const names = { team1: houseName(fixture.team1), team2: houseName(fixture.team2) }
  const config = fixture.config ?? {}
  const events = sortEvents(fixture.events)

  async function deleteFixture() {
    if (!window.confirm(`Delete ${names.team1} vs ${names.team2} with all its events? This cannot be undone.`)) return
    try {
      await footballApi.deleteFixture(fixture._id)
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
          {fixture.status === 'live' && fixture.clock?.period && (
            <span className="football-period-badge">{PERIOD_LABELS[fixture.clock.period] ?? fixture.clock.period}</span>
          )}
          {fixture.scheduled_at && (
            <span className="t-card-dates">
              <CalendarIcon size={15} />
              {formatDateTime(fixture.scheduled_at)}
            </span>
          )}
          <span className="t-card-dates">
            {config.players_per_team}-a-side · {config.half_duration_minutes} min halves
            {config.extra_time_duration_minutes > 0 && ` · ${config.extra_time_duration_minutes} min extra time halves`}
          </span>
        </div>

        <div className="scoreboard-teams">
          <span className={`scoreboard-team${fixture.result === 'team1' ? ' is-winner' : ''}`}>{names.team1}</span>
          <span className="scoreboard-score">
            {fixture.status === 'scheduled' ? 'vs' : `${fixture.team1_score} – ${fixture.team2_score}`}
          </span>
          <span className={`scoreboard-team${fixture.result === 'team2' ? ' is-winner' : ''}`}>{names.team2}</span>
        </div>
        <p className="scoreboard-result">{fixtureResultText(fixture, names.team1, names.team2)}</p>

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

      <section className="dash-section" aria-labelledby="lineups-heading">
        <h2 id="lineups-heading" className="section-title">
          Lineups
        </h2>
        <div className="football-lineups">
          {['team1', 'team2'].map((team) => (
            <Lineup key={team} lineup={fixture[`${team}_lineup`]} name={names[team]} config={config} />
          ))}
        </div>
      </section>

      <section className="dash-section" aria-labelledby="events-heading">
        <h2 id="events-heading" className="section-title">
          Match events
        </h2>
        {events.length === 0 ? (
          <EmptyState
            title="No events yet"
            text="Goals, cards and substitutions recorded by the referee show up here."
          />
        ) : (
          <div className="panel football-timeline">
            {events.map((event) => (
              <EventRow key={event._id} event={event} names={names} />
            ))}
          </div>
        )}
      </section>

      <div className="dash-section">
        <FixtureDecision
          key={`${fixture.result_type}-${fixture.updated_at}`}
          fixture={fixture}
          team1={names.team1}
          team2={names.team2}
          onSaved={(saved) => setData({ ...data, fixture: saved?.fixture ?? saved })}
          onError={setToast}
        />
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}

function Lineup({ lineup, name, config }) {
  const starters = lineup?.starters ?? []
  const bench = lineup?.bench ?? []
  return (
    <section className="panel">
      <h3 className="panel-title">{name}</h3>
      {starters.length === 0 ? (
        <p className="field-hint">The referee has not entered this lineup yet.</p>
      ) : (
        <>
          <p className="field-hint">
            Starting {starters.length} of {config.players_per_team}
          </p>
          <PlayerChips players={starters} />
          {bench.length > 0 && (
            <>
              <p className="field-hint">Substitutes</p>
              <PlayerChips players={bench} />
            </>
          )}
        </>
      )}
    </section>
  )
}

function PlayerChips({ players }) {
  return (
    <ul className="house-list">
      {players.map((player) => (
        <li key={player._id} className="house-chip">
          {player.name} <span className="muted">@{player.username}</span>
        </li>
      ))}
    </ul>
  )
}

const BADGES = { goal: 'badge-goal', yellow_card: 'badge-yellow', red_card: 'badge-red', substitution: 'badge-sub' }

function EventRow({ event, names }) {
  let label = EVENT_TYPE_LABELS[event.type] ?? event.type
  if (event.type === 'goal') label = GOAL_TYPE_LABELS[event.goal_type] ?? 'Goal'
  if (event.card_type === 'second_yellow') label = '2nd yellow (sent off)'

  return (
    <div className="football-event-item">
      <span className="football-event-minute">{event.minute}'</span>
      <span className={`football-event-badge ${BADGES[event.type] ?? ''}`}>{label}</span>
      <strong>{names[event.team]}:</strong>
      {event.type === 'substitution' ? (
        <span>
          {event.player_out?.name ?? 'Unknown'} ➔ {event.player_in?.name ?? 'Unknown'}
        </span>
      ) : (
        <span>
          {event.player?.name ?? 'Unknown player'}
          {event.assist_player && ` (assist: ${event.assist_player.name})`}
        </span>
      )}
      {event.note && <span className="muted">({event.note})</span>}
    </div>
  )
}
