import { Link } from 'react-router';
import { coordinatorFootballApi } from '../../../api/endpoints.js';
import PageLoader from '../../../components/PageLoader.jsx';
import { coordinatorPath } from '../../../config.js';
import { useResource } from '../../../hooks/useResource.js';
import { houseName, PERIOD_LABELS } from '../../../sports/football/format.js';
import { formatDateTime } from '../../../utils/dates.js';
import { CoEmpty, CoError, Eyebrow, StatusPill } from '../../components/ui.jsx';

const ORDER = { live: 0, scheduled: 1, completed: 2 };

export default function FootballAssignments({ sectionNumber }) {
  const { data: fixtures, error, retry } = useResource('football-assigned', () =>
    coordinatorFootballApi.fixtures().then((data) => data.fixtures),
  );

  const counts = { live: 0, scheduled: 0, completed: 0 };
  for (const fixture of fixtures ?? []) counts[fixture.status] += 1;
  const sorted = [...(fixtures ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <section className="co-section" aria-labelledby="football-heading">
      <div className="co-section-head">
        <div>
          <Eyebrow>§ {sectionNumber} — Football</Eyebrow>
          <h2 id="football-heading" className="co-display co-display-lg">
            Football<span className="co-accent">.</span>
          </h2>
        </div>
        {fixtures && (
          <dl className="co-stats">
            <div>
              <dt>Live</dt>
              <dd>{counts.live}</dd>
            </div>
            <div>
              <dt>Upcoming</dt>
              <dd>{counts.scheduled}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{counts.completed}</dd>
            </div>
          </dl>
        )}
      </div>

      {!fixtures ? (
        error ? (
          <CoError message={error} onRetry={retry} />
        ) : (
          <PageLoader />
        )
      ) : sorted.length === 0 ? (
        <CoEmpty title="No football matches yet" text="Matches the admin assigns to you will show up here." />
      ) : (
        <ul className="co-card-grid">
          {sorted.map((fixture) => (
            <FixtureCard key={fixture._id} fixture={fixture} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FixtureCard({ fixture }) {
  const team1 = houseName(fixture.tournament, fixture.team1);
  const team2 = houseName(fixture.tournament, fixture.team2);
  const started = fixture.status !== 'scheduled';

  return (
    <li>
      <Link to={coordinatorPath(`football/${fixture._id}`)} className={`co-fixture-card is-${fixture.status}`}>
        <div className="co-fixture-card-top">
          <span className="co-fixture-card-tournament">{fixture.tournament?.tournament_name}</span>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {fixture.status === 'live' && fixture.clock?.period && (
              <span className="co-event-badge co-badge-goal">
                {PERIOD_LABELS[fixture.clock.period] || fixture.clock.period}
              </span>
            )}
            <StatusPill status={fixture.status} />
          </div>
        </div>
        <div className="co-fixture-card-teams">
          <span className="co-display">{team1}</span>
          <span className="co-fixture-card-score">
            {started ? `${fixture.team1_score} – ${fixture.team2_score}` : 'vs'}
          </span>
          <span className="co-display">{team2}</span>
        </div>
        <div className="co-fixture-card-foot">
          <span>{fixture.scheduled_at ? formatDateTime(fixture.scheduled_at) : 'Time not announced'}</span>
          <span className="co-fixture-card-open">{fixture.status === 'completed' ? 'View' : 'Open'} →</span>
        </div>
      </Link>
    </li>
  );
}
