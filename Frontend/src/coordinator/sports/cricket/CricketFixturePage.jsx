import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { coordinatorCricketApi as api } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import Toast from '../../../components/Toast.jsx'
import { coordinatorPath } from '../../../config.js'
import { useResource } from '../../../hooks/useResource.js'
import {
  houseName,
  playerIndex,
  resultText,
  setupComplete,
  superOverScores,
  teamScore,
} from '../../../sports/cricket/format.js'
import { formatDateTime } from '../../../utils/dates.js'
import DecisionForm from '../../components/DecisionForm.jsx'
import { CoError, Eyebrow, StatusPill } from '../../components/ui.jsx'
import './cricket.css'
import PlayPanel from './PlayPanel.jsx'
import Scorecard from './Scorecard.jsx'
import SetupPanel from './SetupPanel.jsx'
import TossPanel from './TossPanel.jsx'

const STEPS = [
  { key: 'setup', label: 'Setup' },
  { key: 'toss', label: 'Toss' },
  { key: 'play', label: 'Play' },
]

const NO_RESULT = { value: 'no_result', label: 'No result' }

function stepOf(fixture) {
  if (fixture.status === 'completed') return 'done'
  if (fixture.status === 'live') return 'play'
  if (!setupComplete(fixture)) return 'setup'
  return fixture.toss?.winner ? 'play' : 'toss'
}

// A cricket fixture run by its referee: setup -> toss -> play, then read-only once it is over.
export default function CricketFixturePage() {
  const { fixtureId } = useParams()
  const { data: detail, setData, error, retry } = useResource(fixtureId, () => api.fixture(fixtureId))
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  // Runs one referee action and shows the fixture the server answers with. On a clash with a change
  // made elsewhere the latest state is loaded. Resolves to true when the action worked.
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

  const { fixture, innings, tournament } = detail
  const names = { team1: houseName(tournament, fixture.team1), team2: houseName(tournament, fixture.team2) }
  const step = stepOf(fixture)
  const panel = { fixture, innings, names, players: playerIndex(fixture), busy, run }

  return (
    <div className="co-cricket">
      <Link to={coordinatorPath('games')} className="co-back">
        ← All games
      </Link>
      <FixtureHeader fixture={fixture} tournament={tournament} names={names} />
      <Steps step={step} />

      {step === 'setup' && <SetupPanel {...panel} />}
      {step === 'toss' && (
        <>
          <TossPanel {...panel} />
          <SetupPanel {...panel} collapsible />
        </>
      )}
      {step === 'play' && <PlayPanel {...panel} />}
      {step === 'done' && (
        <>
          <FinishedBanner fixture={fixture} names={names} />
          <Scorecard {...panel} />
        </>
      )}

      {step !== 'done' && <AbandonFixture {...panel} />}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}

function FixtureHeader({ fixture, tournament, names }) {
  const referees = fixture.referees.map((referee) => referee.name).join(', ')
  return (
    <section className="co-fixture-hero">
      <Eyebrow>§ Cricket · {tournament?.tournament_name}</Eyebrow>
      <div className="co-cr-board">
        <TeamLine fixture={fixture} team="team1" name={names.team1} />
        <span className="co-display co-cr-board-vs">vs</span>
        <TeamLine fixture={fixture} team="team2" name={names.team2} />
      </div>
      {fixture.status !== 'scheduled' && <p className="co-cr-result">{resultText(fixture, names)}</p>}
      <div className="co-fixture-meta">
        <StatusPill status={fixture.status} />
        {fixture.overs && (
          <span>
            {fixture.overs} overs · powerplay {fixture.powerplay_overs}
          </span>
        )}
        {fixture.toss?.winner && (
          <span>
            Toss: {names[fixture.toss.winner]}, chose to {fixture.toss.decision}
          </span>
        )}
        {fixture.scheduled_at && <span>{formatDateTime(fixture.scheduled_at)}</span>}
        {referees && <span>Referees: {referees}</span>}
      </div>
    </section>
  )
}

function TeamLine({ fixture, team, name }) {
  const superOvers = superOverScores(fixture, team)
  return (
    <div className={`co-cr-board-team${fixture.result === team ? ' is-winner' : ''}`}>
      <span className="co-display co-cr-board-name">{name}</span>
      <span className="co-cr-board-score">{teamScore(fixture, team) || '—'}</span>
      {superOvers.length > 0 && <span className="co-cr-board-super">Super over {superOvers.join(', ')}</span>}
    </div>
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
      <h2 className="co-display co-display-md">{resultText(fixture, names)}</h2>
      {fixture.result_type === 'abandoned' && (
        <p>
          <strong>Abandoned.</strong> {fixture.note}
        </p>
      )}
      <p className="co-muted co-small">This fixture is over. Only the admin can change it now.</p>
    </section>
  )
}

function AbandonFixture({ fixture, names, busy, run }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className="co-danger-zone">
        <button type="button" className="co-btn co-btn-danger co-btn-sm" onClick={() => setOpen(true)}>
          Abandon the match
        </button>
      </div>
    )
  }

  return (
    <section className="co-panel co-danger-panel">
      <h2 className="co-display co-display-md">Abandon the match</h2>
      <p className="co-muted co-small">Choose who gets the match, or no result. The fixture closes with your decision.</p>
      <DecisionForm
        names={names}
        busy={busy}
        drawOption={NO_RESULT}
        submitLabel="Abandon match"
        onCancel={() => setOpen(false)}
        onSubmit={({ decision, note }) =>
          run(() => api.decideFixture(fixture._id, { result_type: 'abandoned', result: decision, note }))
        }
      />
    </section>
  )
}
