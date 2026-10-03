import { Link } from 'react-router'
import { coordinatorVolleyballApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import { coordinatorPath } from '../../../config.js'
import { useResource } from '../../../hooks/useResource.js'
import { houseName, MATCH_SETS } from '../../../sports/volleyball/format.js'
import { formatDateTime } from '../../../utils/dates.js'
import { CoEmpty, CoError, Eyebrow, StatusPill } from '../../components/ui.jsx'

const ORDER = { live: 0, scheduled: 1 }

export default function VolleyballAssignments({ sectionNumber }) {
  const { data: fixtures, error, retry } = useResource('volleyball-assigned', () =>
    coordinatorVolleyballApi.fixtures().then((data) => data.fixtures),
  )

  const activeFixtures = (fixtures ?? []).filter((fixture) => fixture.status !== 'completed')
  const counts = { live: 0, scheduled: 0 }
  for (const fixture of activeFixtures) {
    if (counts[fixture.status] != null) counts[fixture.status] += 1
  }
  const sorted = [...activeFixtures].sort((a, b) => (ORDER[a.status] ?? 99) - (ORDER[b.status] ?? 99))

  return (
    <section className="co-section" aria-labelledby="volleyball-heading">
      <div className="co-section-head">
        <div>
          <Eyebrow>§ {sectionNumber} — Volleyball</Eyebrow>
          <h2 id="volleyball-heading" className="co-display co-display-lg">
            Volleyball<span className="co-accent">.</span>
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
        <CoEmpty title="No active volleyball matches" text="Ongoing and upcoming matches assigned to you will show up here." />
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
  const team1 = houseName(fixture.tournament, fixture.team1)
  const team2 = houseName(fixture.tournament, fixture.team2)
  const started = fixture.status !== 'scheduled'
  const liveSet = started ? (fixture.sets ?? []).find((set) => set.status === 'live') : null

  return (
    <li>
      <Link to={coordinatorPath(`volleyball/${fixture._id}`)} className={`co-fixture-card is-${fixture.status}`}>
        <div className="co-fixture-card-top">
          <span className="co-fixture-card-tournament">{fixture.tournament?.tournament_name}</span>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {fixture.status === 'live' && liveSet && (
              <span className="co-small co-muted">Set {liveSet.set_no} of {MATCH_SETS}</span>
            )}
            <StatusPill status={fixture.status} />
          </div>
        </div>
        <div className="co-fixture-card-teams">
          <span className="co-display">{team1}</span>
          <span className="co-fixture-card-score">
            {started ? `${fixture.team1_sets_won ?? 0} – ${fixture.team2_sets_won ?? 0}` : 'vs'}
          </span>
          <span className="co-display">{team2}</span>
        </div>
        <div className="co-fixture-card-foot">
          <span>{fixture.scheduled_at ? formatDateTime(fixture.scheduled_at) : 'Time not announced'}</span>
          <span className="co-fixture-card-open">Open →</span>
        </div>
      </Link>
    </li>
  )
}
