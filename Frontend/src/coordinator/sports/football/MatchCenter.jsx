import { useEffect, useState } from 'react'
import { coordinatorFootballApi as api } from '../../../api/endpoints.js'
import {
  calculateCurrentSeconds,
  EVENT_TYPE_LABELS,
  formatTime,
  GOAL_TYPE_LABELS,
  PERIOD_LABELS,
  rosterState,
  sortEvents,
} from '../../../sports/football/format.js'
import { Eyebrow } from '../../components/ui.jsx'
import { playerHandle } from '../../../sports/playerHandle.js'
import { formatPlayerName } from '../../../utils/names.js'

export default function MatchCenter({ fixture, names, busy, run }) {
  const clock = fixture.clock || {}
  const [now, setNow] = useState(() => Date.now())

  // Modals state
  const [activeModal, setActiveModal] = useState(null) // 'goal' | 'card' | 'sub'
  const [editingEvent, setEditingEvent] = useState(null)

  // Update timestamp every second when clock is running
  useEffect(() => {
    if (!clock.is_running) return

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [clock.is_running])

  const seconds = calculateCurrentSeconds(clock, now)
  const currentMinute = Math.max(1, Math.floor(seconds / 60) + 1)
  const isCompleted = fixture.status === 'completed'
  const kickedOff = clock.period !== 'not_started'
  const onBreak = clock.period === 'half_time' || clock.period === 'extra_time_half_time'

  // Clock actions
  async function handleClockAction(action, stoppageMinutes = 0) {
    await run(() =>
      api.clock(fixture._id, {
        action,
        stoppage_time_minutes: stoppageMinutes,
      }),
    )
  }

  async function handleFinishMatch() {
    if (!window.confirm('Are you sure you want to end the match? It will be marked as Full Time.')) return
    await run(() => api.finishMatch(fixture._id))
  }

  async function handleDeleteEvent(event) {
    if (!window.confirm(`Delete this ${EVENT_TYPE_LABELS[event.type] || event.type} event at ${event.minute}'?`)) return
    await run(() => api.deleteEvent(fixture._id, event._id))
  }

  function openCreateModal(type) {
    setEditingEvent(null)
    setActiveModal(type)
  }

  function openEditModal(event) {
    setEditingEvent(event)
    if (event.type === 'yellow_card' || event.type === 'red_card') {
      setActiveModal('card')
    } else if (event.type === 'substitution') {
      setActiveModal('sub')
    } else {
      setActiveModal('goal')
    }
  }

  const events = sortEvents(fixture.events)

  return (
    <>
      {/* Live Match Clock */}
      <section className="co-football-clock">
        <div className="co-clock-period">
          {PERIOD_LABELS[clock.period] || clock.period}
          {clock.is_running ? (
            <span style={{ color: '#4ade80', marginLeft: '0.4rem' }}>● LIVE</span>
          ) : isCompleted ? (
            ' · FULL TIME'
          ) : (
            <span style={{ color: '#facc15', marginLeft: '0.4rem' }}>⏸ PAUSED</span>
          )}
        </div>

        <div className="co-clock-display">
          {formatTime(seconds)}
          {clock.stoppage_time_minutes > 0 && (
            <span className="co-clock-stoppage">+{clock.stoppage_time_minutes}'</span>
          )}
        </div>

        {!isCompleted && (
          <div className="co-clock-actions">
            {clock.period === 'not_started' && (
              <button
                type="button"
                className="co-btn co-btn-primary"
                onClick={() => handleClockAction('start')}
                disabled={busy}
              >
                ▶ Kickoff 1st Half
              </button>
            )}

            {kickedOff && !onBreak && !clock.is_running && (
              <button
                type="button"
                className="co-btn co-btn-primary"
                onClick={() => handleClockAction('resume')}
                disabled={busy}
              >
                ▶ Resume Clock
              </button>
            )}

            {clock.is_running && (
              <button
                type="button"
                className="co-btn co-btn-ghost"
                onClick={() => handleClockAction('pause')}
                disabled={busy}
              >
                ⏸ Pause Clock
              </button>
            )}

            {clock.period === 'first_half' && (
              <button
                type="button"
                className="co-btn co-btn-ghost"
                onClick={() => handleClockAction('next_period')}
                disabled={busy}
              >
                Half Time Whistle →
              </button>
            )}

            {clock.period === 'half_time' && (
              <button
                type="button"
                className="co-btn co-btn-primary"
                onClick={() => handleClockAction('next_period')}
                disabled={busy}
              >
                ▶ Start 2nd Half
              </button>
            )}

            {clock.period === 'second_half' && (
              <>
                {fixture.config?.extra_time_duration_minutes > 0 && (
                  <button
                    type="button"
                    className="co-btn co-btn-ghost"
                    onClick={() => handleClockAction('next_period')}
                    disabled={busy}
                  >
                    Start Extra Time →
                  </button>
                )}
                <button
                  type="button"
                  className="co-btn co-btn-ghost"
                  onClick={handleFinishMatch}
                  disabled={busy}
                >
                  Full Time Whistle (End Match)
                </button>
              </>
            )}

            {clock.period.startsWith('extra_time') && (
              <>
                {clock.period !== 'extra_time_second_half' && (
                  <button
                    type="button"
                    className={`co-btn ${onBreak ? 'co-btn-primary' : 'co-btn-ghost'}`}
                    onClick={() => handleClockAction('next_period')}
                    disabled={busy}
                  >
                    {onBreak ? '▶ Start ET 2nd Half' : 'ET Half Time Whistle →'}
                  </button>
                )}
                <button
                  type="button"
                  className="co-btn co-btn-ghost"
                  onClick={handleFinishMatch}
                  disabled={busy}
                >
                  Full Time Whistle
                </button>
              </>
            )}

            {clock.is_running && (
              <>
                <button
                  type="button"
                  className="co-btn co-btn-ghost co-btn-sm"
                  onClick={() => handleClockAction('stoppage', (clock.stoppage_time_minutes || 0) + 1)}
                  disabled={busy}
                >
                  +1m Stoppage
                </button>
                <button
                  type="button"
                  className="co-btn co-btn-ghost co-btn-sm"
                  onClick={() => handleClockAction('stoppage', (clock.stoppage_time_minutes || 0) + 2)}
                  disabled={busy}
                >
                  +2m Stoppage
                </button>
              </>
            )}

            {clock.period !== 'not_started' && (
              <button
                type="button"
                className="co-btn co-btn-ghost co-btn-sm"
                onClick={() => setActiveModal('adjust_time')}
                disabled={busy}
                title="Manually set or adjust clock time"
              >
                ⏱ Adjust Time
              </button>
            )}
          </div>
        )}
      </section>

      {/* Scoreboard */}
      <section className="co-panel" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div className="co-match-board">
          <div className="co-match-team">
            <h2 className="co-display">
              {names.team1}
            </h2>
          </div>
          <div className="co-match-vs">
            <span className="co-match-score">
              {fixture.team1_score} – {fixture.team2_score}
            </span>
          </div>
          <div className="co-match-team">
            <h2 className="co-display">
              {names.team2}
            </h2>
          </div>
        </div>
      </section>

      {/* Quick Action Buttons */}
      {!isCompleted && !kickedOff && (
        <p className="co-muted">Goals, cards and substitutions can be recorded once the match kicks off.</p>
      )}
      {!isCompleted && kickedOff && (
        <section className="co-panel" style={{ marginBottom: '1.5rem' }}>
          <Eyebrow>§ Match Controls</Eyebrow>
          <div className="co-quick-actions" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="co-quick-btn"
              onClick={() => openCreateModal('goal')}
              disabled={busy}
            >
              ⚽ + Goal
            </button>
            <button
              type="button"
              className="co-quick-btn"
              onClick={() => openCreateModal('card')}
              disabled={busy}
            >
              🟨 + Card
            </button>
            <button
              type="button"
              className="co-quick-btn"
              onClick={() => openCreateModal('sub')}
              disabled={busy}
            >
              🔄 + Substitution
            </button>
          </div>
        </section>
      )}

      {/* Events Timeline */}
      <section className="co-panel">
        <div className="co-panel-head">
          <div>
            <Eyebrow>§ Match Log</Eyebrow>
            <h2 className="co-display co-display-md">
              Events Timeline ({events.length})<span className="co-accent">.</span>
            </h2>
          </div>
        </div>

        {events.length === 0 ? (
          <p className="co-muted">No events logged yet. Tap a button above to record goals, cards, and substitutions.</p>
        ) : (
          <div>
            {events.map((event) => {
              const eventTeamName = names[event.team] || event.team
              let badgeClass = 'co-event-badge '
              let badgeText = EVENT_TYPE_LABELS[event.type] || event.type

              if (event.type === 'goal') {
                badgeClass += 'co-badge-goal'
                badgeText = GOAL_TYPE_LABELS[event.goal_type] || 'Goal'
              } else if (event.type === 'yellow_card') {
                badgeClass += 'co-badge-yellow'
                badgeText = event.card_type === 'second_yellow' ? '2nd Yellow (Red)' : 'Yellow Card'
              } else if (event.type === 'red_card') {
                badgeClass += 'co-badge-red'
                badgeText = 'Red Card'
              } else if (event.type === 'substitution') {
                badgeClass += 'co-badge-sub'
              }

              return (
                <div key={event._id} className="co-event-row">
                  <div className="co-event-main">
                    <span className="co-event-min">{event.minute}'</span>
                    <span className={badgeClass}>{badgeText}</span>
                    <span style={{ fontWeight: 600 }}>{eventTeamName}:</span>
                    {event.type === 'goal' && (
                      <span>
                        {formatPlayerName(event.player?.name) || 'Unknown player'}
                        {event.assist_player ? ` (assist: ${formatPlayerName(event.assist_player.name)})` : ''}
                      </span>
                    )}
                    {(event.type === 'yellow_card' || event.type === 'red_card') && (
                      <span>{formatPlayerName(event.player?.name) || 'Unknown player'}</span>
                    )}
                    {event.type === 'substitution' && (
                      <span>
                        {formatPlayerName(event.player_out?.name)} ➔ {formatPlayerName(event.player_in?.name)}
                      </span>
                    )}
                    {event.note && <span className="co-muted">({event.note})</span>}
                  </div>

                  {!isCompleted && (
                    <div className="co-event-actions">
                      <button
                        type="button"
                        className="co-event-btn"
                        onClick={() => openEditModal(event)}
                        disabled={busy}
                        title="Edit event"
                      >
                        ✎ Edit
                      </button>
                      <button
                        type="button"
                        className="co-event-btn is-danger"
                        onClick={() => handleDeleteEvent(event)}
                        disabled={busy}
                        title="Delete event"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      {activeModal === 'goal' && (
        <GoalModal
          fixture={fixture}
          names={names}
          defaultMinute={currentMinute}
          editingEvent={editingEvent}
          onClose={() => setActiveModal(null)}
          run={run}
          busy={busy}
        />
      )}

      {activeModal === 'card' && (
        <CardModal
          fixture={fixture}
          names={names}
          defaultMinute={currentMinute}
          editingEvent={editingEvent}
          onClose={() => setActiveModal(null)}
          run={run}
          busy={busy}
        />
      )}

      {activeModal === 'sub' && (
        <SubModal
          fixture={fixture}
          names={names}
          defaultMinute={currentMinute}
          editingEvent={editingEvent}
          onClose={() => setActiveModal(null)}
          run={run}
          busy={busy}
        />
      )}
      {activeModal === 'adjust_time' && (
        <AdjustTimeModal
          fixture={fixture}
          currentSeconds={seconds}
          onClose={() => setActiveModal(null)}
          run={run}
          busy={busy}
        />
      )}
    </>
  )
}

// ------------------- MODALS -------------------

const OTHER = { team1: 'team2', team2: 'team1' }
const playerId = (player) => String(player?._id ?? player ?? '')

function Modal({ title, onClose, children }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="co-modal-backdrop" onClick={onClose}>
      <div className="co-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="co-modal-head">
          <h3 className="co-modal-title">{title}</h3>
          <button type="button" className="co-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function TeamPicker({ label, names, value, onChange }) {
  return (
    <fieldset className="co-field co-event-team">
      <legend className="co-label">{label}</legend>
      <div className="co-segmented">
        {['team1', 'team2'].map((team) => (
          <label key={team} className="co-segmented-option">
            <input type="radio" name="event-team" checked={value === team} onChange={() => onChange(team)} />
            <span>{names[team]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function PlayerOptions({ players }) {
  return players.map((p) => (
    <option key={p._id} value={p._id}>
      {p.name} ({playerHandle(p)})
    </option>
  ))
}

function ModalActions({ busy, disabled, label, onClose }) {
  return (
    <div className="co-actions">
      <button type="button" className="co-btn co-btn-ghost" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className="co-btn co-btn-primary" disabled={busy || disabled}>
        {busy ? 'Saving…' : label}
      </button>
    </div>
  )
}

// Saves a new event, or the edited one. An edited event keeps the period it happened in.
async function saveEvent({ fixture, editingEvent, run, onClose }, data) {
  const body = { ...data, period: editingEvent?.period ?? fixture.clock?.period ?? 'first_half' }
  const ok = await run(() =>
    editingEvent ? api.updateEvent(fixture._id, editingEvent._id, body) : api.addEvent(fixture._id, body),
  )
  if (ok) onClose()
}

function MinuteField({ id, value, onChange }) {
  return (
    <div>
      <label className="co-label" htmlFor={id}>
        Minute
      </label>
      <input
        id={id}
        type="number"
        min="0"
        max="180"
        className="co-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  )
}

function GoalModal(props) {
  const { fixture, names, defaultMinute, editingEvent, onClose, busy } = props
  const isEditing = Boolean(editingEvent)
  const [goalType, setGoalType] = useState(editingEvent?.goal_type || 'regular')
  // The house the goal counts for. An own goal is stored under the house of the player who scored it.
  const [goalFor, setGoalFor] = useState(() => {
    if (!editingEvent) return 'team1'
    return editingEvent.goal_type === 'own_goal' ? OTHER[editingEvent.team] : editingEvent.team
  })
  const [minute, setMinute] = useState(editingEvent?.minute ?? defaultMinute)
  const [player, setPlayer] = useState(playerId(editingEvent?.player))
  const [assistPlayer, setAssistPlayer] = useState(playerId(editingEvent?.assist_player))
  const [note, setNote] = useState(editingEvent?.note || '')

  const ownGoal = goalType === 'own_goal'
  const scorerTeam = ownGoal ? OTHER[goalFor] : goalFor
  const roster = rosterState(fixture, scorerTeam)
  // A new goal comes from someone on the pitch; an edit may name anyone in the lineup.
  const scorers = isEditing ? roster.all : roster.onPitch

  function changeScorerSide(nextGoalFor, nextType) {
    setGoalFor(nextGoalFor)
    setGoalType(nextType)
    setPlayer('')
    setAssistPlayer('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    saveEvent(props, {
      type: 'goal',
      team: scorerTeam,
      minute: Number(minute),
      goal_type: goalType,
      player: player || null,
      assist_player: ownGoal ? null : assistPlayer || null,
      note,
    })
  }

  return (
    <Modal title={isEditing ? 'Edit goal' : 'Record goal'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TeamPicker label="Goal for" names={names} value={goalFor} onChange={(team) => changeScorerSide(team, goalType)} />

        <div className="co-modal-row">
          <MinuteField id="goal-minute" value={minute} onChange={setMinute} />
          <div>
            <label className="co-label" htmlFor="goal-type">
              Type
            </label>
            <select
              id="goal-type"
              className="co-input"
              value={goalType}
              onChange={(e) => changeScorerSide(goalFor, e.target.value)}
            >
              <option value="regular">Regular goal</option>
              <option value="penalty">Penalty (P)</option>
              <option value="own_goal">Own goal (OG)</option>
            </select>
          </div>
        </div>

        <div className="co-modal-field">
          <label className="co-label" htmlFor="goal-scorer">
            {ownGoal ? `Scored by (${names[scorerTeam]} player)` : 'Goal scorer'}
          </label>
          <select id="goal-scorer" className="co-input" value={player} onChange={(e) => setPlayer(e.target.value)}>
            <option value="">(Unknown / not listed)</option>
            <PlayerOptions players={scorers} />
          </select>
        </div>

        {!ownGoal && (
          <div className="co-modal-field">
            <label className="co-label" htmlFor="goal-assist">
              Assist (optional)
            </label>
            <select
              id="goal-assist"
              className="co-input"
              value={assistPlayer}
              onChange={(e) => setAssistPlayer(e.target.value)}
            >
              <option value="">None</option>
              <PlayerOptions players={scorers.filter((p) => p._id !== player)} />
            </select>
          </div>
        )}

        <div className="co-modal-field">
          <label className="co-label" htmlFor="goal-note">
            Note (optional)
          </label>
          <input
            id="goal-note"
            type="text"
            className="co-input"
            placeholder="e.g. Free kick, header"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength="100"
          />
        </div>

        <ModalActions busy={busy} label={isEditing ? 'Update goal' : 'Save goal'} onClose={onClose} />
      </form>
    </Modal>
  )
}

function CardModal(props) {
  const { fixture, names, defaultMinute, editingEvent, onClose, busy } = props
  const isEditing = Boolean(editingEvent)
  const [team, setTeam] = useState(editingEvent?.team || 'team1')
  const [minute, setMinute] = useState(editingEvent?.minute ?? defaultMinute)
  const [cardType, setCardType] = useState(
    editingEvent?.card_type || (editingEvent?.type === 'red_card' ? 'red' : 'yellow'),
  )
  const [player, setPlayer] = useState(playerId(editingEvent?.player))
  const [note, setNote] = useState(editingEvent?.note || '')

  const roster = rosterState(fixture, team)
  const sentOff = new Set(roster.sentOff.map((p) => p._id))
  // Players on the bench can be booked too; a player already sent off cannot.
  const players = isEditing ? roster.all : roster.all.filter((p) => !sentOff.has(p._id))

  function handleSubmit(e) {
    e.preventDefault()
    if (!player) return
    saveEvent(props, {
      type: cardType === 'red' ? 'red_card' : 'yellow_card',
      team,
      minute: Number(minute),
      card_type: cardType,
      player,
      note,
    })
  }

  return (
    <Modal title={isEditing ? 'Edit card' : 'Issue card'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TeamPicker
          label="House"
          names={names}
          value={team}
          onChange={(next) => {
            setTeam(next)
            setPlayer('')
          }}
        />

        <div className="co-modal-row">
          <MinuteField id="card-minute" value={minute} onChange={setMinute} />
          <div>
            <label className="co-label" htmlFor="card-type">
              Card
            </label>
            <select id="card-type" className="co-input" value={cardType} onChange={(e) => setCardType(e.target.value)}>
              <option value="yellow">Yellow card</option>
              <option value="second_yellow">2nd yellow (sent off)</option>
              <option value="red">Straight red</option>
            </select>
          </div>
        </div>

        <div className="co-modal-field">
          <label className="co-label" htmlFor="card-player">
            Player
          </label>
          <select id="card-player" className="co-input" value={player} onChange={(e) => setPlayer(e.target.value)} required>
            <option value="">Select player…</option>
            <PlayerOptions players={players} />
          </select>
        </div>

        <div className="co-modal-field">
          <label className="co-label" htmlFor="card-note">
            Reason (optional)
          </label>
          <input
            id="card-note"
            type="text"
            className="co-input"
            placeholder="e.g. Reckless tackle, dissent"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength="100"
          />
        </div>

        <ModalActions busy={busy} disabled={!player} label={isEditing ? 'Update card' : 'Save card'} onClose={onClose} />
      </form>
    </Modal>
  )
}

function SubModal(props) {
  const { fixture, names, defaultMinute, editingEvent, onClose, busy } = props
  const isEditing = Boolean(editingEvent)
  const [team, setTeam] = useState(editingEvent?.team || 'team1')
  const [minute, setMinute] = useState(editingEvent?.minute ?? defaultMinute)
  const [playerOut, setPlayerOut] = useState(playerId(editingEvent?.player_out))
  const [playerIn, setPlayerIn] = useState(playerId(editingEvent?.player_in))
  const [note, setNote] = useState(editingEvent?.note || '')

  const roster = rosterState(fixture, team)
  // A new substitution swaps someone on the pitch for someone on the bench.
  const goingOff = isEditing ? roster.all : roster.onPitch
  const comingOn = isEditing ? roster.all : roster.bench

  function handleSubmit(e) {
    e.preventDefault()
    if (!playerOut || !playerIn) return
    saveEvent(props, {
      type: 'substitution',
      team,
      minute: Number(minute),
      player_out: playerOut,
      player_in: playerIn,
      note,
    })
  }

  return (
    <Modal title={isEditing ? 'Edit substitution' : 'Make substitution'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TeamPicker
          label="House"
          names={names}
          value={team}
          onChange={(next) => {
            setTeam(next)
            setPlayerOut('')
            setPlayerIn('')
          }}
        />

        <div className="co-modal-field">
          <MinuteField id="sub-minute" value={minute} onChange={setMinute} />
        </div>

        {!isEditing && comingOn.length === 0 && (
          <p className="co-muted co-modal-field">{names[team]} has nobody left on the bench to bring on.</p>
        )}

        <div className="co-modal-row">
          <div>
            <label className="co-label" htmlFor="player-out">
              Coming off
            </label>
            <select
              id="player-out"
              className="co-input"
              value={playerOut}
              onChange={(e) => setPlayerOut(e.target.value)}
              required
            >
              <option value="">Select player…</option>
              <PlayerOptions players={goingOff.filter((p) => p._id !== playerIn)} />
            </select>
          </div>

          <div>
            <label className="co-label" htmlFor="player-in">
              Coming on
            </label>
            <select
              id="player-in"
              className="co-input"
              value={playerIn}
              onChange={(e) => setPlayerIn(e.target.value)}
              required
            >
              <option value="">Select player…</option>
              <PlayerOptions players={comingOn.filter((p) => p._id !== playerOut)} />
            </select>
          </div>
        </div>

        {fixture.config?.rolling_subs === false && (
          <p className="co-muted co-modal-field">Rolling substitutions are off: a player taken off cannot come back on.</p>
        )}

        <div className="co-modal-field">
          <label className="co-label" htmlFor="sub-note">
            Note (optional)
          </label>
          <input
            id="sub-note"
            type="text"
            className="co-input"
            placeholder="e.g. Tactical, injury"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength="100"
          />
        </div>

        <ModalActions
          busy={busy}
          disabled={!playerOut || !playerIn || playerOut === playerIn}
          label={isEditing ? 'Update substitution' : 'Confirm substitution'}
          onClose={onClose}
        />
      </form>
    </Modal>
  )
}

function AdjustTimeModal({ fixture, currentSeconds, onClose, run, busy }) {
  const [mins, setMins] = useState(() => Math.floor(currentSeconds / 60))
  const [secs, setSecs] = useState(() => currentSeconds % 60)

  async function handleSubmit(e) {
    e.preventDefault()
    const totalSeconds = Number(mins) * 60 + Number(secs)
    const ok = await run(() => api.clock(fixture._id, { action: 'set_time', elapsed_seconds: totalSeconds }))
    if (ok) onClose()
  }

  return (
    <Modal title="Adjust match clock" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p className="co-muted co-modal-field">
          Set the match time (minutes and seconds) if the clock was paused or started late.
        </p>

        <div className="co-modal-row">
          <div>
            <label className="co-label" htmlFor="adjust-mins">
              Minutes
            </label>
            <input
              id="adjust-mins"
              type="number"
              min="0"
              max="119"
              className="co-input"
              value={mins}
              onChange={(e) => setMins(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="co-label" htmlFor="adjust-secs">
              Seconds
            </label>
            <input
              id="adjust-secs"
              type="number"
              min="0"
              max="59"
              className="co-input"
              value={secs}
              onChange={(e) => setSecs(e.target.value)}
              required
            />
          </div>
        </div>

        <ModalActions busy={busy} label="Set clock" onClose={onClose} />
      </form>
    </Modal>
  )
}
