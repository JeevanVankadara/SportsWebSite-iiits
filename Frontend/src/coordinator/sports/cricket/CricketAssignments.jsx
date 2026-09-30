import { Link } from 'react-router'
import { coordinatorCricketApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import { coordinatorPath } from '../../../config.js'
import { useResource } from '../../../hooks/useResource.js'
import { houseName, teamScore } from '../../../sports/cricket/format.js'
import { formatDateTime } from '../../../utils/dates.js'
import { CoEmpty, CoError, Eyebrow, StatusPill } from '../../components/ui.jsx'
import './cricket.css'

const ORDER = { live: 0, scheduled: 1, completed: 2 }

// The cricket section of the co-ordinator's home page: every cricket fixture they referee.
export default function CricketAssignments({ sectionNumber }) {
  const { data: fixtures, error, retry } = useResource('cricket-assigned', () =>
    coordinatorCricketApi.fixtures().then((data) => data.fixtures),
  )

  const counts = { live: 0, scheduled: 0, completed: 0 }
  for (const fixture of fixtures ?? []) counts[fixture.status] += 1
  const sorted = [...(fixtures ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status])

  return (
    <section className="co-section" aria-labelledby="cricket-heading">
      <div className="co-section-head">
        <div>
          <Eyebrow>§ {sectionNumber} — Cricket</Eyebrow>
          <h2 id="cricket-heading" className="co-display co-display-lg">
            Cricket<span className="co-accent">.</span>
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
        <CoEmpty title="No cricket fixtures yet" text="Fixtures the admin assigns to you will show up here." />
      ) : (
        <ul className="co-card-grid">
          {sorted.map((fixture) => (
            <FixtureCard key={fixture._id} fixture={fixture} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FixtureCard({ fixture }) {
  return (
    <li>
      <Link to={coordinatorPath(`cricket/${fixture._id}`)} className={`co-fixture-card is-${fixture.status}`}>
        <div className="co-fixture-card-top">
          <span className="co-fixture-card-tournament">{fixture.tournament?.tournament_name}</span>
          <StatusPill status={fixture.status} />
        </div>
        <div className="co-fixture-card-teams co-cr-card-teams">
          <span className="co-display">
            {houseName(fixture.tournament, fixture.team1)}
            <small>{teamScore(fixture, 'team1')}</small>
          </span>
          <span className="co-fixture-card-score">vs</span>
          <span className="co-display">
            {houseName(fixture.tournament, fixture.team2)}
            <small>{teamScore(fixture, 'team2')}</small>
          </span>
        </div>
        <div className="co-fixture-card-foot">
          <span>{fixture.scheduled_at ? formatDateTime(fixture.scheduled_at) : 'Time not announced'}</span>
          <span className="co-fixture-card-open">{fixture.status === 'completed' ? 'View' : 'Open'} →</span>
        </div>
      </Link>
    </li>
  )
}
