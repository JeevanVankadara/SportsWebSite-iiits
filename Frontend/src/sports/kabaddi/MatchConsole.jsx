import { useEffect, useRef, useState } from 'react'
import {
  configOf,
  describeEvent,
  EVENT_LABELS,
  eventBadge,
  formatClock,
  lineupPlayers,
  otherTeam,
  PERIOD_LABELS,
  remainingSeconds,
  TEAMS,
} from './format.js'
import './kabaddi.css'

// How many of the most recent actions the referee may undo before a new action is recorded.
const UNDO_STEPS = 2

// The live scoring screen. The server replays the events and sends the match state (who is on court,
// who is out, whose raid is next), so this only shows it and sends actions.
//
// The referee runs the whole match here. The admin passes readOnly to watch the score, court and log
// without changing anything (they manage the fixture and the final decision elsewhere).
export default function MatchConsole({ detail, names, api, busy, run, readOnly = false }) {
  const { fixture, state } = detail
  const period = fixture.clock?.period ?? 'not_started'
  const playing = period === 'first_half' || period === 'second_half'
  const started = period !== 'not_started'
  const over = fixture.status === 'completed'
  const players = lineupPlayers(fixture)

  // Bounded undo: the referee can reverse at most the last two actions. Recording a new action
  // (the event count goes up) refills the budget; each undo spends one.
  const eventCount = fixture.events.length
  const prevCount = useRef(eventCount)
  const [undosLeft, setUndosLeft] = useState(UNDO_STEPS)
  useEffect(() => {
    if (eventCount > prevCount.current) setUndosLeft(UNDO_STEPS)
    prevCount.current = eventCount
  }, [eventCount])

  async function handleUndo() {
    const ok = await run(() => api.undo(fixture._id))
    if (ok) setUndosLeft((left) => Math.max(0, left - 1))
  }

  const shared = { fixture, state, names, players, api, busy, run }

  if (readOnly) {
    return (
      <div className="kb">
        <Scoreboard {...shared} />
        {started && <OnTheMat state={state} />}
        {started && <EventLog {...shared} />}
      </div>
    )
  }

  return (
    <div className="kb">
      <Scoreboard {...shared} />
      {started && <OnTheMat state={state} />}
      {!over && <ClockBar {...shared} />}
      {playing && !over && <RaidPad key={`${period}-${state.timeline.length}`} {...shared} />}
      {started && !over && (
        <OtherActions key={state.timeline.length} {...shared} undosLeft={undosLeft} onUndo={handleUndo} />
      )}
      {started && <EventLog {...shared} />}
    </div>
  )
}

export function OnTheMat({ state }) {
  const team1Count = Math.max(0, Math.min(7, state?.sides?.team1?.on_mat_count ?? state?.sides?.team1?.on_court?.length ?? 7))
  const team2Count = Math.max(0, Math.min(7, state?.sides?.team2?.on_mat_count ?? state?.sides?.team2?.on_court?.length ?? 7))

  return (
    <div className="kb-on-mat-card">
      <span className="kb-on-mat-title">On the mat</span>
      <div className="kb-on-mat-display">
        <div className="kb-mat-dots" aria-label={`Team 1 has ${team1Count} of 7 on mat`}>
          {Array.from({ length: 7 }).map((_, i) => {
            const isFilled = i < team1Count
            return (
              <span
                key={i}
                className={`kb-mat-dot kb-dot-team1 ${isFilled ? 'is-filled' : 'is-empty'}`}
                title={isFilled ? 'On mat' : 'Out'}
              />
            )
          })}
        </div>

        <div className="kb-mat-court-icon" title="Kabaddi Mat">
          <svg width="34" height="22" viewBox="0 0 34 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="32" height="20" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <line x1="17" y1="1" x2="17" y2="21" stroke="currentColor" strokeWidth="1.6" />
            <line x1="1" y1="11" x2="33" y2="11" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="9" y1="1" x2="9" y2="21" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="25" y1="1" x2="25" y2="21" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
          </svg>
        </div>

        <div className="kb-mat-dots" aria-label={`Team 2 has ${team2Count} of 7 on mat`}>
          {Array.from({ length: 7 }).map((_, i) => {
            const isFilled = i < team2Count
            return (
              <span
                key={i}
                className={`kb-mat-dot kb-dot-team2 ${isFilled ? 'is-filled' : 'is-empty'}`}
                title={isFilled ? 'On mat' : 'Out'}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Scoreboard({ fixture, state, names }) {
  const [now, setNow] = useState(() => Date.now())
  const running = Boolean(fixture.clock?.is_running)

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])

  const period = fixture.clock?.period ?? 'not_started'
  const showClock = period === 'first_half' || period === 'second_half'

  return (
    <section className="kb-board" aria-label="Score">
      {TEAMS.map((team, index) => {
        const onMat = state.sides[team]?.on_mat_count ?? state.sides[team]?.on_court?.length ?? 7
        const outCount = Math.max(0, 7 - onMat)
        return (
          <div key={team} className={`kb-board-team${index === 1 ? ' is-right' : ''}`}>
            <span className="kb-board-name">{names[team]}</span>
            <span className="kb-board-score">{state.score[team]}</span>
            {period !== 'not_started' && (
              <span className="kb-board-sub">
                {onMat} on mat · {outCount} out
              </span>
            )}
          </div>
        )
      })}
      <div className="kb-board-mid">
        {showClock && <span className="kb-clock">{formatClock(remainingSeconds(fixture, now))}</span>}
        <span className="kb-period">
          {PERIOD_LABELS[period] ?? period}
          {showClock && !running && ' · paused'}
        </span>
      </div>
    </section>
  )
}

function ClockBar({ fixture, names, api, busy, run }) {
  const [editingTime, setEditingTime] = useState(false)
  const [time, setTime] = useState('')
  const clock = fixture.clock ?? {}
  const period = clock.period ?? 'not_started'
  const playing = period === 'first_half' || period === 'second_half'
  const action = (body) => run(() => api.clock(fixture._id, body))

  if (period === 'not_started') {
    const ready = Boolean(fixture.lineup_locked_at)
    return (
      <section className="kb-panel">
        <h3 className="kb-title">Start the match</h3>
        <p className="kb-hint">Who raids first? The other house opens the second half.</p>
        <div className="kb-seg" role="group" aria-label="First raid">
          {TEAMS.map((team) => (
            <button
              key={team}
              type="button"
              aria-pressed={fixture.first_raid === team}
              disabled={busy}
              onClick={() => run(() => api.firstRaid(fixture._id, { first_raid: team }))}
            >
              {names[team]}
            </button>
          ))}
        </div>
        {!ready && <p className="kb-hint kb-warn-text">Submit both lineups before starting.</p>}
        <div className="kb-row">
          <button
            type="button"
            className="kb-btn kb-btn-primary"
            disabled={busy || !ready || !fixture.first_raid}
            onClick={() => action({ action: 'start' })}
          >
            Start 1st half
          </button>
        </div>
      </section>
    )
  }

  function saveTime(event) {
    event.preventDefault()
    const [minutes, seconds = '0'] = time.split(':')
    const total = Number(minutes) * 60 + Number(seconds)
    if (!Number.isFinite(total)) return
    action({ action: 'set_time', remaining_seconds: Math.round(total) }).then((ok) => ok && setEditingTime(false))
  }

  return (
    <section className="kb-panel kb-clockbar">
      <div className="kb-row">
        {playing && clock.is_running && (
          <button type="button" className="kb-btn" disabled={busy} onClick={() => action({ action: 'pause' })}>
            Pause
          </button>
        )}
        {playing && !clock.is_running && (
          <button type="button" className="kb-btn kb-btn-primary" disabled={busy} onClick={() => action({ action: 'resume' })}>
            Resume
          </button>
        )}
        {period === 'first_half' && (
          <button type="button" className="kb-btn" disabled={busy} onClick={() => action({ action: 'next_period' })}>
            End 1st half
          </button>
        )}
        {period === 'half_time' && (
          <button type="button" className="kb-btn kb-btn-primary" disabled={busy} onClick={() => action({ action: 'next_period' })}>
            Start 2nd half
          </button>
        )}
        {period === 'second_half' && (
          <button
            type="button"
            className="kb-btn"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Finish the match? The score decides the result.')) run(() => api.finish(fixture._id))
            }}
          >
            Finish match
          </button>
        )}
        {playing && (
          <button type="button" className="kb-btn kb-btn-ghost" onClick={() => setEditingTime((open) => !open)}>
            Set time
          </button>
        )}
      </div>
      {editingTime && (
        <form className="kb-row" onSubmit={saveTime}>
          <input
            className="kb-input kb-input-sm"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            placeholder="mm:ss left"
            pattern="\d{1,2}(:\d{1,2})?"
            aria-label="Time left in this half (mm:ss)"
            required
          />
          <button type="submit" className="kb-btn kb-btn-primary" disabled={busy}>
            Save time
          </button>
        </form>
      )}
    </section>
  )
}

const RAID_EVENTS = ['raid', 'tackle', 'line_out']

// One raid: pick the raider, then what happened. The raider came back (with the defenders who went
// out, touched or stepped out, in the order they went out, and the bonus), was tackled, or stepped
// out of bounds.
function RaidPad({ fixture, state, names, players, api, busy, run }) {
  const config = configOf(fixture)
  const [raidingTeam, setRaidingTeam] = useState(state.next_raid?.team ?? fixture.first_raid ?? 'team1')
  const [raider, setRaider] = useState(null)
  const [attackingPoints, setAttackingPoints] = useState(0)
  const [bonus, setBonus] = useState(false)
  const [defendingPoints, setDefendingPoints] = useState(0)
  const [tackler, setTackler] = useState(null)
  const [isSelfOut, setIsSelfOut] = useState(false)

  const defendingTeam = otherTeam(raidingTeam)
  const attackers = state.sides[raidingTeam].on_court
  const defenders = state.sides[defendingTeam].on_court
  const defendersOnMat = state.sides[defendingTeam]?.on_mat_count ?? defenders.length
  const attackersOnMat = state.sides[raidingTeam]?.on_mat_count ?? attackers.length
  const doOrDie = config.do_or_die_enabled && state.sides[raidingTeam].empty_raids >= config.do_or_die_after_empty_raids
  const raidNumber = fixture.events.filter((event) => RAID_EVENTS.includes(event.type)).length + 1

  const bonusEligible = config.bonus_enabled && defendersOnMat >= 6
  const isSuperTackle =
    config.super_tackle_enabled &&
    defendersOnMat <= config.super_tackle_threshold &&
    defendingPoints >= config.super_tackle_points

  function resetRaidState() {
    setRaider(null)
    setAttackingPoints(0)
    setBonus(false)
    setDefendingPoints(0)
    setTackler(null)
    setIsSelfOut(false)
  }

  function switchTeam(team) {
    setRaidingTeam(team)
    resetRaidState()
  }

  const totalAttacking = attackingPoints + (bonus ? 1 : 0)
  const tacklerPlayer = tackler ? players.get(tackler) ?? players.get(String(tackler)) : null

  // Live preview text
  let preview = ''
  if (totalAttacking === 0 && defendingPoints === 0) {
    preview = doOrDie ? `Do-or-die failed: raider out, +1 to ${names[defendingTeam]}` : 'Empty raid, no points'
  } else {
    const parts = []
    if (totalAttacking > 0) {
      let atkMsg = `+${totalAttacking} to ${names[raidingTeam]}`
      if (bonus) atkMsg += ' (Bonus)'
      if (attackingPoints >= config.super_raid_min_points) atkMsg += ' · Super raid'
      if (attackingPoints > 0 && attackingPoints >= defendersOnMat) {
        atkMsg += ` · All out +${config.all_out_points}`
      }
      parts.push(atkMsg)
    }
    if (defendingPoints > 0) {
      let defMsg = `+${defendingPoints} to ${names[defendingTeam]}`
      if (isSelfOut) {
        defMsg += ' (Raider self-out)'
      } else if (tacklerPlayer) {
        defMsg += ` (${isSuperTackle ? 'Super tackle' : 'Tackle'} by ${tacklerPlayer.name})`
      } else {
        defMsg += ` (${isSuperTackle ? 'Super tackle' : 'Tackle'})`
      }
      if (attackersOnMat === 1) defMsg += ` · All out +${config.all_out_points}`
      parts.push(defMsg)
    }
    preview = parts.join(' · ')
  }

  const canSave = raider && (defendingPoints === 0 || isSelfOut || tackler)

  async function save() {
    const body = {
      type: 'raid',
      team: raidingTeam,
      raider,
      points: attackingPoints,
      bonus,
      defending_points: defendingPoints,
      tackler: isSelfOut ? null : tackler,
      is_self_out: isSelfOut,
    }
    const ok = await run(() => api.addEvent(fixture._id, body))
    if (ok) {
      resetRaidState()
    }
  }

  return (
    <section className="kb-panel">
      <div className="kb-panel-head">
        <h3 className="kb-title">Raid {raidNumber}</h3>
        {doOrDie && <span className="kb-tag kb-tag-warn">Do-or-die</span>}
      </div>

      <div className="kb-seg" role="group" aria-label="Raiding house">
        {TEAMS.map((team) => (
          <button key={team} type="button" aria-pressed={raidingTeam === team} onClick={() => switchTeam(team)}>
            {names[team]} raids
          </button>
        ))}
      </div>

      <p className="kb-step">Raider</p>
      <PlayerChips ids={attackers} players={players} selected={raider ? [raider] : []} onPick={setRaider} />

      {raider && (
        <div className="kb-scoring-section">
          {/* Attacking Counter */}
          <div className="kb-counter-card">
            <div className="kb-counter-header">
              <div className="kb-counter-title-wrap">
                <span className="kb-counter-badge kb-badge-atk">Raiding Points</span>
                <span className="kb-counter-title">{names[raidingTeam]}</span>
              </div>
              <div className="kb-counter-ctrl">
                <button
                  type="button"
                  className="kb-counter-btn"
                  disabled={attackingPoints <= 0}
                  onClick={() => setAttackingPoints((p) => Math.max(0, p - 1))}
                  aria-label="Decrease raiding points"
                >
                  −
                </button>
                <span className="kb-counter-num">{attackingPoints}</span>
                <button
                  type="button"
                  className="kb-counter-btn"
                  disabled={attackingPoints >= defendersOnMat}
                  onClick={() => setAttackingPoints((p) => Math.min(defendersOnMat, p + 1))}
                  aria-label="Increase raiding points"
                >
                  +
                </button>
              </div>
            </div>

            {/* Bonus Tickbox */}
            {config.bonus_enabled && (
              <div className="kb-bonus-row">
                <label className={`kb-check ${!bonusEligible ? 'is-disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={bonus}
                    disabled={!bonusEligible}
                    onChange={(e) => setBonus(e.target.checked)}
                  />
                  <span>Bonus point (+1)</span>
                </label>
                {!bonusEligible && (
                  <span className="kb-bonus-hint">Requires 6+ defenders on mat ({defendersOnMat} active)</span>
                )}
              </div>
            )}
          </div>

          {/* Defending Counter */}
          <div className="kb-counter-card">
            <div className="kb-counter-header">
              <div className="kb-counter-title-wrap">
                <span className="kb-counter-badge kb-badge-def">Defending Points</span>
                <span className="kb-counter-title">{names[defendingTeam]}</span>
                {defendersOnMat <= config.super_tackle_threshold && config.super_tackle_enabled && (
                  <span className="kb-tag kb-tag-super">Super Tackle Active (2 pts)</span>
                )}
              </div>
              <div className="kb-counter-ctrl">
                <button
                  type="button"
                  className="kb-counter-btn"
                  disabled={defendingPoints <= 0}
                  onClick={() => {
                    const nextVal = Math.max(0, defendingPoints - 1)
                    setDefendingPoints(nextVal)
                    if (nextVal === 0) {
                      setTackler(null)
                      setIsSelfOut(false)
                    }
                  }}
                  aria-label="Decrease defending points"
                >
                  −
                </button>
                <span className="kb-counter-num">{defendingPoints}</span>
                <button
                  type="button"
                  className="kb-counter-btn"
                  disabled={defendingPoints >= 2}
                  onClick={() => {
                    const nextVal = Math.min(2, defendingPoints + 1)
                    setDefendingPoints(nextVal)
                  }}
                  aria-label="Increase defending points"
                >
                  +
                </button>
              </div>
            </div>

            {/* Tackler selection or Self-Out when defendingPoints > 0 */}
            {defendingPoints > 0 && (
              <div className="kb-tackle-section">
                <div className="kb-tackle-head">
                  <span className="kb-step">Tackled by:</span>
                  <button
                    type="button"
                    className={`kb-btn kb-btn-sm ${isSelfOut ? 'kb-btn-active' : ''}`}
                    onClick={() => {
                      setIsSelfOut(true)
                      setTackler(null)
                    }}
                  >
                    Raider Self-Out
                  </button>
                </div>

                {!isSelfOut ? (
                  <PlayerChips
                    ids={defenders}
                    players={players}
                    selected={tackler ? [tackler] : []}
                    onPick={(id) => {
                      setTackler(id)
                      setIsSelfOut(false)
                    }}
                  />
                ) : (
                  <p className="kb-hint kb-warn-text">
                    Raider stepped out on their own. Point awarded to defending team (no tackler credited).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action / Preview footer */}
          <div className="kb-save">
            <span className="kb-preview">{preview}</span>
            <button
              type="button"
              className="kb-btn kb-btn-primary"
              disabled={busy || !canSave}
              onClick={save}
            >
              Save Raid
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// When showOrder is set, each selected chip shows its 1-based position in `selected` — the order
// they went out, which is the order they are revived. Ids in lineOuts are marked as stepped out.
function PlayerChips({ ids, players, selected = [], lineOuts = [], onPick, empty = 'No players', showOrder = false }) {
  if (ids.length === 0) return <p className="kb-hint">{empty}</p>
  return (
    <div className="kb-chips">
      {ids.map((id) => {
        const picked = selected.includes(id)
        const order = showOrder && picked ? selected.indexOf(id) + 1 : null
        const line = picked && lineOuts.includes(id)
        const name = players.get(id)?.name ?? 'Unknown'
        return (
          <button
            key={id}
            type="button"
            className="kb-chip"
            aria-pressed={picked}
            aria-label={order != null ? `${name}, out ${order}${line ? ', stepped out' : ', touched'}` : undefined}
            onClick={onPick ? () => onPick(id) : undefined}
            disabled={!onPick}
          >
            {order != null && <span className="kb-chip-order">{order}</span>}
            {name}
            {line && <span className="kb-chip-line">line</span>}
          </button>
        )
      })}
    </div>
  )
}

// Technical points, substitutions, score changes, and undoing the last one or two actions.
function OtherActions({ fixture, state, names, players, busy, run, api, undosLeft, onUndo }) {
  const [open, setOpen] = useState(null)
  const [team, setTeam] = useState('team1')
  const [points, setPoints] = useState('1')
  const [note, setNote] = useState('')
  const [playerOut, setPlayerOut] = useState('')
  const [playerIn, setPlayerIn] = useState('')
  const [team1Score, setTeam1Score] = useState(state.score.team1)
  const [team2Score, setTeam2Score] = useState(state.score.team2)
  const [team1Mat, setTeam1Mat] = useState(state.sides.team1?.on_mat_count ?? 7)
  const [team2Mat, setTeam2Mat] = useState(state.sides.team2?.on_mat_count ?? 7)
  const over = fixture.status === 'completed'
  const lastEvent = fixture.events.at(-1)
  const canUndo = Boolean(lastEvent) && undosLeft > 0

  function toggle(name) {
    setOpen((current) => (current === name ? null : name))
    setPoints('1')
    setNote('')
    setPlayerOut('')
    setPlayerIn('')
    setTeam1Score(state.score.team1)
    setTeam2Score(state.score.team2)
    setTeam1Mat(state.sides.team1?.on_mat_count ?? 7)
    setTeam2Mat(state.sides.team2?.on_mat_count ?? 7)
  }

  function submit(event) {
    event.preventDefault()
    let body
    if (open === 'score_change') {
      body = {
        type: 'score_change',
        team1_score: Number(team1Score),
        team2_score: Number(team2Score),
        team1_on_mat: Number(team1Mat),
        team2_on_mat: Number(team2Mat),
        note,
      }
    } else if (open === 'substitution') {
      body = { type: 'substitution', team, player_out: playerOut, player_in: playerIn }
    } else {
      body = { type: open, team, points: Number(points), note }
    }
    run(() => api.addEvent(fixture._id, body)).then((ok) => ok && setOpen(null))
  }

  function undo() {
    if (!canUndo) return
    const what = `${EVENT_LABELS[lastEvent.type]}: ${describeEvent(lastEvent, players)}`
    if (window.confirm(`Undo the latest action?\n\n${what}`)) onUndo()
  }

  const side = state.sides[team]
  const buttons = [
    { key: 'technical', label: 'Technical point' },
    !over && { key: 'substitution', label: 'Substitution' },
    { key: 'score_change', label: 'Change score' },
  ].filter(Boolean)

  return (
    <section className="kb-panel">
      <div className="kb-row">
        {buttons.map((item) => (
          <button
            key={item.key}
            type="button"
            className="kb-btn"
            aria-pressed={open === item.key}
            onClick={() => toggle(item.key)}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className="kb-btn kb-btn-danger"
          disabled={busy || !canUndo}
          onClick={undo}
          title={lastEvent && undosLeft === 0 ? 'Undo limit reached — use Change score to fix the score' : undefined}
        >
          Undo{lastEvent ? ` (${undosLeft} left)` : ''}
        </button>
      </div>
      {lastEvent && undosLeft === 0 && (
        <p className="kb-hint">Undo limit reached. Use Change score to adjust the scoreline and court count.</p>
      )}

      {open && (
        <form className="kb-form" onSubmit={submit}>
          {open !== 'score_change' && (
            <div className="kb-seg" role="group" aria-label="House">
              {TEAMS.map((item) => (
                <button key={item} type="button" aria-pressed={team === item} onClick={() => setTeam(item)}>
                  {names[item]}
                </button>
              ))}
            </div>
          )}

          {open === 'score_change' ? (
            <div className="kb-score-change-grid">
              <div className="kb-score-change-teams">
                {/* Team 1 */}
                <div className="kb-team-change-card">
                  <div className="kb-team-change-head">
                    <span className="kb-counter-badge kb-badge-atk">{names.team1}</span>
                    <span className="kb-muted" style={{ fontSize: '0.75rem' }}>Current: {state.score.team1} pts</span>
                  </div>
                  <div className="kb-grid">
                    <label className="kb-field">
                      <span>New Score</span>
                      <input
                        className="kb-input"
                        type="number"
                        min={0}
                        max={500}
                        value={team1Score}
                        onChange={(e) => setTeam1Score(e.target.value)}
                        required
                      />
                    </label>
                    <label className="kb-field">
                      <span>Players on Court</span>
                      <select
                        className="kb-input"
                        value={team1Mat}
                        onChange={(e) => setTeam1Mat(Number(e.target.value))}
                        required
                      >
                        {[7, 6, 5, 4, 3, 2, 1].map((cnt) => (
                          <option key={cnt} value={cnt}>{cnt} on mat</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                {/* Team 2 */}
                <div className="kb-team-change-card">
                  <div className="kb-team-change-head">
                    <span className="kb-counter-badge kb-badge-def">{names.team2}</span>
                    <span className="kb-muted" style={{ fontSize: '0.75rem' }}>Current: {state.score.team2} pts</span>
                  </div>
                  <div className="kb-grid">
                    <label className="kb-field">
                      <span>New Score</span>
                      <input
                        className="kb-input"
                        type="number"
                        min={0}
                        max={500}
                        value={team2Score}
                        onChange={(e) => setTeam2Score(e.target.value)}
                        required
                      />
                    </label>
                    <label className="kb-field">
                      <span>Players on Court</span>
                      <select
                        className="kb-input"
                        value={team2Mat}
                        onChange={(e) => setTeam2Mat(Number(e.target.value))}
                        required
                      >
                        {[7, 6, 5, 4, 3, 2, 1].map((cnt) => (
                          <option key={cnt} value={cnt}>{cnt} on mat</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <label className="kb-field" style={{ width: '100%' }}>
                <span>Reason for score change (optional)</span>
                <input
                  className="kb-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional (e.g. referee score discrepancy resolved)"
                  maxLength={200}
                />
              </label>
            </div>
          ) : open === 'substitution' ? (
            <div className="kb-grid">
              <label className="kb-field">
                <span>Going off</span>
                <select className="kb-input" value={playerOut} onChange={(event) => setPlayerOut(event.target.value)} required>
                  <option value="">Pick a player on court</option>
                  {side.on_court.map((id) => (
                    <option key={id} value={id}>
                      {players.get(id)?.name ?? 'Unknown'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="kb-field">
                <span>Coming on</span>
                <select className="kb-input" value={playerIn} onChange={(event) => setPlayerIn(event.target.value)} required>
                  <option value="">{side.bench.length ? 'Pick a substitute' : 'No substitutes left'}</option>
                  {side.bench.map((id) => (
                    <option key={id} value={id}>
                      {players.get(id)?.name ?? 'Unknown'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="kb-grid">
              <label className="kb-field kb-field-narrow">
                <span>Points</span>
                <input
                  className="kb-input"
                  type="number"
                  min={1}
                  max={5}
                  value={points}
                  onChange={(event) => setPoints(event.target.value)}
                  required
                />
              </label>
              <label className="kb-field">
                <span>Reason</span>
                <input
                  className="kb-input"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. lobby violation"
                  maxLength={200}
                  required
                />
              </label>
            </div>
          )}

          <div className="kb-row">
            <button type="submit" className="kb-btn kb-btn-primary" disabled={busy}>
              Save
            </button>
            <button type="button" className="kb-btn kb-btn-ghost" onClick={() => setOpen(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}



// The full running log of the match: every raid, tackle, technical point, correction and substitution,
// with the score after each one. Shown to both the referee and the admin; nobody edits it here.
function EventLog({ fixture, state, names, players }) {
  const rows = fixture.events.map((event, index) => ({ event, entry: state.timeline[index], number: index + 1 })).reverse()

  return (
    <section className="kb-panel">
      <h3 className="kb-title">Events</h3>
      {rows.length === 0 ? (
        <p className="kb-hint">Nothing recorded yet.</p>
      ) : (
        <ol className="kb-log">
          {rows.map(({ event, entry, number }) => {
            const gained = ['team1', 'team2'].filter((team) => entry?.points[team])
            const badge = eventBadge(event, entry)
            return (
              <li key={event._id} className="kb-log-row">
                <span className="kb-log-no">{number}</span>
                <span className={`kb-tag kb-tag-${badge.tone}`}>{badge.label}</span>
                <span className="kb-log-text">
                  <strong>{names[event.team]}</strong> {describeEvent(event, players)}
                  {event.type === 'raid' && entry?.line_outs?.length > 0 && <span className="kb-tag kb-tag-line_out">Line out</span>}
                  {entry?.do_or_die && <span className="kb-tag kb-tag-warn">Do-or-die</span>}
                  {entry?.all_out && <span className="kb-tag kb-tag-bad">All out: {names[entry.all_out]}</span>}
                </span>
                <span className="kb-log-points">
                  {gained.map((team) => (
                    <span key={team}>
                      {entry.points[team] > 0 ? '+' : ''}
                      {entry.points[team]} {names[team]}
                    </span>
                  ))}
                </span>
                <span className="kb-log-score">
                  {entry?.score_after.team1}–{entry?.score_after.team2}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
