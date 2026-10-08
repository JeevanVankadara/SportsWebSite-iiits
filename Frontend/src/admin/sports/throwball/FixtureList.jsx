import { Link } from 'react-router'
import { throwballApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { fixtureResultText } from '../../../sports/throwball/format.js'
import { formatDateTime } from '../../../utils/dates.js'
import { PlusIcon, TrophyIcon } from '../../components/icons.jsx'
import { EmptyState, LoadError, StatusBadge } from '../../components/ui.jsx'
import { useThrowball } from './throwballContext.js'

export default function FixtureList() {
  const { tournament, basePath } = useThrowball()
  const { data: fixtures, error, retry } = useResource(`throwball-fixtures-${tournament._id}`, () =>
    throwballApi.fixtures(tournament._id).then((data) => data.fixtures),
  )

  if (!fixtures) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  if (fixtures.length === 0) {
    return (
      <EmptyState
        icon={<TrophyIcon size={24} />}
        title="No matches scheduled yet"
        text="Schedule a throwball match between two houses."
        action={
          <Link to={`${basePath}/fixtures/new`} className="btn btn-primary">
            <PlusIcon />
            Add match
          </Link>
        }
      />
    )
  }

  const groups = [
    { key: 'live', title: 'Live', items: fixtures.filter((f) => f.status === 'live') },
    { key: 'scheduled', title: 'Upcoming', items: fixtures.filter((f) => f.status === 'scheduled') },
    { key: 'completed', title: 'Completed', items: fixtures.filter((f) => f.status === 'completed').reverse() },
  ].filter((g) => g.items.length > 0)

  return groups.map((group) => (
    <section key={group.key} className="dash-section" aria-labelledby={`throwball-fixtures-${group.key}`}>
      <h2 id={`throwball-fixtures-${group.key}`} className="section-title">
        {group.title} <span className="count">{group.items.length}</span>
      </h2>
      <ul className="fixture-list">
        {group.items.map((fixture) => (
          <FixtureRow key={fixture._id} fixture={fixture} />
        ))}
      </ul>
    </section>
  ))
}

function FixtureRow({ fixture }) {
  const { basePath, houseName } = useThrowball()
  const team1 = houseName(fixture.team1)
  const team2 = houseName(fixture.team2)
  const referees = (fixture.referees || []).map((r) => r.name).join(', ')

  return (
    <li>
      <Link to={`${basePath}/fixtures/${fixture._id}`} className="fixture-row">
        <div className="fixture-teams">
          <span className={`fixture-team${fixture.result === 'team1' ? ' is-winner' : ''}`}>{team1}</span>
          <span className="fixture-score">
            {fixture.status === 'scheduled' ? 'vs' : `${fixture.team1_sets_won ?? 0} – ${fixture.team2_sets_won ?? 0}`}
          </span>
          <span className={`fixture-team${fixture.result === 'team2' ? ' is-winner' : ''}`}>{team2}</span>
        </div>
        <div className="fixture-meta">
          <StatusBadge status={fixture.status} />
          {fixture.result_type === 'abandoned' && <StatusBadge status="abandoned" />}
          <span>{fixtureResultText(fixture, team1, team2)}</span>
          {fixture.scheduled_at && <span>{formatDateTime(fixture.scheduled_at)}</span>}
          <span>{referees ? `Referee: ${referees}` : 'No referee yet'}</span>
        </div>
      </Link>
    </li>
  )
}
