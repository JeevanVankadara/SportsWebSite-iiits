import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { coordinatorFootballApi as api } from '../../../api/endpoints.js';
import PageLoader from '../../../components/PageLoader.jsx';
import Toast from '../../../components/Toast.jsx';
import { coordinatorPath } from '../../../config.js';
import { useResource } from '../../../hooks/useResource.js';
import { fixtureResultText, houseName } from '../../../sports/football/format.js';
import { formatDateTime } from '../../../utils/dates.js';
import { CoError, Eyebrow, StatusPill } from '../../components/ui.jsx';
import DecisionForm from './DecisionForm.jsx';
import './football.css';
import LineupPanel from './LineupPanel.jsx';
import MatchCenter from './MatchCenter.jsx';
import MatchConfigPanel from './MatchConfigPanel.jsx';

const STEPS = [
  { key: 'config', label: 'Match settings' },
  { key: 'slips', label: 'Lineups' },
  { key: 'play', label: 'Match center' },
];

export default function FootballFixturePage() {
  const { fixtureId } = useParams();
  const { data: detail, setData, error, retry } = useResource(fixtureId, () => api.fixture(fixtureId));
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  async function run(action) {
    setBusy(true);
    try {
      setData(await action());
      return true;
    } catch (err) {
      setToast(err.message);
      if (err.status === 409) api.fixture(fixtureId).then(setData, () => {});
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!detail) return error ? <CoError message={error} onRetry={retry} /> : <PageLoader />;

  const { fixture, tournament } = detail;
  const names = {
    team1: houseName(tournament, fixture.team1),
    team2: houseName(tournament, fixture.team2),
  };

  let step = 'play';
  if (fixture.status === 'completed') step = 'done';
  else if (!fixture.lineup_locked_at) step = 'slips';

  const panel = { fixture, names, busy, run };

  return (
    <>
      <Link to={coordinatorPath('games')} className="co-back">
        ← All games
      </Link>
      <FixtureHeader fixture={fixture} tournament={tournament} names={names} />
      <Steps step={step} />

      {step === 'slips' && (
        <>
          <MatchConfigPanel {...panel} collapsible />
          <LineupPanel {...panel} />
        </>
      )}

      {step === 'play' && (
        <>
          <MatchCenter {...panel} />
          <details className="co-panel co-manage" style={{ marginTop: '1.5rem' }}>
            <summary>Correct the lineups</summary>
            <LineupPanel {...panel} embedded />
          </details>
          <MatchConfigPanel {...panel} collapsible />
        </>
      )}

      {step === 'done' && (
        <>
          <FinishedBanner fixture={fixture} names={names} />
          <MatchCenter {...panel} />
        </>
      )}

      {step !== 'done' && <AbandonFixture {...panel} />}

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  );
}

function FixtureHeader({ fixture, tournament, names }) {
  return (
    <div className="co-fixture-head">
      <div className="co-fixture-head-top">
        <Eyebrow>
          {tournament?.tournament_name} · {fixture.scheduled_at ? formatDateTime(fixture.scheduled_at) : 'Time not announced'}
        </Eyebrow>
        <StatusPill status={fixture.status} />
      </div>
      <div className="co-fixture-head-teams">
        <span className="co-display co-display-xl">{names.team1}</span>
        <span className="co-display co-fixture-head-score">
          {fixture.status === 'scheduled' ? 'vs' : `${fixture.team1_score} – ${fixture.team2_score}`}
        </span>
        <span className="co-display co-display-xl">{names.team2}</span>
      </div>
    </div>
  );
}

function Steps({ step }) {
  const current = step === 'done' ? STEPS.length : STEPS.findIndex((item) => item.key === step);
  return (
    <nav className="co-steps" aria-label="Match steps">
      <ol>
        {STEPS.map((item, index) => {
          const isDone = index < current;
          const isCurrent = index === current;
          return (
            <li
              key={item.key}
              className={`co-step${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
            >
              <span className="co-step-index">{isDone ? '✓' : `0${index + 1}`}</span>
              <span className="co-step-label">{item.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function FinishedBanner({ fixture, names }) {
  return (
    <div className="co-panel co-finished">
      <Eyebrow>Full time · Match over</Eyebrow>
      <h2 className="co-display co-display-lg" style={{ marginTop: '0.25rem' }}>
        {fixtureResultText(fixture, names.team1, names.team2)}
      </h2>
      {fixture.result_type === 'abandoned' && (
        <p className="co-hint" style={{ color: 'var(--co-accent)', marginTop: '0.5rem' }}>
          Abandoned by referee: {fixture.decision_note}
        </p>
      )}
    </div>
  );
}

function AbandonFixture({ fixture, names, busy, run }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="co-panel co-danger-panel" style={{ marginTop: '2rem' }}>
      <div className="co-danger-head">
        <div>
          <Eyebrow>Stop the match</Eyebrow>
          <h2 className="co-display co-display-sm">Abandon match</h2>
        </div>
        {!open && (
          <button
            type="button"
            className="co-btn co-btn-danger-outline co-btn-sm"
            onClick={() => setOpen(true)}
            disabled={busy}
          >
            Abandon match
          </button>
        )}
      </div>
      <p className="co-hint">
        Use this only if the match cannot continue (e.g. extreme weather, injury, or misconduct).
      </p>

      {open && (
        <DecisionForm
          names={names}
          busy={busy}
          submitLabel="Confirm abandonment"
          onSubmit={async ({ decision, note }) => {
            const ok = await run(() =>
              api.decideFixture(fixture._id, {
                result_type: 'abandoned',
                result: decision,
                decision_note: note,
              }),
            );
            if (ok) setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </section>
  );
}
