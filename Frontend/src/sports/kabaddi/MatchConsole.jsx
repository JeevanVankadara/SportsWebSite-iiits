import { useEffect, useRef, useState } from 'react'
import {
  configOf,
  describeEvent,
  EVENT_LABELS,
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
        {started && <Court {...shared} />}
        {started && <EventLog {...shared} />}
      </div>
    )
  }

  return (
    <div className="kb">
      <Scoreboard {...shared} />
      {!over && <ClockBar {...shared} />}
      {playing && !over && <RaidPad key={`${period}-${state.timeline.length}`} {...shared} />}
      {started && !over && (
        <OtherActions key={state.timeline.length} {...shared} undosLeft={undosLeft} onUndo={handleUndo} />
      )}
      {started && <Court {...shared} />}
      {started && <EventLog {...shared} />}
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
      {TEAMS.map((team, index) => (
        <div key={team} className={`kb-board-team${index === 1 ? ' is-right' : ''}`}>
          <span className="kb-board-name">{names[team]}</span>
          <span className="kb-board-score">{state.score[team]}</span>
          {period !== 'not_started' && (
            <span className="kb-board-sub">
              {state.sides[team].on_court.length} on court · {state.sides[team].out.length} out
            </span>
          )}
        </div>
      ))}
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

// One raid: pick the raider, then either the defenders touched (and bonus) or the defender who tackled.
function RaidPad({ fixture, state, names, players, api, busy, run }) {
  const config = configOf(fixture)
  const [raidingTeam, setRaidingTeam] = useState(state.next_raid?.team ?? fixture.first_raid ?? 'team1')
  const [raider, setRaider] = useState(null)
  const [mode, setMode] = useState('scored')
  const [touched, setTouched] = useState([])
  const [bonus, setBonus] = useState(false)
  const [tackler, setTackler] = useState(null)

  const defendingTeam = otherTeam(raidingTeam)
  const attackers = state.sides[raidingTeam].on_court
  const defenders = state.sides[defendingTeam].on_court
  const doOrDie = config.do_or_die_enabled && state.sides[raidingTeam].empty_raids >= config.do_or_die_after_empty_raids
  const raidNumber = fixture.events.filter((event) => event.type === 'raid' || event.type === 'tackle').length + 1

  function switchTeam(team) {
    setRaidingTeam(team)
    setRaider(null)
    setTouched([])
    setBonus(false)
    setTackler(null)
  }

  // What saving would do, shown before it is saved.
  let preview
  if (mode === 'scored') {
    const points = touched.length + (bonus ? 1 : 0)
    const allOut = touched.length > 0 && touched.length === defenders.length
    if (points === 0) {
      preview = doOrDie
        ? `Do-or-die failed: raider out, +1 to ${names[defendingTeam]}`
        : 'Empty raid, no points'
    } else {
      preview = `+${points} to ${names[raidingTeam]}`
      if (points >= config.super_raid_min_points) preview += ' · Super raid'
      if (allOut) preview += ` · All out +${config.all_out_points}`
    }
  } else {
    const superTackle = config.super_tackle_enabled && defenders.length <= config.super_tackle_threshold
    const points = superTackle ? config.super_tackle_points : 1
    preview = `+${points} to ${names[defendingTeam]}${superTackle ? ' · Super tackle' : ''}`
    if (attackers.length === 1) preview += ` · All out +${config.all_out_points}`
  }

  const canSave = raider && (mode === 'scored' || tackler)

  function save() {
    const body =
      mode === 'scored'
        ? { type: 'raid', team: raidingTeam, raider, touched, bonus }
        : { type: 'tackle', team: raidingTeam, raider, tackler }
    run(() => api.addEvent(fixture._id, body))
  }

  const toggleTouched = (id) =>
    setTouched((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

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
        <>
          <p className="kb-step">Result</p>
          <div className="kb-seg" role="group" aria-label="Raid result">
            <button type="button" aria-pressed={mode === 'scored'} onClick={() => setMode('scored')}>
              Raider came back
            </button>
            <button type="button" aria-pressed={mode === 'tackled'} onClick={() => setMode('tackled')}>
              Raider tackled
            </button>
          </div>

          {mode === 'scored' ? (
            <>
              <p className="kb-hint">
                Tap defenders in the order the raider touched them — that is the order they go out. Leave empty for
                an empty raid.
              </p>
              <PlayerChips ids={defenders} players={players} selected={touched} onPick={toggleTouched} showOrder />
              {config.bonus_enabled && (
                <label className="kb-check">
                  <input type="checkbox" checked={bonus} onChange={(event) => setBonus(event.target.checked)} />
                  Bonus point
                </label>
              )}
            </>
          ) : (
            <>
              <p className="kb-hint">Tap the defender who made the tackle.</p>
              <PlayerChips ids={defenders} players={players} selected={tackler ? [tackler] : []} onPick={setTackler} />
            </>
          )}

          <div className="kb-save">
            <span className="kb-preview">{preview}</span>
            <button type="button" className="kb-btn kb-btn-primary" disabled={busy || !canSave} onClick={save}>
              Save
            </button>
          </div>
        </>
      )}
    </section>
  )
}

// When showOrder is set, each selected chip shows its 1-based position in `selected` — the order the
// raider touched them, which is the order they go out (and so the order they are revived).
function PlayerChips({ ids, players, selected = [], onPick, empty = 'No players', showOrder = false }) {
  if (ids.length === 0) return <p className="kb-hint">{empty}</p>
  return (
    <div className="kb-chips">
      {ids.map((id) => {
        const picked = selected.includes(id)
        const order = showOrder && picked ? selected.indexOf(id) + 1 : null
        return (
          <button
            key={id}
            type="button"
            className="kb-chip"
            aria-pressed={picked}
            aria-label={order != null ? `${players.get(id)?.name ?? 'Unknown'}, touched ${order}` : undefined}
            onClick={onPick ? () => onPick(id) : undefined}
            disabled={!onPick}
          >
            {order != null && <span className="kb-chip-order">{order}</span>}
            {players.get(id)?.name ?? 'Unknown'}
          </button>
        )
      })}
    </div>
  )
}

// Technical points, substitutions, score corrections, and undoing the last one or two actions.
function OtherActions({ fixture, state, names, players, busy, run, api, undosLeft, onUndo }) {
  const [open, setOpen] = useState(null)
  const [team, setTeam] = useState('team1')
  const [points, setPoints] = useState('1')
  const [note, setNote] = useState('')
  const [playerOut, setPlayerOut] = useState('')
  const [playerIn, setPlayerIn] = useState('')
  const over = fixture.status === 'completed'
  const lastEvent = fixture.events.at(-1)
  const canUndo = Boolean(lastEvent) && undosLeft > 0

  function toggle(name) {
    setOpen((current) => (current === name ? null : name))
    setPoints(name === 'correction' ? '-1' : '1')
    setNote('')
    setPlayerOut('')
    setPlayerIn('')
  }

  function submit(event) {
    event.preventDefault()
    const body =
      open === 'substitution'
        ? { type: 'substitution', team, player_out: playerOut, player_in: playerIn }
        : { type: open, team, points: Number(points), note }
    run(() => api.addEvent(fixture._id, body))
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
    { key: 'correction', label: 'Correct score' },
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
          title={lastEvent && undosLeft === 0 ? 'Undo limit reached — use Correct score to fix the score' : undefined}
        >
          Undo{lastEvent ? ` (${undosLeft} left)` : ''}
        </button>
      </div>
      {lastEvent && undosLeft === 0 && (
        <p className="kb-hint">Undo limit reached. Use Correct score to fix the scoreline if needed.</p>
      )}

      {open && (
        <form className="kb-form" onSubmit={submit}>
          <div className="kb-seg" role="group" aria-label="House">
            {TEAMS.map((item) => (
              <button key={item} type="button" aria-pressed={team === item} onClick={() => setTeam(item)}>
                {names[item]}
              </button>
            ))}
          </div>

          {open === 'substitution' ? (
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
                <span>{open === 'correction' ? 'Points (+ or −)' : 'Points'}</span>
                <input
                  className="kb-input"
                  type="number"
                  min={open === 'correction' ? -20 : 1}
                  max={open === 'correction' ? 20 : 5}
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
                  placeholder={open === 'correction' ? 'e.g. point given to the wrong house' : 'e.g. lobby violation'}
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

// Who is on court, who is out (in revival order) and who is left on the bench.
function Court({ state, names, players }) {
  return (
    <section className="kb-court">
      {TEAMS.map((team) => {
        const side = state.sides[team]
        return (
          <div key={team} className="kb-panel">
            <h3 className="kb-title">{names[team]}</h3>
            <p className="kb-step">On court ({side.on_court.length})</p>
            <PlayerChips ids={side.on_court} players={players} empty="Nobody on court" />
            <p className="kb-step">Out, next back first ({side.out.length})</p>
            <PlayerChips ids={side.out} players={players} empty="Nobody out" />
            {side.bench.length > 0 && (
              <>
                <p className="kb-step">Substitutes</p>
                <PlayerChips ids={side.bench} players={players} />
              </>
            )}
          </div>
        )
      })}
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
            return (
              <li key={event._id} className="kb-log-row">
                <span className="kb-log-no">{number}</span>
                <span className={`kb-tag kb-tag-${event.type}`}>{EVENT_LABELS[event.type]}</span>
                <span className="kb-log-text">
                  <strong>{names[event.team]}</strong> {describeEvent(event, players)}
                  {entry?.super_raid && <span className="kb-tag kb-tag-good">Super raid</span>}
                  {entry?.super_tackle && <span className="kb-tag kb-tag-good">Super tackle</span>}
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
