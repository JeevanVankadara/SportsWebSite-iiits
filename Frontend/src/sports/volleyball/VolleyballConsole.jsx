import { useState } from 'react'
import { configOf, describeSub, lineupPlayers, MATCH_SETS, setsToWin, setWinner, TEAMS } from './format.js'
import { formatPlayerName } from '../../utils/names.js'
import './volleyball.css'

// The live match, shared by the referee (co-ordinator) and the admin's read-only view.
// The server sends the fixture (sets + events) and the replayed state (who is on court / on the bench),
// so this only shows it and sends actions.
export default function VolleyballConsole({ detail, names, api, busy, run, readOnly = false }) {
  const { fixture, state } = detail
  const players = lineupPlayers(fixture)
  const over = fixture.status === 'completed'
  const started = fixture.status !== 'scheduled' && fixture.sets.length > 0
  const liveSet = fixture.sets.find((set) => set.status === 'live')
  const shared = { fixture, state, names, players, api, busy, run }

  return (
    <div className="vb">
      <Scoreboard fixture={fixture} names={names} liveSet={liveSet} />

      {!readOnly && !started && !over && (
        <section className="vb-panel">
          <h3 className="vb-title">Start the match</h3>
          {fixture.lineup_locked_at ? (
            <div className="vb-row">
              <button type="button" className="vb-btn vb-btn-primary vb-btn-lg" disabled={busy} onClick={() => run(() => api.startMatch(fixture._id))}>
                Start set 1
              </button>
            </div>
          ) : (
            <p className="vb-hint">Submit both lineups before starting.</p>
          )}
        </section>
      )}

      {!readOnly && liveSet && !over && <ScoringPad {...shared} liveSet={liveSet} />}

      {started && <SetScores fixture={fixture} names={names} editable={!readOnly && !over} busy={busy} run={run} api={api} />}

      {!readOnly && liveSet && !over && <SubstitutionPanel {...shared} liveSet={liveSet} />}

      {started && <Court state={state} names={names} players={players} />}
      {started && <SubLog fixture={fixture} names={names} players={players} />}
    </div>
  )
}

function Scoreboard({ fixture, names, liveSet }) {
  const status =
    fixture.status === 'completed' ? 'Full time' : liveSet ? `Set ${liveSet.set_no} of ${MATCH_SETS}` : 'Not started'
  return (
    <section className="vb-board" aria-label="Score">
      {TEAMS.map((team, index) => (
        <div key={team} className={`vb-board-team${index === 1 ? ' is-right' : ''}`}>
          <span className="vb-board-name">{names[team]}</span>
          <span className="vb-board-score">{fixture[`${team}_sets_won`] ?? 0}</span>
          {liveSet && <span className="vb-board-sub">{liveSet[`${team}_points`]} in this set</span>}
        </div>
      ))}
      <div className="vb-board-mid">
        <span className="vb-board-set">Sets</span>
        <span className="vb-board-status">{status}</span>
      </div>
    </section>
  )
}

function ScoringPad({ fixture, names, liveSet, busy, run, api }) {
  const config = configOf(fixture)
  const score = { team1: liveSet.team1_points, team2: liveSet.team2_points }
  const setWon = setWinner(score.team1, score.team2, config.points_to_win, config.point_cap)
  const matchWon = setWon && (fixture[`${setWon}_sets_won`] ?? 0) + 1 >= setsToWin() ? setWon : null

  const tap = (team, change) =>
    run(() => api.score(fixture._id, { team, change, expected: { team1_points: score.team1, team2_points: score.team2 } }))

  return (
    <section className="vb-panel" aria-label={`Set ${liveSet.set_no} in play`}>
      <div className="vb-court-sides">
        {TEAMS.map((team) => (
          <div key={team} className={`vb-side${setWon === team ? ' is-leading' : ''}`}>
            <p className="vb-side-name">{names[team]}</p>
            <p className="vb-side-score" aria-live="polite">
              {score[team]}
            </p>
            <div className="vb-side-controls">
              <button
                type="button"
                className="vb-score-btn is-minus"
                onClick={() => tap(team, -1)}
                disabled={busy || score[team] === 0}
                aria-label={`Take a point back from ${names[team]}`}
              >
                −
              </button>
              <button
                type="button"
                className="vb-score-btn is-plus"
                onClick={() => tap(team, 1)}
                disabled={busy || Boolean(setWon)}
                aria-label={`Point to ${names[team]}`}
              >
                +
              </button>
            </div>
            <p className="vb-side-sets">
              Sets won <strong>{fixture[`${team}_sets_won`] ?? 0}</strong>
            </p>
          </div>
        ))}
      </div>

      {setWon && (
        <div className="vb-banner" role="status">
          <p>{matchWon ? `${names[matchWon]} wins the match` : `${names[setWon]} wins set ${liveSet.set_no}`}</p>
          <button
            type="button"
            className="vb-btn vb-btn-primary vb-btn-lg"
            disabled={busy}
            onClick={() => run(() => (matchWon ? api.finishMatch(fixture._id) : api.nextSet(fixture._id)))}
          >
            {matchWon ? 'Finish match' : 'Next set'}
          </button>
        </div>
      )}

      <p className="vb-hint">Point given by mistake? Use − or edit (✎) the set score below.</p>
    </section>
  )
}

function SetScores({ fixture, names, editable, busy, run, api }) {
  const [editingId, setEditingId] = useState(null)
  const editing = fixture.sets.find((set) => String(set._id) === editingId)

  async function save(score) {
    if (await run(() => api.editSet(fixture._id, editing._id, score))) setEditingId(null)
  }

  return (
    <section className="vb-panel vb-sets">
      <h3 className="vb-title">Set scores</h3>
      <ol className="vb-set-chips" aria-label="Set scores">
        {fixture.sets.map((set) => (
          <li key={set._id} className={`vb-set-chip${set.status === 'live' ? ' is-live' : ''}`}>
            <span className="vb-set-no">S{set.set_no}</span>
            <span className={set.winner === 'team1' ? 'is-winner' : ''}>{set.team1_points}</span>
            <span aria-hidden="true">–</span>
            <span className={set.winner === 'team2' ? 'is-winner' : ''}>{set.team2_points}</span>
            {editable && (
              <button
                type="button"
                className="vb-edit-btn"
                onClick={() => setEditingId(String(set._id))}
                disabled={busy}
                aria-label={`Edit the score of set ${set.set_no}`}
              >
                ✎
              </button>
            )}
          </li>
        ))}
      </ol>
      {editing && (
        <SetScoreEditor key={editing._id} set={editing} names={names} busy={busy} onSave={save} onCancel={() => setEditingId(null)} />
      )}
    </section>
  )
}

function SetScoreEditor({ set, names, busy, onSave, onCancel }) {
  const [team1, setTeam1] = useState(String(set.team1_points))
  const [team2, setTeam2] = useState(String(set.team2_points))
  const digits = (value) => value.replace(/\D/g, '').slice(0, 2)

  return (
    <form
      className="vb-set-editor"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({ team1_points: Number(team1), team2_points: Number(team2) })
      }}
    >
      <p className="vb-step">Correct the score of set {set.set_no}</p>
      <div className="vb-set-editor-fields">
        <label className="vb-field">
          <span>{names.team1}</span>
          <input className="vb-input" inputMode="numeric" value={team1} onChange={(event) => setTeam1(digits(event.target.value))} required autoFocus />
        </label>
        <span className="vb-set-editor-dash" aria-hidden="true">
          –
        </span>
        <label className="vb-field">
          <span>{names.team2}</span>
          <input className="vb-input" inputMode="numeric" value={team2} onChange={(event) => setTeam2(digits(event.target.value))} required />
        </label>
      </div>
      <div className="vb-row">
        <button type="submit" className="vb-btn vb-btn-primary" disabled={busy}>
          Save score
        </button>
        <button type="button" className="vb-btn vb-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function SubstitutionPanel({ fixture, state, names, players, busy, run, api }) {
  const [team, setTeam] = useState('team1')
  const [playerOut, setPlayerOut] = useState('')
  const [playerIn, setPlayerIn] = useState('')
  const side = state.sides[team]
  const lastEvent = fixture.events.at(-1)

  function submit(event) {
    event.preventDefault()
    run(() => api.substitute(fixture._id, { team, player_out: playerOut, player_in: playerIn })).then((ok) => {
      if (ok) {
        setPlayerOut('')
        setPlayerIn('')
      }
    })
  }

  function undo() {
    if (!lastEvent) return
    if (window.confirm(`Undo the latest substitution?\n\n${describeSub(lastEvent, players)}`)) run(() => api.undo(fixture._id))
  }

  return (
    <section className="vb-panel">
      <div className="vb-panel-head">
        <h3 className="vb-title">Substitution</h3>
        <button type="button" className="vb-btn vb-btn-danger vb-btn" disabled={busy || !lastEvent} onClick={undo}>
          Undo last
        </button>
      </div>
      <form className="vb-form" onSubmit={submit}>
        <div className="vb-seg" role="group" aria-label="House">
          {TEAMS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={team === item}
              onClick={() => {
                setTeam(item)
                setPlayerOut('')
                setPlayerIn('')
              }}
            >
              {names[item]}
            </button>
          ))}
        </div>
        <div className="vb-grid">
          <label className="vb-field">
            <span>Going off</span>
            <select className="vb-input" value={playerOut} onChange={(event) => setPlayerOut(event.target.value)} required>
              <option value="">Pick a player on court</option>
              {side.on_court.map((id) => (
                <option key={id} value={id}>
                  {players.get(id)?.name ?? 'Unknown'}
                </option>
              ))}
            </select>
          </label>
          <label className="vb-field">
            <span>Coming on</span>
            <select className="vb-input" value={playerIn} onChange={(event) => setPlayerIn(event.target.value)} required>
              <option value="">{side.bench.length ? 'Pick a substitute' : 'No substitutes on the bench'}</option>
              {side.bench.map((id) => (
                <option key={id} value={id}>
                  {players.get(id)?.name ?? 'Unknown'}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="vb-row">
          <button type="submit" className="vb-btn vb-btn-primary" disabled={busy || !playerOut || !playerIn}>
            Record substitution
          </button>
        </div>
      </form>
    </section>
  )
}

function Court({ state, names, players }) {
  return (
    <section className="vb-court">
      {TEAMS.map((team) => {
        const side = state.sides[team]
        return (
          <div key={team} className="vb-panel">
            <h3 className="vb-title">{names[team]}</h3>
            <p className="vb-step">On court ({side.on_court.length})</p>
            {side.on_court.length === 0 ? (
              <p className="vb-hint">Nobody on court</p>
            ) : (
              <div className="vb-chips">
                {side.on_court.map((id) => (
                  <span key={id} className="vb-chip vb-chip-static">
                    {formatPlayerName(players.get(id)?.name) || 'Unknown'}
                  </span>
                ))}
              </div>
            )}
            <p className="vb-step">Bench ({side.bench.length})</p>
            {side.bench.length === 0 ? (
              <p className="vb-hint">Nobody on the bench</p>
            ) : (
              <div className="vb-chips">
                {side.bench.map((id) => (
                  <span key={id} className="vb-chip vb-chip-static">
                    {formatPlayerName(players.get(id)?.name) || 'Unknown'}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}

function SubLog({ fixture, names, players }) {
  const rows = fixture.events.map((event, index) => ({ event, number: index + 1 })).reverse()
  return (
    <section className="vb-panel">
      <h3 className="vb-title">Substitutions</h3>
      {rows.length === 0 ? (
        <p className="vb-hint">No substitutions yet.</p>
      ) : (
        <ol className="vb-log">
          {rows.map(({ event, number }) => (
            <li key={event._id || number} className="vb-log-row">
              <span className="vb-log-no">{number}</span>
              <span className="vb-tag">Sub</span>
              <span className="vb-log-text">
                <strong>{names[event.team]}</strong> {describeSub(event, players)}
              </span>
              <span className="vb-log-set">{event.set_no ? `Set ${event.set_no}` : ''}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
