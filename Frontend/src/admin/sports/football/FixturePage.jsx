import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { footballApi } from '../../../api/endpoints.js';
import Alert from '../../../components/Alert.jsx';
import PageLoader from '../../../components/PageLoader.jsx';
import { useResource } from '../../../hooks/useResource.js';
import {
  EVENT_TYPE_LABELS,
  fixtureResultText,
  GOAL_TYPE_LABELS,
  PERIOD_LABELS,
} from '../../../sports/football/format.js';
import { formatDateTime } from '../../../utils/dates.js';
import { EditIcon, TrashIcon } from '../../components/icons.jsx';
import { Breadcrumbs, LoadError, PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useFootball } from './footballContext.js';
import FixtureDecision from './FixtureDecision.jsx';

export default function FixturePage() {
  const { fixtureId } = useParams();
  const { data, setData, error, retry } = useResource(fixtureId, () => footballApi.fixture(fixtureId));

  if (!data) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />;

  return <FixtureDetail fixture={data.fixture} onChange={setData} />;
}

function FixtureDetail({ fixture, onChange }) {
  const { tournament, basePath, breadcrumbs, houseName } = useFootball();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const team1 = houseName(fixture.team1);
  const team2 = houseName(fixture.team2);
  const referees = (fixture.referees || []).map((r) => r.name).join(', ');

  async function handleDelete() {
    if (!window.confirm(`Delete ${team1} vs ${team2}?`)) return;
    setDeleting(true);
    setActionError('');
    try {
      await footballApi.deleteFixture(fixture._id);
      navigate(basePath);
    } catch (err) {
      setActionError(err.message);
      setDeleting(false);
    }
  }

  const events = [...(fixture.events || [])].sort((a, b) => a.minute - b.minute);

  return (
    <>
      <Breadcrumbs items={breadcrumbs({ label: `${team1} vs ${team2}` })} />
      <PageHeader
        title={`${team1} vs ${team2}`}
        description={`${tournament.tournament_name}${fixture.scheduled_at ? ` · ${formatDateTime(fixture.scheduled_at)}` : ''}`}
        action={
          <div className="button-row">
            <Link to={`${basePath}/fixtures/${fixture._id}/edit`} className="btn btn-secondary">
              <EditIcon />
              Edit match
            </Link>
            <button
              type="button"
              className="btn btn-danger-outline"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete match"
            >
              <TrashIcon />
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        }
      />

      {actionError && <Alert type="error">{actionError}</Alert>}

      <div className="football-scoreboard">
        <div className="football-team">
          <div className={`football-team-name${fixture.result === 'team1' ? ' is-winner' : ''}`}>{team1}</div>
        </div>
        <div>
          <div className="football-score">
            {fixture.status === 'scheduled' ? 'vs' : `${fixture.team1_score} – ${fixture.team2_score}`}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
            <StatusBadge status={fixture.status} />
            {fixture.result_type === 'abandoned' && <StatusBadge status="abandoned" />}
            {fixture.status === 'live' && fixture.clock?.period && (
              <span className="football-period-badge">
                {PERIOD_LABELS[fixture.clock.period] || fixture.clock.period}
              </span>
            )}
          </div>
        </div>
        <div className="football-team">
          <div className={`football-team-name${fixture.result === 'team2' ? ' is-winner' : ''}`}>{team2}</div>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: '1.5rem' }}>
        <h2 className="panel-title">Match details</h2>
        <dl className="property-list">
          <div>
            <dt>Status</dt>
            <dd>{fixtureResultText(fixture, team1, team2)}</dd>
          </div>
          <div>
            <dt>Referees</dt>
            <dd>{referees || 'No referee assigned yet'}</dd>
          </div>
          <div>
            <dt>Rules</dt>
            <dd>
              {fixture.config?.players_per_team || 7}-a-side · {fixture.config?.half_duration_minutes || 25} min halves
              {fixture.config?.extra_time_duration_minutes > 0
                ? ` · ${fixture.config.extra_time_duration_minutes}m Extra Time`
                : ''}
              {fixture.config?.rolling_subs ? ' · Rolling substitutions' : ''}
            </dd>
          </div>
        </dl>
      </section>

      <div className="field-grid" style={{ marginBottom: '1.5rem' }}>
        <section className="panel">
          <h2 className="panel-title">{team1} Lineup</h2>
          {fixture.team1_lineup?.starters?.length > 0 ? (
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Starting Lineup:</p>
              <ul className="house-list" style={{ marginBottom: '0.75rem' }}>
                {fixture.team1_lineup.starters.map((p) => (
                  <li key={p._id} className="house-chip">
                    {p.name} <span className="muted">@{p.username}</span>
                  </li>
                ))}
              </ul>
              {fixture.team1_lineup.bench?.length > 0 && (
                <>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Bench / Substitutes:</p>
                  <ul className="house-list">
                    {fixture.team1_lineup.bench.map((p) => (
                      <li key={p._id} className="house-chip">
                        {p.name} <span className="muted">@{p.username}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <p className="field-hint">No lineup submitted yet by the referee.</p>
          )}
        </section>

        <section className="panel">
          <h2 className="panel-title">{team2} Lineup</h2>
          {fixture.team2_lineup?.starters?.length > 0 ? (
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Starting Lineup:</p>
              <ul className="house-list" style={{ marginBottom: '0.75rem' }}>
                {fixture.team2_lineup.starters.map((p) => (
                  <li key={p._id} className="house-chip">
                    {p.name} <span className="muted">@{p.username}</span>
                  </li>
                ))}
              </ul>
              {fixture.team2_lineup.bench?.length > 0 && (
                <>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Bench / Substitutes:</p>
                  <ul className="house-list">
                    {fixture.team2_lineup.bench.map((p) => (
                      <li key={p._id} className="house-chip">
                        {p.name} <span className="muted">@{p.username}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <p className="field-hint">No lineup submitted yet by the referee.</p>
          )}
        </section>
      </div>

      <section className="panel" style={{ marginBottom: '1.5rem' }}>
        <h2 className="panel-title">Match Timeline & Events ({events.length})</h2>
        {events.length === 0 ? (
          <p className="field-hint">No events logged yet. Match events recorded by the referee will appear here.</p>
        ) : (
          <div className="football-timeline">
            {events.map((ev) => {
              const eventTeamName = ev.team === 'team1' ? team1 : team2;
              let badgeClass = 'football-event-badge ';
              let badgeText = EVENT_TYPE_LABELS[ev.type] || ev.type;

              if (ev.type === 'goal') {
                badgeClass += 'badge-goal';
                badgeText = GOAL_TYPE_LABELS[ev.goal_type] || 'Goal';
              } else if (ev.type === 'yellow_card') {
                badgeClass += 'badge-yellow';
                badgeText = ev.card_type === 'second_yellow' ? '2nd Yellow (Red)' : 'Yellow Card';
              } else if (ev.type === 'red_card') {
                badgeClass += 'badge-red';
                badgeText = 'Red Card';
              } else if (ev.type === 'substitution') {
                badgeClass += 'badge-sub';
              }

              return (
                <div key={ev._id} className="football-event-item">
                  <span className="football-event-minute">{ev.minute}'</span>
                  <span className={badgeClass}>{badgeText}</span>
                  <strong>{eventTeamName}:</strong>
                  {ev.type === 'goal' && (
                    <span>
                      {ev.player?.name || 'Unknown player'}
                      {ev.assist_player ? ` (assist: ${ev.assist_player.name})` : ''}
                    </span>
                  )}
                  {(ev.type === 'yellow_card' || ev.type === 'red_card') && (
                    <span>{ev.player?.name || 'Unknown player'}</span>
                  )}
                  {ev.type === 'substitution' && (
                    <span>
                      {ev.player_out?.name} ➔ {ev.player_in?.name}
                    </span>
                  )}
                  {ev.note && <span className="muted">({ev.note})</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <FixtureDecision
        fixture={fixture}
        team1={team1}
        team2={team2}
        onSaved={(res) => onChange({ fixture: res?.fixture ?? res })}
        onError={setActionError}
      />
    </>
  );
}
