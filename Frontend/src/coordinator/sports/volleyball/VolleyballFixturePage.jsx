import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { coordinatorVolleyballApi as api, coordinatorPlayersApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import Toast from '../../../components/Toast.jsx'
import { coordinatorPath } from '../../../config.js'
import { useResource } from '../../../hooks/useResource.js'
import { fixtureResultText, houseName } from '../../../sports/volleyball/format.js'
import LineupEditor from '../../../sports/volleyball/LineupEditor.jsx'
import RulesForm from '../../../sports/volleyball/RulesForm.jsx'
import VolleyballConsole from '../../../sports/volleyball/VolleyballConsole.jsx'
import { formatDateTime } from '../../../utils/dates.js'
import DecisionForm from '../../components/DecisionForm.jsx'
import { CoError, Eyebrow, StatusPill } from '../../components/ui.jsx'

const STEPS = [
  { key: 'setup', label: 'Rules and lineups' },
  { key: 'play', label: 'Match' },
]

// A volleyball fixture run by its referee: rules and lineups -> match, then read-only once it is over.
export default function VolleyballFixturePage() {
  const { fixtureId } = useParams()
  const { data: detail, setData, error, retry } = useResource(fixtureId, () => api.fixture(fixtureId))
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

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
  else if (!fixture.lineup_locked_at) step = 'setup'
  const panel = { fixture, names, api, busy, run }
  const lineups = (
    <LineupEditor
      key={fixture.updated_at}
      {...panel}
      searchPlayers={coordinatorPlayersApi.search}
      addGuest={(name) => coordinatorPlayersApi.addGuest('volleyball', fixture._id, name).then(({ player }) => player)}
    />
  )
  const rules = <RulesForm key={fixture.updated_at} {...panel} />

  return (
    <>
      <Link to={coordinatorPath('games')} className="co-back">
        ← All games
      </Link>
      <FixtureHeader fixture={fixture} tournament={tournament} names={names} />
      <Steps step={step} />

      {step === 'setup' && (
        <>
          <details className="co-panel co-manage">
            <summary>Match rules</summary>
            {rules}
          </details>
          <section className="co-panel">
            <h2 className="co-display co-display-md">Lineups</h2>
            {lineups}
          </section>
        </>
      )}

      {step === 'play' && (
        <>
          <VolleyballConsole detail={detail} {...panel} />
          <details className="co-panel co-manage">
            <summary>Correct the lineups</summary>
            {lineups}
          </details>
          <details className="co-panel co-manage">
            <summary>Match rules</summary>
            {rules}
          </details>
        </>
      )}

      {step === 'done' && (
        <>
          <section className="co-panel co-finished">
            <h2 className="co-display co-display-md">{fixtureResultText(fixture, names.team1, names.team2)}</h2>
            {fixture.result_type === 'abandoned' && (
              <p>
                <strong>Abandoned.</strong> {fixture.note}
              </p>
            )}
            <p className="co-muted">This fixture is over. Only the admin can change it now.</p>
          </section>
          <VolleyballConsole detail={detail} {...panel} readOnly />
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
      <Eyebrow>§ Volleyball · {tournament?.tournament_name}</Eyebrow>
      <h1 className="co-display co-display-md">
        {names.team1} <span className="co-muted">vs</span> {names.team2}
      </h1>
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
        Use this only if the match cannot continue (e.g. injury, weather or misconduct). Choose who gets the match; the
        fixture closes with your decision.
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
