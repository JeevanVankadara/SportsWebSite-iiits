import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Clock3, Users } from 'lucide-react'
import { coordinatorKabaddiApi as api, coordinatorPlayersApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import Toast from '../../../components/Toast.jsx'
import { coordinatorPath } from '../../../config.js'
import { useResource } from '../../../hooks/useResource.js'
import { fixtureResultText, houseName } from '../../../sports/kabaddi/format.js'
import LineupEditor from '../../../sports/kabaddi/LineupEditor.jsx'
import MatchConsole from '../../../sports/kabaddi/MatchConsole.jsx'
import RulesForm from '../../../sports/kabaddi/RulesForm.jsx'
import { formatDateTime } from '../../../utils/dates.js'
import DecisionForm from '../../components/DecisionForm.jsx'
import { CoError, Eyebrow, StatusPill } from '../../components/ui.jsx'

// A kabaddi fixture run by its referee: rules and lineups -> match, then read-only once it is over.
export default function KabaddiFixturePage() {
  const { fixtureId } = useParams()
  const { data: detail, setData, error, retry } = useResource(fixtureId, () => api.fixture(fixtureId))
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [selectedTab, setSelectedTab] = useState(null)

  // Runs one referee action. The server answers with the whole fixture, which replaces what is shown.
  // If the action clashed with a change made elsewhere (e.g. by the admin), the latest state is loaded.
  async function run(action) {
    setBusy(true)
    try {
      const res = await action()
      if (res) setData(res)
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
  
  const defaultTab = fixture.status === 'completed' ? 'play' : !fixture.lineup_locked_at ? 'setup' : 'play'
  const activeTab = selectedTab ?? defaultTab

  const panel = { fixture, names, api, busy, run }
  const lineups = (
    <LineupEditor
      key={fixture.updated_at}
      {...panel}
      searchPlayers={coordinatorPlayersApi.search}
      addGuest={(name) => coordinatorPlayersApi.addGuest('kabaddi', fixture._id, name).then(({ player }) => player)}
    />
  )
  const rules = <RulesForm key={fixture.updated_at} {...panel} />

  return (
    <>
      <Link to={coordinatorPath('games')} className="co-back">
        ← All games
      </Link>
      <FixtureHeader fixture={fixture} tournament={tournament} names={names} />
      <Steps activeTab={activeTab} onSelectTab={setSelectedTab} fixture={fixture} />

      {activeTab === 'setup' && (
        <div className="kb-co-setup-view">
          <section className="co-panel">
            <div className="kb-panel-head">
              <h2 className="co-display co-display-md">Lineups</h2>
              <span className="kb-muted" style={{ fontSize: '0.8125rem' }}>
                {fixture.lineup_locked_at ? 'Lineups locked · editable anytime' : 'Pick starters and substitutes'}
              </span>
            </div>
            {lineups}
          </section>

          <details className="co-panel co-manage" open={!fixture.lineup_locked_at}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>Match Rules & Configuration</summary>
            {rules}
          </details>
        </div>
      )}

      {activeTab === 'play' && (
        <div className="kb-co-play-view">
          {fixture.status === 'completed' && (
            <section className="co-panel co-finished">
              <h2 className="co-display co-display-md">{fixtureResultText(fixture, names.team1, names.team2)}</h2>
              {fixture.result_type === 'abandoned' && (
                <p>
                  <strong>Abandoned.</strong> {fixture.decision_note}
                </p>
              )}
              <p className="co-muted">This fixture is over. Only the admin can change it now.</p>
            </section>
          )}

          <MatchConsole detail={detail} {...panel} />
        </div>
      )}

      {fixture.status !== 'completed' && <AbandonFixture {...panel} />}

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}

function FixtureHeader({ fixture, tournament, names }) {
  const referees = fixture.referees?.map((referee) => referee.name).join(', ')
  const isStarted = fixture.status === 'live' || fixture.status === 'completed'

  return (
    <section className="co-fixture-hero kb-co-hero">
      <Eyebrow>§ Kabaddi · {tournament?.tournament_name}</Eyebrow>

      <div className="co-scoreboard kb-co-scoreboard">
        <span className={`co-display co-scoreboard-team kb-co-team ${fixture.result === 'team1' ? 'is-winner' : ''}`}>
          {names.team1}
        </span>

        <span className="co-scoreboard-score kb-co-score-box" aria-label={`Points: ${fixture.team1_score} to ${fixture.team2_score}`}>
          {isStarted ? (
            <>
              <span className="co-display kb-co-score-nums">
                {fixture.team1_score ?? 0}
                <span className="co-scoreboard-dash">–</span>
                {fixture.team2_score ?? 0}
              </span>
              <small>Points</small>
            </>
          ) : (
            <span className="co-display kb-co-vs-text">VS</span>
          )}
        </span>

        <span className={`co-display co-scoreboard-team kb-co-team ${fixture.result === 'team2' ? 'is-winner' : ''}`}>
          {names.team2}
        </span>
      </div>

      <div className="co-fixture-meta kb-co-meta">
        <div className="kb-co-meta-left">
          <StatusPill status={fixture.status} />
          {fixture.scheduled_at && (
            <span className="kb-co-meta-pill">
              <Clock3 size={14} />
              {formatDateTime(fixture.scheduled_at)}
            </span>
          )}
        </div>
        {referees && (
          <div className="kb-co-meta-right">
            <span className="kb-co-ref-pill" title="Assigned referees">
              <Users size={14} />
              <strong>Referees:</strong> {referees}
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

function Steps({ activeTab, onSelectTab, fixture }) {
  const isSetupDone = Boolean(fixture.lineup_locked_at)
  const isLive = fixture.status === 'live'
  const isDone = fixture.status === 'completed'

  return (
    <nav className="kb-co-nav" role="tablist" aria-label="Sections">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'setup'}
        className={`kb-co-nav-btn ${activeTab === 'setup' ? 'is-active' : ''} ${isSetupDone ? 'is-complete' : ''}`}
        onClick={() => onSelectTab('setup')}
      >
        <span className="kb-co-nav-num">{isSetupDone ? '✓' : '1'}</span>
        <div className="kb-co-nav-content">
          <span className="kb-co-nav-title">Rules & Lineups</span>
          <span className="kb-co-nav-desc">
            {isSetupDone ? 'Lineups locked · Click to edit' : 'Pick starters & bench players'}
          </span>
        </div>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'play'}
        className={`kb-co-nav-btn ${activeTab === 'play' ? 'is-active' : ''} ${isLive ? 'is-live' : isDone ? 'is-complete' : ''}`}
        onClick={() => onSelectTab('play')}
      >
        <span className="kb-co-nav-num">{isDone ? '✓' : '2'}</span>
        <div className="kb-co-nav-content">
          <span className="kb-co-nav-title">Match Scoring</span>
          <span className="kb-co-nav-desc">
            {isDone ? 'Match finished' : isLive ? 'Live match in progress' : 'Ready to start match'}
          </span>
        </div>
        {isLive && <span className="kb-co-live-pulse" title="Live match active" />}
      </button>
    </nav>
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
