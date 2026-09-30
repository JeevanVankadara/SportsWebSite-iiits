import { useState } from 'react'
import {
  allowedDismissals,
  DISMISSAL_LABELS,
  FIELDER_DISMISSALS,
  playerName,
} from '../../../sports/cricket/format.js'

const EXTRA_OPTIONS = {
  wide: {
    title: 'Wide',
    runs: [0, 1, 2, 3, 4],
    label: (runs) => (runs ? `Wd+${runs}` : 'Wd'),
    hint: 'A wide is 1 run. Add the runs the batters took, or 4 for a boundary.',
  },
  no_ball: {
    title: 'No ball',
    runs: [0, 1, 2, 3, 4, 6],
    label: (runs) => (runs ? `NB+${runs}` : 'NB'),
    hint: 'A no ball is 1 run, and the next ball is a free hit.',
  },
  bye: {
    title: 'Byes',
    runs: [1, 2, 3, 4],
    label: String,
    hint: 'Byes go to the extras, not to the batter or the bowler.',
  },
  leg_bye: {
    title: 'Leg byes',
    runs: [1, 2, 3, 4],
    label: String,
    hint: 'Leg byes go to the extras, not to the batter or the bowler.',
  },
}

const NB_RUNS_AS = [
  { value: 'bat', label: 'Off the bat' },
  { value: 'bye', label: 'Byes' },
  { value: 'leg_bye', label: 'Leg byes' },
]

const RUN_OUT_RUNS = [0, 1, 2, 3]

function toWicket({ kind, player_out: playerOut, fielder }) {
  return {
    kind,
    player_out: kind === 'run_out' ? playerOut : undefined,
    fielder: FIELDER_DISMISSALS.includes(kind) && fielder ? fielder : null,
  }
}

// Wide, no ball, bye or leg bye with the runs on it, and a wicket if one fell on the same ball.
export function ExtraSheet({ kind, inn, fielders, players, busy, onRecord, onCancel }) {
  const option = EXTRA_OPTIONS[kind]
  const kinds = allowedDismissals(kind, inn.free_hit)
  const [nbRunsAs, setNbRunsAs] = useState('bat')
  const [out, setOut] = useState(false)
  const [wicket, setWicket] = useState({ kind: kinds[0], player_out: '', fielder: '' })
  const ready = !out || wicket.kind !== 'run_out' || wicket.player_out

  function pick(runs) {
    onRecord({
      kind,
      runs,
      nb_runs_as: kind === 'no_ball' ? nbRunsAs : undefined,
      wicket: out ? toWicket(wicket) : null,
    })
  }

  return (
    <div className="co-cr-sheet">
      <div className="co-cr-sheet-head">
        <p className="co-display">{option.title}</p>
        <button type="button" className="co-btn co-btn-ghost co-btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <p className="co-muted co-small">{option.hint}</p>

      {kind === 'no_ball' && (
        <fieldset className="co-field">
          <legend className="co-label">Runs were</legend>
          <div className="co-cr-choices">
            {NB_RUNS_AS.map((item) => (
              <label key={item.value} className="co-cr-choice">
                <input
                  type="radio"
                  name="nb-runs-as"
                  value={item.value}
                  checked={nbRunsAs === item.value}
                  onChange={() => setNbRunsAs(item.value)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="co-cr-check">
        <input type="checkbox" checked={out} onChange={(event) => setOut(event.target.checked)} />
        Batter out on this ball
      </label>
      {out && (
        <WicketFields kinds={kinds} value={wicket} onChange={setWicket} inn={inn} fielders={fielders} players={players} />
      )}

      <p className="co-label">Tap the runs to record</p>
      <div className="co-cr-keys">
        {option.runs.map((runs) => (
          <button
            key={runs}
            type="button"
            className="co-cr-key is-extra"
            disabled={busy || !ready}
            onClick={() => pick(runs)}
          >
            {option.label(runs)}
          </button>
        ))}
      </div>
    </div>
  )
}

// A wicket on a fair delivery. On a free hit only a run out is allowed.
export function WicketSheet({ inn, fielders, players, busy, onRecord, onCancel }) {
  const kinds = allowedDismissals('run', inn.free_hit)
  const [wicket, setWicket] = useState({ kind: kinds[0], player_out: '', fielder: '' })
  const [runs, setRuns] = useState(0)
  const runOut = wicket.kind === 'run_out'
  const ready = !runOut || wicket.player_out

  return (
    <div className="co-cr-sheet is-wicket">
      <div className="co-cr-sheet-head">
        <p className="co-display">Wicket</p>
        <button type="button" className="co-btn co-btn-ghost co-btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {inn.free_hit && <p className="co-cr-strip">Free hit: the batter can only be run out.</p>}

      <WicketFields kinds={kinds} value={wicket} onChange={setWicket} inn={inn} fielders={fielders} players={players} />

      {runOut && (
        <fieldset className="co-field">
          <legend className="co-label">Runs completed before the run out</legend>
          <div className="co-cr-choices">
            {RUN_OUT_RUNS.map((value) => (
              <label key={value} className="co-cr-choice">
                <input
                  type="radio"
                  name="run-out-runs"
                  value={value}
                  checked={runs === value}
                  onChange={() => setRuns(value)}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="co-actions">
        <button
          type="button"
          className="co-btn co-btn-danger-solid"
          disabled={busy || !ready}
          onClick={() => onRecord({ kind: 'run', runs: runOut ? runs : 0, wicket: toWicket(wicket) })}
        >
          Record wicket
        </button>
      </div>
    </div>
  )
}

function WicketFields({ kinds, value, onChange, inn, fielders, players }) {
  const set = (field, next) => onChange({ ...value, [field]: next })
  return (
    <>
      <fieldset className="co-field">
        <legend className="co-label">How out</legend>
        <div className="co-cr-choices">
          {kinds.map((kind) => (
            <label key={kind} className="co-cr-choice">
              <input
                type="radio"
                name="wicket-kind"
                value={kind}
                checked={value.kind === kind}
                onChange={() => set('kind', kind)}
              />
              <span>{DISMISSAL_LABELS[kind]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {value.kind === 'run_out' && (
        <fieldset className="co-field">
          <legend className="co-label">Who is out</legend>
          <div className="co-cr-choices">
            {[inn.striker, inn.non_striker].map((id) => (
              <label key={id} className="co-cr-choice">
                <input
                  type="radio"
                  name="player-out"
                  value={id}
                  checked={value.player_out === id}
                  onChange={() => set('player_out', id)}
                />
                <span>{playerName(players, id)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {FIELDER_DISMISSALS.includes(value.kind) && (
        <label className="co-field">
          <span className="co-label">{value.kind === 'stumped' ? 'Wicket-keeper' : 'Fielder'} (optional)</span>
          <select className="co-input" value={value.fielder} onChange={(event) => set('fielder', event.target.value)}>
            <option value="">Not recorded</option>
            {fielders.map((player) => (
              <option key={player._id} value={player._id}>
                {player.name}
                {player.substitute ? ' (sub)' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}
