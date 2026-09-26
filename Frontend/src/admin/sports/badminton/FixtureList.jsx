import { Link } from 'react-router'
import { badmintonApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import { PlusIcon, TrophyIcon } from '../../components/icons.jsx'
import { EmptyState, LoadError, StatusBadge } from '../../components/ui.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { formatDateTime } from '../../../utils/dates.js'
import { useBadminton } from './badmintonContext.js'
import { fixtureResultText } from '../../../sports/badminton/format.js'

export default function FixtureList() {
  const { tournament, basePath } = useBadminton()
  const { data: fixtures, error, retry } = useResource(`fixtures-${tournament._id}`, () =>
    badmintonApi.fixtures(tournament._id).then((data) => data.fixtures),
  )

  if (!fixtures) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  if (fixtures.length === 0) {
    return (
      <EmptyState
        icon={<TrophyIcon size={24} />}
        title="No fixtures yet"
        text="Add a fixture to set up a match between two houses."
        action={
          <Link to={`${basePath}/fixtures/new`} className="btn btn-primary">
            <PlusIcon />
            Add fixture
          </Link>
        }
      />
    )
  }

  const groups = [
    { key: 'live', title: 'Live', items: fixtures.filter((fixture) => fixture.status === 'live') },
    { key: 'scheduled', title: 'Upcoming', items: fixtures.filter((fixture) => fixture.status === 'scheduled') },
    // Most recently finished first.
    {
      key: 'completed',
      title: 'Completed',
      items: fixtures.filter((fixture) => fixture.status === 'completed').reverse(),
    },
  ].filter((group) => group.items.length > 0)

  return groups.map((group) => (
    <section key={group.key} className="dash-section" aria-labelledby={`fixtures-${group.key}`}>
      <h2 id={`fixtures-${group.key}`} className="section-title">
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
  const { basePath, houseName } = useBadminton()
  const team1 = houseName(fixture.team1)
  const team2 = houseName(fixture.team2)
  const referees = fixture.referees.map((referee) => referee.name).join(', ')

  return (
    <li>
      <Link to={`${basePath}/fixtures/${fixture._id}`} className="fixture-row">
        <div className="fixture-teams">
          <span className={`fixture-team${fixture.result === 'team1' ? ' is-winner' : ''}`}>{team1}</span>
          <span className="fixture-score">
            {fixture.status === 'scheduled' ? 'vs' : `${fixture.team1_matches_won} – ${fixture.team2_matches_won}`}
          </span>
          <span className={`fixture-team${fixture.result === 'team2' ? ' is-winner' : ''}`}>{team2}</span>
        </div>
        <div className="fixture-meta">
          <StatusBadge status={fixture.status} />
          {fixture.result_type === 'abandoned' && <StatusBadge status="abandoned" />}
          <span>{fixtureResultText(fixture, team1, team2)}</span>
          {fixture.match_count > 0 && <span>{fixture.match_count} matches</span>}
          {fixture.scheduled_at && <span>{formatDateTime(fixture.scheduled_at)}</span>}
          <span>{referees ? `Referee: ${referees}` : 'No referee yet'}</span>
        </div>
      </Link>
    </li>
  )
}
