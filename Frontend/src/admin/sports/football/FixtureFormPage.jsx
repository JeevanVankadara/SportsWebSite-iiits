import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { footballApi } from '../../../api/endpoints.js';
import Alert from '../../../components/Alert.jsx';
import PageLoader from '../../../components/PageLoader.jsx';
import { useResource } from '../../../hooks/useResource.js';
import { toDateTimeInput } from '../../../utils/dates.js';
import RefereePicker from '../../components/RefereePicker.jsx';
import { Breadcrumbs, EmptyState, LoadError, PageHeader } from '../../components/ui.jsx';
import { useFootball } from './footballContext.js';

export default function FixtureFormPage() {
  const { fixtureId } = useParams();
  return <FixtureFormLoader key={fixtureId ?? 'new'} fixtureId={fixtureId} />;
}

function FixtureFormLoader({ fixtureId }) {
  const { data, error, retry } = useResource(fixtureId ?? 'new', () =>
    fixtureId ? footballApi.fixture(fixtureId) : Promise.resolve({ fixture: null }),
  );
  if (!data) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />;
  return <FixtureForm fixture={data.fixture} />;
}

function FixtureForm({ fixture }) {
  const { tournament, basePath, breadcrumbs, houseName } = useFootball();
  const navigate = useNavigate();
  const isEditing = Boolean(fixture);

  const [team1, setTeam1] = useState(fixture?.team1 ?? '');
  const [team2, setTeam2] = useState(fixture?.team2 ?? '');
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeInput(fixture?.scheduled_at));
  const [referees, setReferees] = useState(fixture?.referees ?? []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const teamsLocked = isEditing && fixture.status !== 'scheduled';
  const cancelPath = isEditing ? `${basePath}/fixtures/${fixture._id}` : basePath;

  async function handleSubmit(event) {
    event.preventDefault();
    if (team1 === team2) {
      setError('Pick two different houses');
      return;
    }
    setError('');
    setSaving(true);

    const data = {
      referees: referees.map((referee) => referee._id),
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    };
    if (!teamsLocked) Object.assign(data, { team1, team2 });

    try {
      const res = isEditing
        ? await footballApi.updateFixture(fixture._id, data)
        : await footballApi.createFixture(tournament._id, data);
      const saved = res?.fixture ?? res;
      navigate(`${basePath}/fixtures/${saved._id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (tournament.houses.length < 2) {
    return (
      <>
        <Breadcrumbs items={breadcrumbs({ label: isEditing ? 'Edit match' : 'Add match' })} />
        <PageHeader title={isEditing ? 'Edit match' : 'Add match'} description={tournament.tournament_name} />
        <EmptyState
          title="Not enough houses"
          text="A match needs at least two houses. Add houses in tournament settings first."
          action={
            <Link to={cancelPath} className="btn btn-secondary">
              Back to Football
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <Breadcrumbs
        items={breadcrumbs(
          isEditing ? { label: `${houseName(fixture.team1)} vs ${houseName(fixture.team2)}`, to: cancelPath } : null,
          { label: isEditing ? 'Edit match' : 'Add match' },
        )}
      />
      <PageHeader
        title={isEditing ? 'Edit match' : 'Add match'}
        description={
          isEditing
            ? `${houseName(fixture.team1)} vs ${houseName(fixture.team2)} · ${tournament.tournament_name}`
            : tournament.tournament_name
        }
      />

      <form className="form-card" onSubmit={handleSubmit} noValidate>
        {error && <Alert type="error">{error}</Alert>}

        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="team1">
              Team 1
            </label>
            {teamsLocked ? (
              <p className="field-static">{houseName(fixture.team1)}</p>
            ) : (
              <select
                id="team1"
                className="input"
                value={team1}
                onChange={(event) => setTeam1(event.target.value)}
                required
              >
                <option value="">Choose a house…</option>
                {tournament.houses.map((house) => (
                  <option key={house._id} value={house._id} disabled={house._id === team2}>
                    {house.house_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="team2">
              Team 2
            </label>
            {teamsLocked ? (
              <p className="field-static">{houseName(fixture.team2)}</p>
            ) : (
              <select
                id="team2"
                className="input"
                value={team2}
                onChange={(event) => setTeam2(event.target.value)}
                required
              >
                <option value="">Choose a house…</option>
                {tournament.houses.map((house) => (
                  <option key={house._id} value={house._id} disabled={house._id === team1}>
                    {house.house_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {teamsLocked && (
          <p className="field-hint">Teams cannot change after the match has started.</p>
        )}

        <div className="field">
          <label className="field-label" htmlFor="scheduled_at">
            Date and time <span className="muted">(optional)</span>
          </label>
          <input
            id="scheduled_at"
            className="input"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
        </div>

        <div className="field">
          <span className="field-label">Referees / Co-ordinators</span>
          <RefereePicker referees={referees} onChange={setReferees} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add match'}
          </button>
          <Link to={cancelPath} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
