import { Link } from 'react-router'
import { coordinatorKabaddiApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import { coordinatorPath } from '../../../config.js'
import { useResource } from '../../../hooks/useResource.js'
import { houseName, PERIOD_LABELS } from '../../../sports/kabaddi/format.js'
import { formatDateTime } from '../../../utils/dates.js'
import { CoEmpty, CoError, Eyebrow, StatusPill } from '../../components/ui.jsx'

const ORDER = { live: 0, scheduled: 1 }

export default function KabaddiAssignments({ sectionNumber }) {
  const { data: fixtures, error, retry } = useResource('kabaddi-assigned', () =>
    coordinatorKabaddiApi.fixtures().then((data) => data.fixtures),
  )

  const activeFixtures = (fixtures ?? []).filter((fixture) => fixture.status !== 'completed')
  const counts = { live: 0, scheduled: 0 }
  for (const fixture of activeFixtures) {
    if (counts[fixture.status] != null) counts[fixture.status] += 1
  }
  const sorted = [...activeFixtures].sort((a, b) => (ORDER[a.status] ?? 99) - (ORDER[b.status] ?? 99))

  return (
    <section className="co-section" aria-labelledby="kabaddi-heading">
      <div className="co-section-head">
        <div>
          <Eyebrow>§ {sectionNumber} — Kabaddi</Eyebrow>
          <h2 id="kabaddi-heading" className="co-display co-display-lg">
            Kabaddi<span className="co-accent">.</span>
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
        <CoEmpty title="No active kabaddi matches" text="Ongoing and upcoming matches assigned to you will show up here." />
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

  return (
    <li>
      <Link to={coordinatorPath(`kabaddi/${fixture._id}`)} className={`co-fixture-card is-${fixture.status}`}>
        <div className="co-fixture-card-top">
          <span className="co-fixture-card-tournament">{fixture.tournament?.tournament_name}</span>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {fixture.status === 'live' && (
              <span className="co-small co-muted">{PERIOD_LABELS[fixture.clock?.period] ?? ''}</span>
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
          <span className="co-fixture-card-open">Open →</span>
        </div>
      </Link>
    </li>
  )
}
