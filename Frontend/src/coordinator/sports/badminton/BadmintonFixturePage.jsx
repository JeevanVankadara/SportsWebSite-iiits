import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { coordinatorBadmintonApi as api } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import Toast from '../../../components/Toast.jsx'
import { coordinatorPath } from '../../../config.js'
import { useResource } from '../../../hooks/useResource.js'
import { houseName } from '../../../sports/badminton/format.js'
import { formatDateTime } from '../../../utils/dates.js'
import { CoError, Eyebrow, StatusPill } from '../../components/ui.jsx'
import './badminton.css'
import DecisionForm from './DecisionForm.jsx'
import MatchList from './MatchList.jsx'
import MatchOrderPanel from './MatchOrderPanel.jsx'
import ScoringPanel from './ScoringPanel.jsx'
import SlipPanel from './SlipPanel.jsx'

const STEPS = [
  { key: 'order', label: 'Match order' },
  { key: 'slips', label: 'Slips' },
  { key: 'play', label: 'Play' },
]

// A badminton fixture run by its referee: match order -> slips -> play, then read-only once it is over.
export default function BadmintonFixturePage() {
  const { fixtureId } = useParams()
  const { data: detail, setData, error, retry } = useResource(fixtureId, () => api.fixture(fixtureId))
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  // Runs one referee action. The server answers with the whole fixture, which replaces what is shown.
  // If the action clashed with a change made elsewhere (e.g. by another referee), the latest state is loaded.
  // Resolves to true when the action worked.
  async function run(action) {
    setBusy(true)
    try {
      setData(await action())
      return true
    } catch (err) {
      setToast(err.message)
      if (err.status === 409) api.fixture(fixtureId).then(setData, () => {})
      return false
    } finally {
      setBusy(false)
    }
  }

  if (!detail) return error ? <CoError message={error} onRetry={retry} /> : <PageLoader />

  const { fixture, matches, tournament } = detail
  const names = { team1: houseName(tournament, fixture.team1), team2: houseName(tournament, fixture.team2) }
  let step = 'play'
  if (fixture.status === 'completed') step = 'done'
  else if (matches.length === 0) step = 'order'
  else if (!fixture.lineup_locked_at) step = 'slips'
  const panel = { fixture, matches, names, busy, run }

  return (
    <>
      <Link to={coordinatorPath('games')} className="co-back">
        ← All games
      </Link>
      <FixtureHeader fixture={fixture} tournament={tournament} names={names} />
      <Steps step={step} />

      {step === 'order' && <MatchOrderPanel {...panel} />}

      {step === 'slips' && (
        <>
          <SlipPanel {...panel} />
          <MatchOrderPanel {...panel} collapsible />
        </>
      )}

      {step === 'play' && (
        <>
          <ScoringPanel {...panel} />
          <MatchList {...panel} editable />
          <details className="co-panel co-manage">
            <summary>Correct the slips</summary>
            <SlipPanel {...panel} embedded />
          </details>
          <MatchOrderPanel {...panel} collapsible />
        </>
      )}

      {step === 'done' && (
        <>
          <FinishedBanner fixture={fixture} names={names} />
          <MatchList {...panel} />
        </>
      )}

      {step !== 'done' && <AbandonFixture {...panel} />}

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}

function FixtureHeader({ fixture, tournament, names }) {
  const referees = fixture.referees.map((referee) => referee.name).join(', ')
  return (
    <section className="co-fixture-hero">
      <Eyebrow>§ Badminton · {tournament?.tournament_name}</Eyebrow>
      <div className="co-scoreboard">
        <span className={`co-display co-scoreboard-team${fixture.result === 'team1' ? ' is-winner' : ''}`}>
          {names.team1}
        </span>
        <span className="co-scoreboard-score" aria-label={`Matches won: ${fixture.team1_matches_won} to ${fixture.team2_matches_won}`}>
          <span className="co-display">
            {fixture.team1_matches_won}
            <span className="co-scoreboard-dash">–</span>
            {fixture.team2_matches_won}
          </span>
          <small>Matches won</small>
        </span>
        <span className={`co-display co-scoreboard-team${fixture.result === 'team2' ? ' is-winner' : ''}`}>
          {names.team2}
        </span>
      </div>
      <div className="co-fixture-meta">
        <StatusPill status={fixture.status} />
        {fixture.scheduled_at && <span>{formatDateTime(fixture.scheduled_at)}</span>}
        {referees && <span>Referees: {referees}</span>}
      </div>
    </section>
  )
}

function Steps({ step }) {
  const current = step === 'done' ? STEPS.length : STEPS.findIndex((item) => item.key === step)
  return (
    <ol className="co-steps" aria-label="Progress">
      {STEPS.map((item, index) => {
        const state = index < current ? 'is-done' : index === current ? 'is-current' : ''
        return (
          <li key={item.key} className={state} aria-current={index === current ? 'step' : undefined}>
            <span className="co-step-no">{index < current ? '✓' : index + 1}</span>
            {item.label}
          </li>
        )
      })}
    </ol>
  )
}

function FinishedBanner({ fixture, names }) {
  const result = fixture.result === 'draw' ? 'Fixture drawn' : `${names[fixture.result]} won the fixture`
  return (
    <section className="co-panel co-finished">
      <Eyebrow>§ Full time</Eyebrow>
      <h2 className="co-display co-display-lg">{result}</h2>
      {fixture.result_type === 'abandoned' && (
        <p>
          <strong>Abandoned.</strong> {fixture.note}
        </p>
      )}
      <p className="co-muted">This fixture is over. Only the admin can change it now.</p>
    </section>
  )
}

function AbandonFixture({ fixture, names, busy, run }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className="co-danger-zone">
        <button type="button" className="co-btn co-btn-danger" onClick={() => setOpen(true)}>
          Abandon the whole fixture
        </button>
      </div>
    )
  }

  return (
    <section className="co-panel co-danger-panel">
      <h2 className="co-display co-display-md">Abandon the fixture</h2>
      <p className="co-muted">
        Choose who gets the fixture. Matches not yet finished are marked as not played, and the fixture closes.
      </p>
      <DecisionForm
        names={names}
        busy={busy}
        submitLabel="Abandon fixture"
        onCancel={() => setOpen(false)}
        onSubmit={({ decision, note }) =>
          run(() => api.decideFixture(fixture._id, { result_type: 'abandoned', result: decision, note }))
        }
      />
    </section>
  )
}
