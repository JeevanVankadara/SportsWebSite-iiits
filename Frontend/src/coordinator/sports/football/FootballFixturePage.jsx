import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { coordinatorFootballApi as api } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import Toast from '../../../components/Toast.jsx'
import { coordinatorPath } from '../../../config.js'
import { useResource } from '../../../hooks/useResource.js'
import { fixtureResultText, houseName } from '../../../sports/football/format.js'
import { formatDateTime } from '../../../utils/dates.js'
import DecisionForm from '../../components/DecisionForm.jsx'
import { CoError, Eyebrow, StatusPill } from '../../components/ui.jsx'
import './football.css'
import LineupPanel from './LineupPanel.jsx'
import MatchCenter from './MatchCenter.jsx'
import MatchConfigPanel from './MatchConfigPanel.jsx'

const STEPS = [
  { key: 'config', label: 'Match settings' },
  { key: 'slips', label: 'Lineups' },
  { key: 'play', label: 'Match center' },
]

// A football fixture run by its referee: settings and lineups -> match center, then read-only once it is over.
export default function FootballFixturePage() {
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

  const { fixture, tournament } = detail
  const names = { team1: houseName(tournament, fixture.team1), team2: houseName(tournament, fixture.team2) }
  let step = 'play'
  if (fixture.status === 'completed') step = 'done'
  else if (!fixture.lineup_locked_at) step = 'slips'
  const panel = { fixture, names, busy, run }

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
          <details className="co-panel co-manage">
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
  )
}

function FixtureHeader({ fixture, tournament, names }) {
  const referees = fixture.referees.map((referee) => referee.name).join(', ')
  return (
    <section className="co-fixture-hero">
      <Eyebrow>§ Football · {tournament?.tournament_name}</Eyebrow>
      <div className="co-scoreboard">
        <span className={`co-display co-scoreboard-team${fixture.result === 'team1' ? ' is-winner' : ''}`}>
          {names.team1}
        </span>
        <span className="co-scoreboard-score" aria-label={`Goals: ${fixture.team1_score} to ${fixture.team2_score}`}>
          <span className="co-display">
            {fixture.team1_score}
            <span className="co-scoreboard-dash">–</span>
            {fixture.team2_score}
          </span>
          <small>Goals</small>
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
  return (
    <section className="co-panel co-finished">
      <Eyebrow>§ Full time</Eyebrow>
      <h2 className="co-display co-display-lg">{fixtureResultText(fixture, names.team1, names.team2)}</h2>
      {fixture.result_type === 'abandoned' && (
        <p>
          <strong>Abandoned.</strong> {fixture.decision_note}
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
          Abandon the match
        </button>
      </div>
    )
  }

  return (
    <section className="co-panel co-danger-panel">
      <h2 className="co-display co-display-md">Abandon the match</h2>
      <p className="co-muted">
        Use this only if the match cannot continue (e.g. extreme weather, injury or misconduct). Choose who gets the
        match; the fixture closes with your decision.
      </p>
      <DecisionForm
        names={names}
        busy={busy}
        submitLabel="Abandon match"
        onCancel={() => setOpen(false)}
        onSubmit={({ decision, note }) =>
          run(() => api.decideFixture(fixture._id, { result_type: 'abandoned', result: decision, decision_note: note }))
        }
      />
    </section>
  )
}
