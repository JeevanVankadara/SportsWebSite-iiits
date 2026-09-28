import { Link } from 'react-router';
import { footballApi } from '../../../api/endpoints.js';
import PageLoader from '../../../components/PageLoader.jsx';
import { useResource } from '../../../hooks/useResource.js';
import { fixtureResultText, PERIOD_LABELS } from '../../../sports/football/format.js';
import { formatDateTime } from '../../../utils/dates.js';
import { PlusIcon, TrophyIcon } from '../../components/icons.jsx';
import { EmptyState, LoadError, StatusBadge } from '../../components/ui.jsx';
import { useFootball } from './footballContext.js';

export default function FixtureList() {
  const { tournament, basePath } = useFootball();
  const { data: fixtures, error, retry } = useResource(`football-fixtures-${tournament._id}`, () =>
    footballApi.fixtures(tournament._id).then((data) => data.fixtures),
  );

  if (!fixtures) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />;

  if (fixtures.length === 0) {
    return (
      <EmptyState
        icon={<TrophyIcon size={24} />}
        title="No matches scheduled yet"
        text="Schedule a football match between two houses."
        action={
          <Link to={`${basePath}/fixtures/new`} className="btn btn-primary">
            <PlusIcon />
            Add match
          </Link>
        }
      />
    );
  }

  const groups = [
    { key: 'live', title: 'Live', items: fixtures.filter((f) => f.status === 'live') },
    { key: 'scheduled', title: 'Upcoming', items: fixtures.filter((f) => f.status === 'scheduled') },
    { key: 'completed', title: 'Completed', items: fixtures.filter((f) => f.status === 'completed').reverse() },
  ].filter((g) => g.items.length > 0);

  return groups.map((group) => (
    <section key={group.key} className="dash-section" aria-labelledby={`football-fixtures-${group.key}`}>
      <h2 id={`football-fixtures-${group.key}`} className="section-title">
        {group.title} <span className="count">{group.items.length}</span>
      </h2>
      <ul className="fixture-list">
        {group.items.map((fixture) => (
          <FixtureRow key={fixture._id} fixture={fixture} />
        ))}
      </ul>
    </section>
  ));
}

function FixtureRow({ fixture }) {
  const { basePath, houseName } = useFootball();
  const team1 = houseName(fixture.team1);
  const team2 = houseName(fixture.team2);
  const referees = (fixture.referees || []).map((r) => r.name).join(', ');

  return (
    <li>
      <Link to={`${basePath}/fixtures/${fixture._id}`} className="fixture-row">
        <div className="fixture-teams">
          <span className={`fixture-team${fixture.result === 'team1' ? ' is-winner' : ''}`}>{team1}</span>
          <span className="fixture-score">
            {fixture.status === 'scheduled' ? 'vs' : `${fixture.team1_score} – ${fixture.team2_score}`}
          </span>
          <span className={`fixture-team${fixture.result === 'team2' ? ' is-winner' : ''}`}>{team2}</span>
        </div>
        <div className="fixture-meta">
          <StatusBadge status={fixture.status} />
          {fixture.result_type === 'abandoned' && <StatusBadge status="abandoned" />}
          {fixture.status === 'live' && fixture.clock?.period && (
            <span className="football-period-badge">{PERIOD_LABELS[fixture.clock.period] || fixture.clock.period}</span>
          )}
          <span>{fixtureResultText(fixture, team1, team2)}</span>
          {fixture.scheduled_at && <span>{formatDateTime(fixture.scheduled_at)}</span>}
          <span>{referees ? `Referee: ${referees}` : 'No referee yet'}</span>
        </div>
      </Link>
    </li>
  );
}
