import { useState } from 'react'
import { coordinatorCricketApi as api } from '../../../api/endpoints.js'
import {
  BALLS_PER_OVER,
  ballsLeft,
  completeText,
  inningsTitle,
  oversText,
  playerName,
  runRate,
  sameId,
  strikeRate,
  SUPER_OVER_WICKETS,
} from '../../../sports/cricket/format.js'
import { Eyebrow } from '../../components/ui.jsx'
import { ExtraSheet, WicketSheet } from './BallSheets.jsx'
import PlayerPicker from './PlayerPicker.jsx'

const RUNS = [0, 1, 2, 3, 4, 6]
const EXTRAS = [
  { kind: 'wide', label: 'Wide' },
  { kind: 'no_ball', label: 'No ball' },
  { kind: 'bye', label: 'Bye' },
  { kind: 'leg_bye', label: 'Leg bye' },
]

function chipClass(label) {
  if (label === 'W' || label.endsWith(' W')) return 'is-wicket'
  if (label.startsWith('wd') || label.startsWith('nb')) return 'is-extra'
  if (label === '4') return 'is-four'
  if (label === '6') return 'is-six'
  return ''
}

// The scoring screen for the innings in play. The server answers every tap with the whole fixture,
// so nothing here keeps its own count of runs or balls.
export default function LiveInnings({ inn, fixture, names, players, busy, run }) {
  const [sheet, setSheet] = useState(null)
  const superOver = inn.super_over > 0
  const reason = inn.complete_reason
  const needBatter = !reason && (!inn.striker || !inn.non_striker)
  const needBowler = !reason && !needBatter && !inn.bowler
  const inPowerplay = !superOver && !reason && Math.floor(inn.legal_balls / BALLS_PER_OVER) < inn.powerplay_overs
  const left = ballsLeft(inn)

  async function act(action) {
    if (await run(action)) setSheet(null)
  }
  const record = (ball) => act(() => api.ball(inn._id, { expected_balls: inn.ball_count, ...ball }))

  const battingSide = fixture[`${inn.batting_team}_players`]
  const bowlingSide = fixture[`${inn.bowling_team}_players`]
  const fielders = [
    ...bowlingSide,
    ...fixture[`${inn.bowling_team}_substitutes`].map((player) => ({ ...player, substitute: true })),
  ]
  const batted = new Set(inn.batting.map((row) => String(row.player)))
  const yetToBat = battingSide.filter((player) => !batted.has(player._id))

  let control
  if (reason) {
    control = <EndBanner inn={inn} busy={busy} onEnd={() => act(() => api.endInnings(inn._id))} />
  } else if (needBatter || sheet?.type === 'batter') {
    const end = sheet?.slot ?? (inn.striker ? 'non_striker' : 'striker')
    control = (
      <PlayerPicker
        title="New batter"
        hint={`Comes in at the ${end === 'striker' ? "striker's" : "non-striker's"} end.`}
        players={yetToBat}
        busy={busy}
        onPick={(player) => act(() => api.setBatter(inn._id, { player: player._id, slot: sheet?.slot }))}
        onCancel={needBatter ? null : () => setSheet(null)}
      />
    )
  } else if (needBowler || sheet?.type === 'bowler') {
    control = (
      <PlayerPicker
        title={`Bowler for over ${Math.floor(inn.legal_balls / BALLS_PER_OVER) + 1}`}
        players={bowlingSide}
        detail={(player) => bowlerLine(inn, player._id)}
        hint={inn.previous_bowler ? `${playerName(players, inn.previous_bowler)} bowled the last over, so cannot bowl this one.` : null}
        tag={(player) => (sameId(player._id, inn.previous_bowler) ? 'Bowled last over' : null)}
        blocked={(player) => sameId(player._id, inn.previous_bowler)}
        current={inn.bowler}
        busy={busy}
        onPick={(player) => act(() => api.setBowler(inn._id, { player: player._id }))}
        onCancel={needBowler ? null : () => setSheet(null)}
      />
    )
  } else if (sheet?.type === 'wicket') {
    control = (
      <WicketSheet
        inn={inn}
        fielders={fielders}
        players={players}
        busy={busy}
        onRecord={record}
        onCancel={() => setSheet(null)}
      />
    )
  } else if (sheet) {
    control = (
      <ExtraSheet
        key={sheet.type}
        kind={sheet.type}
        inn={inn}
        fielders={fielders}
        players={players}
        busy={busy}
        onRecord={record}
        onCancel={() => setSheet(null)}
      />
    )
  } else {
    control = <ScoringPad busy={busy} onRuns={(runs) => record({ kind: 'run', runs })} onOpen={(type) => setSheet({ type })} />
  }

  return (
    <section className={`co-panel co-cr-live${superOver ? ' is-super' : ''}`} aria-label={`${inningsTitle(inn)} in play`}>
      <header className="co-cr-live-head">
        <div>
          <Eyebrow>§ {inningsTitle(inn)}</Eyebrow>
          <h2 className="co-display co-cr-live-team">{names[inn.batting_team]}</h2>
        </div>
        <div className="co-cr-badges">
          {inPowerplay && <span className="co-cr-badge">Powerplay</span>}
          {inn.free_hit && !reason && <span className="co-cr-badge is-hot">Free hit</span>}
        </div>
      </header>

      <div className="co-cr-scoreline">
        <span className="co-display co-cr-total" aria-live="polite">
          {inn.runs}/{inn.wickets}
        </span>
        <span className="co-cr-overs">
          {oversText(inn.legal_balls)} / {inn.overs} ov
        </span>
        {!superOver && <span className="co-cr-overs">CRR {runRate(inn.runs, inn.legal_balls)}</span>}
      </div>
      {superOver && (
        <p className="co-cr-strip is-super">
          Wickets {inn.wickets} of {SUPER_OVER_WICKETS} · {left} ball{left === 1 ? '' : 's'} left
        </p>
      )}
      {inn.target != null && (
        <p className="co-cr-strip">
          Target {inn.target} · need {Math.max(0, inn.target - inn.runs)} from {left} ball{left === 1 ? '' : 's'}
          {!superOver && left > 0 && ` · RRR ${runRate(Math.max(0, inn.target - inn.runs), left)}`}
        </p>
      )}

      <div className="co-cr-scroll">
        <table className="co-cr-table">
          <thead>
            <tr>
              <th scope="col" className="co-cr-name">
                Batter
              </th>
              <th scope="col">R</th>
              <th scope="col">B</th>
              <th scope="col">4s</th>
              <th scope="col">6s</th>
              <th scope="col">SR</th>
            </tr>
          </thead>
          <tbody>
            {['striker', 'non_striker'].map((slot) => (
              <BatterRow
                key={slot}
                slot={slot}
                id={inn[slot]}
                inn={inn}
                players={players}
                canChange={!reason && !busy}
                onChange={() => setSheet({ type: 'batter', slot })}
              />
            ))}
          </tbody>
        </table>
        <table className="co-cr-table">
          <thead>
            <tr>
              <th scope="col" className="co-cr-name">
                Bowler
              </th>
              <th scope="col">O</th>
              <th scope="col">M</th>
              <th scope="col">R</th>
              <th scope="col">W</th>
              <th scope="col">Econ</th>
            </tr>
          </thead>
          <tbody>
            <BowlerRow inn={inn} players={players} />
          </tbody>
        </table>
      </div>

      <div className="co-cr-over">
        <span className="co-label">Over {inn.this_over_no}</span>
        {inn.this_over.length === 0 ? (
          <span className="co-muted co-small">No balls yet</span>
        ) : (
          <ol className="co-cr-chips">
            {inn.this_over.map((label, index) => (
              <li key={index} className={`co-cr-chip ${chipClass(label)}`}>
                {label}
              </li>
            ))}
          </ol>
        )}
      </div>

      {control}

      <div className="co-cr-tools">
        <button
          type="button"
          className="co-btn co-btn-ghost co-btn-sm"
          disabled={busy || inn.undo_left === 0 || inn.ball_count === 0}
          onClick={() => act(() => api.undo(inn._id, { expected_balls: inn.ball_count }))}
        >
          ↶ Undo ball ({inn.undo_left})
        </button>
        {!reason && inn.striker && inn.non_striker && (
          <button
            type="button"
            className="co-btn co-btn-ghost co-btn-sm"
            disabled={busy}
            onClick={() => act(() => api.swapStrike(inn._id))}
          >
            ⇄ Swap strike
          </button>
        )}
        {!reason && inn.bowler && !sheet && (
          <button
            type="button"
            className="co-btn co-btn-ghost co-btn-sm"
            disabled={busy}
            onClick={() => setSheet({ type: 'bowler' })}
          >
            Change bowler
          </button>
        )}
      </div>
    </section>
  )
}

function bowlerLine(inn, id) {
  const row = inn.bowling.find((item) => sameId(item.player, id))
  if (!row || (row.balls === 0 && row.runs === 0)) return 'Not bowled yet'
  return `${oversText(row.balls)} ov · ${row.runs} runs · ${row.wickets} wkt`
}

function BatterRow({ slot, id, inn, players, canChange, onChange }) {
  if (!id) {
    return (
      <tr>
        <th scope="row" className="co-cr-name co-muted" colSpan={6}>
          Waiting for the new batter
        </th>
      </tr>
    )
  }
  const row = inn.batting.find((item) => sameId(item.player, id))
  return (
    <tr>
      <th scope="row" className="co-cr-name">
        {slot === 'striker' && <span className="co-cr-strike">★ </span>}
        {playerName(players, id)}
        {canChange && row?.balls === 0 && (
          <button type="button" className="co-cr-link" onClick={onChange}>
            change
          </button>
        )}
      </th>
      <td className="co-cr-strong">{row?.runs ?? 0}</td>
      <td>{row?.balls ?? 0}</td>
      <td>{row?.fours ?? 0}</td>
      <td>{row?.sixes ?? 0}</td>
      <td>{strikeRate(row?.runs ?? 0, row?.balls ?? 0)}</td>
    </tr>
  )
}

function BowlerRow({ inn, players }) {
  if (!inn.bowler) {
    return (
      <tr>
        <th scope="row" className="co-cr-name co-muted" colSpan={6}>
          Pick the bowler
        </th>
      </tr>
    )
  }
  const row = inn.bowling.find((item) => sameId(item.player, inn.bowler))
  return (
    <tr>
      <th scope="row" className="co-cr-name">
        {playerName(players, inn.bowler)}
      </th>
      <td>{oversText(row?.balls ?? 0)}</td>
      <td>{row?.maidens ?? 0}</td>
      <td>{row?.runs ?? 0}</td>
      <td className="co-cr-strong">{row?.wickets ?? 0}</td>
      <td>{runRate(row?.runs ?? 0, row?.balls ?? 0)}</td>
    </tr>
  )
}

function ScoringPad({ busy, onRuns, onOpen }) {
  return (
    <div className="co-cr-pad">
      <div className="co-cr-keys">
        {RUNS.map((runs) => (
          <button
            key={runs}
            type="button"
            className={`co-cr-key${runs >= 4 ? ' is-boundary' : ''}`}
            disabled={busy}
            onClick={() => onRuns(runs)}
            aria-label={`${runs} run${runs === 1 ? '' : 's'}`}
          >
            {runs}
          </button>
        ))}
      </div>
      <div className="co-cr-keys is-extras">
        {EXTRAS.map((extra) => (
          <button
            key={extra.kind}
            type="button"
            className="co-cr-key is-extra"
            disabled={busy}
            onClick={() => onOpen(extra.kind)}
          >
            {extra.label}
          </button>
        ))}
      </div>
      <button type="button" className="co-cr-key is-wicket" disabled={busy} onClick={() => onOpen('wicket')}>
        Wicket
      </button>
    </div>
  )
}

function EndBanner({ inn, busy, onEnd }) {
  let label = 'End innings'
  if (inn.innings_no % 2 === 0) label = inn.super_over > 0 ? 'Finish super over' : 'Finish match'
  return (
    <>
      <div className="co-banner" role="status">
        <p className="co-display">{completeText(inn)}</p>
        <button type="button" className="co-btn co-btn-primary" disabled={busy} onClick={onEnd}>
          {label}
        </button>
      </div>
      <p className="co-muted co-small">Last ball wrong? Undo it before you end the innings.</p>
    </>
  )
}
