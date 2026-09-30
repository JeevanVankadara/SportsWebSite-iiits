import { Link } from 'react-router'
import { cricketApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { resultText, teamScore } from '../../../sports/cricket/format.js'
import { formatDateTime } from '../../../utils/dates.js'
import { PlusIcon, TrophyIcon } from '../../components/icons.jsx'
import { EmptyState, LoadError, StatusBadge } from '../../components/ui.jsx'
import { useCricket } from './cricketContext.js'

export default function FixtureList() {
  const { tournament, basePath } = useCricket()
  const { data: fixtures, error, retry } = useResource(`cricket-fixtures-${tournament._id}`, () =>
    cricketApi.fixtures(tournament._id).then((data) => data.fixtures),
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
    {
      key: 'completed',
      title: 'Completed',
      items: fixtures.filter((fixture) => fixture.status === 'completed').reverse(),
    },
  ].filter((group) => group.items.length > 0)

  return groups.map((group) => (
    <section key={group.key} className="dash-section" aria-labelledby={`cricket-fixtures-${group.key}`}>
      <h2 id={`cricket-fixtures-${group.key}`} className="section-title">
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
  const { basePath, houseName } = useCricket()
  const names = { team1: houseName(fixture.team1), team2: houseName(fixture.team2) }
  const referees = fixture.referees.map((referee) => referee.name).join(', ')

  return (
    <li>
      <Link to={`${basePath}/fixtures/${fixture._id}`} className="fixture-row">
        <div className="fixture-teams">
          <span className={`fixture-team${fixture.result === 'team1' ? ' is-winner' : ''}`}>
            {names.team1}
            <small className="cr-row-score">{teamScore(fixture, 'team1')}</small>
          </span>
          <span className="fixture-score">vs</span>
          <span className={`fixture-team${fixture.result === 'team2' ? ' is-winner' : ''}`}>
            {names.team2}
            <small className="cr-row-score">{teamScore(fixture, 'team2')}</small>
          </span>
        </div>
        <div className="fixture-meta">
          <StatusBadge status={fixture.status} />
          {fixture.result_type === 'abandoned' && <StatusBadge status="abandoned" />}
          <span>{resultText(fixture, names)}</span>
          {fixture.overs && <span>{fixture.overs} overs</span>}
          {fixture.scheduled_at && <span>{formatDateTime(fixture.scheduled_at)}</span>}
          <span>{referees ? `Referee: ${referees}` : 'No referee yet'}</span>
        </div>
      </Link>
    </li>
  )
}
