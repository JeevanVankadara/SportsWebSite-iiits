import { useEffect, useState } from 'react';
import { coordinatorFootballApi as api } from '../../../api/endpoints.js';
import {
  calculateCurrentSeconds,
  EVENT_TYPE_LABELS,
  formatTime,
  GOAL_TYPE_LABELS,
  PERIOD_LABELS,
} from '../../../sports/football/format.js';
import { Eyebrow } from '../../components/ui.jsx';

export default function MatchCenter({ fixture, names, busy, run }) {
  const clock = fixture.clock || {};
  const [now, setNow] = useState(() => Date.now());

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'goal' | 'card' | 'sub'
  const [editingEvent, setEditingEvent] = useState(null);

  // Update timestamp every second when clock is running
  useEffect(() => {
    if (!clock.is_running) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [clock.is_running]);

  const seconds = calculateCurrentSeconds(clock, now);
  const currentMinute = Math.max(1, Math.floor(seconds / 60) + 1);
  const isCompleted = fixture.status === 'completed';

  // Clock actions
  async function handleClockAction(action, stoppageMinutes = 0) {
    await run(() =>
      api.clock(fixture._id, {
        action,
        stoppage_time_minutes: stoppageMinutes,
      }),
    );
  }

  async function handleFinishMatch() {
    if (!window.confirm('Are you sure you want to end the match? It will be marked as Full Time.')) return;
    await run(() => api.finishMatch(fixture._id));
  }

  async function handleDeleteEvent(event) {
    if (!window.confirm(`Delete this ${EVENT_TYPE_LABELS[event.type] || event.type} event at ${event.minute}'?`)) return;
    await run(() => api.deleteEvent(fixture._id, event._id));
  }

  function openCreateModal(type) {
    setEditingEvent(null);
    setActiveModal(type);
  }

  function openEditModal(event) {
    setEditingEvent(event);
    if (event.type === 'yellow_card' || event.type === 'red_card') {
      setActiveModal('card');
    } else if (event.type === 'substitution') {
      setActiveModal('sub');
    } else {
      setActiveModal('goal');
    }
  }

  const events = [...(fixture.events || [])].sort((a, b) => a.minute - b.minute);

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

            {clock.period !== 'not_started' && !clock.is_running && (
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
                className="co-btn co-btn-secondary"
                onClick={() => handleClockAction('pause')}
                disabled={busy}
              >
                ⏸ Pause Clock
              </button>
            )}

            {clock.period === 'first_half' && (
              <button
                type="button"
                className="co-btn co-btn-secondary"
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
                    className="co-btn co-btn-secondary"
                    onClick={() => handleClockAction('next_period')}
                    disabled={busy}
                  >
                    Start Extra Time →
                  </button>
                )}
                <button
                  type="button"
                  className="co-btn co-btn-secondary"
                  onClick={handleFinishMatch}
                  disabled={busy}
                >
                  Full Time Whistle (End Match)
                </button>
              </>
            )}

            {clock.period.startsWith('extra_time') && (
              <>
                <button
                  type="button"
                  className="co-btn co-btn-secondary"
                  onClick={() => handleClockAction('next_period')}
                  disabled={busy}
                >
                  Next ET Period →
                </button>
                <button
                  type="button"
                  className="co-btn co-btn-secondary"
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
        <div className="co-match-scoreboard">
          <div className="co-scoreboard-team">
            <h2 className="co-display">
              {names.team1}
            </h2>
          </div>
          <div className="co-scoreboard-vs">
            <span className="co-scoreboard-score">
              {fixture.team1_score} – {fixture.team2_score}
            </span>
          </div>
          <div className="co-scoreboard-team">
            <h2 className="co-display">
              {names.team2}
            </h2>
          </div>
        </div>
      </section>

      {/* Quick Action Buttons */}
      {!isCompleted && (
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
          <p className="co-hint">No events logged yet. Tap a button above to record goals, cards, and substitutions.</p>
        ) : (
          <div>
            {events.map((event) => {
              const eventTeamName = names[event.team] || event.team;
              let badgeClass = 'co-event-badge ';
              let badgeText = EVENT_TYPE_LABELS[event.type] || event.type;

              if (event.type === 'goal') {
                badgeClass += 'co-badge-goal';
                badgeText = GOAL_TYPE_LABELS[event.goal_type] || 'Goal';
              } else if (event.type === 'yellow_card') {
                badgeClass += 'co-badge-yellow';
                badgeText = event.card_type === 'second_yellow' ? '2nd Yellow (Red)' : 'Yellow Card';
              } else if (event.type === 'red_card') {
                badgeClass += 'co-badge-red';
                badgeText = 'Red Card';
              } else if (event.type === 'substitution') {
                badgeClass += 'co-badge-sub';
              }

              return (
                <div key={event._id} className="co-event-row">
                  <div className="co-event-main">
                    <span className="co-event-min">{event.minute}'</span>
                    <span className={badgeClass}>{badgeText}</span>
                    <span style={{ fontWeight: 600 }}>{eventTeamName}:</span>
                    {event.type === 'goal' && (
                      <span>
                        {event.player?.name || 'Unknown player'}
                        {event.assist_player ? ` (assist: ${event.assist_player.name})` : ''}
                      </span>
                    )}
                    {(event.type === 'yellow_card' || event.type === 'red_card') && (
                      <span>{event.player?.name || 'Unknown player'}</span>
                    )}
                    {event.type === 'substitution' && (
                      <span>
                        {event.player_out?.name} ➔ {event.player_in?.name}
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
              );
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
  );
}

// ------------------- MODALS -------------------

function GoalModal({ fixture, names, defaultMinute, editingEvent, onClose, run, busy }) {
  const isEditing = Boolean(editingEvent);
  const [team, setTeam] = useState(editingEvent?.team || 'team1');
  const [minute, setMinute] = useState(editingEvent?.minute || defaultMinute);
  const [goalType, setGoalType] = useState(editingEvent?.goal_type || 'regular');
  const [player, setPlayer] = useState(editingEvent?.player?._id || editingEvent?.player || '');
  const [assistPlayer, setAssistPlayer] = useState(
    editingEvent?.assist_player?._id || editingEvent?.assist_player || '',
  );
  const [note, setNote] = useState(editingEvent?.note || '');

  const teamLineup = team === 'team1' ? fixture.team1_lineup : fixture.team2_lineup;
  const availablePlayers = [...(teamLineup?.starters || []), ...(teamLineup?.bench || [])];

  async function handleSubmit(e) {
    e.preventDefault();
    const data = {
      type: 'goal',
      team,
      minute: Number(minute),
      period: fixture.clock?.period || 'first_half',
      goal_type: goalType,
      player: player || null,
      assist_player: assistPlayer || null,
      note,
    };

    const ok = await run(() =>
      isEditing
        ? api.updateEvent(fixture._id, editingEvent._id, data)
        : api.addEvent(fixture._id, data),
    );
    if (ok) onClose();
  }

  return (
    <div className="co-modal-backdrop" onClick={onClose}>
      <div className="co-modal" onClick={(e) => e.stopPropagation()}>
        <div className="co-modal-head">
          <h3 className="co-modal-title">{isEditing ? 'Edit Goal' : 'Record Goal'}</h3>
          <button type="button" className="co-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="co-form">
          <div style={{ marginBottom: '1rem' }}>
            <label className="co-label">Scoring House</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`co-btn ${team === 'team1' ? 'co-btn-primary' : 'co-btn-secondary'}`}
                onClick={() => setTeam('team1')}
              >
                {names.team1}
              </button>
              <button
                type="button"
                className={`co-btn ${team === 'team2' ? 'co-btn-primary' : 'co-btn-secondary'}`}
                onClick={() => setTeam('team2')}
              >
                {names.team2}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="co-label" htmlFor="goal-minute">
                Minute
              </label>
              <input
                id="goal-minute"
                type="number"
                min="0"
                max="180"
                className="co-input"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="co-label" htmlFor="goal-type">
                Type
              </label>
              <select
                id="goal-type"
                className="co-input"
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
              >
                <option value="regular">Regular Goal</option>
                <option value="penalty">Penalty (P)</option>
                <option value="own_goal">Own Goal (OG)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="co-label" htmlFor="goal-scorer">
              Goal Scorer
            </label>
            <select
              id="goal-scorer"
              className="co-input"
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
            >
              <option value="">(Unknown / Not listed)</option>
              {availablePlayers.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (@{p.username})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="co-label" htmlFor="goal-assist">
              Assist (Optional)
            </label>
            <select
              id="goal-assist"
              className="co-input"
              value={assistPlayer}
              onChange={(e) => setAssistPlayer(e.target.value)}
            >
              <option value="">None</option>
              {availablePlayers
                .filter((p) => p._id !== player)
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (@{p.username})
                  </option>
                ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="co-label" htmlFor="goal-note">
              Note (Optional)
            </label>
            <input
              id="goal-note"
              type="text"
              className="co-input"
              placeholder="e.g. Free kick, Header"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength="100"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="co-btn co-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="co-btn co-btn-primary" disabled={busy}>
              {busy ? 'Saving…' : isEditing ? 'Update Goal' : 'Save Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CardModal({ fixture, names, defaultMinute, editingEvent, onClose, run, busy }) {
  const isEditing = Boolean(editingEvent);
  const [team, setTeam] = useState(editingEvent?.team || 'team1');
  const [minute, setMinute] = useState(editingEvent?.minute || defaultMinute);
  const [cardType, setCardType] = useState(
    editingEvent?.card_type || (editingEvent?.type === 'red_card' ? 'red' : 'yellow'),
  );
  const [player, setPlayer] = useState(editingEvent?.player?._id || editingEvent?.player || '');
  const [note, setNote] = useState(editingEvent?.note || '');

  const teamLineup = team === 'team1' ? fixture.team1_lineup : fixture.team2_lineup;
  const availablePlayers = [...(teamLineup?.starters || []), ...(teamLineup?.bench || [])];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!player) return;

    const eventType = cardType === 'red' ? 'red_card' : 'yellow_card';
    const data = {
      type: eventType,
      team,
      minute: Number(minute),
      period: fixture.clock?.period || 'first_half',
      card_type: cardType,
      player,
      note,
    };

    const ok = await run(() =>
      isEditing
        ? api.updateEvent(fixture._id, editingEvent._id, data)
        : api.addEvent(fixture._id, data),
    );
    if (ok) onClose();
  }

  return (
    <div className="co-modal-backdrop" onClick={onClose}>
      <div className="co-modal" onClick={(e) => e.stopPropagation()}>
        <div className="co-modal-head">
          <h3 className="co-modal-title">{isEditing ? 'Edit Card' : 'Issue Card'}</h3>
          <button type="button" className="co-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="co-form">
          <div style={{ marginBottom: '1rem' }}>
            <label className="co-label">Team</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`co-btn ${team === 'team1' ? 'co-btn-primary' : 'co-btn-secondary'}`}
                onClick={() => setTeam('team1')}
              >
                {names.team1}
              </button>
              <button
                type="button"
                className={`co-btn ${team === 'team2' ? 'co-btn-primary' : 'co-btn-secondary'}`}
                onClick={() => setTeam('team2')}
              >
                {names.team2}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="co-label" htmlFor="card-minute">
                Minute
              </label>
              <input
                id="card-minute"
                type="number"
                min="0"
                max="180"
                className="co-input"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="co-label" htmlFor="card-type">
                Card
              </label>
              <select
                id="card-type"
                className="co-input"
                value={cardType}
                onChange={(e) => setCardType(e.target.value)}
              >
                <option value="yellow">🟨 Yellow Card</option>
                <option value="second_yellow">🟨 2nd Yellow (Red)</option>
                <option value="red">🟥 Direct Red Card</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="co-label" htmlFor="card-player">
              Player
            </label>
            <select
              id="card-player"
              className="co-input"
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
              required
            >
              <option value="">Select player…</option>
              {availablePlayers.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (@{p.username})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="co-label" htmlFor="card-note">
              Reason / Note (Optional)
            </label>
            <input
              id="card-note"
              type="text"
              className="co-input"
              placeholder="e.g. Reckless tackle, Dissent"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength="100"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="co-btn co-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="co-btn co-btn-primary" disabled={busy || !player}>
              {busy ? 'Saving…' : isEditing ? 'Update Card' : 'Save Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubModal({ fixture, names, defaultMinute, editingEvent, onClose, run, busy }) {
  const isEditing = Boolean(editingEvent);
  const [team, setTeam] = useState(editingEvent?.team || 'team1');
  const [minute, setMinute] = useState(editingEvent?.minute || defaultMinute);
  const [playerOut, setPlayerOut] = useState(
    editingEvent?.player_out?._id || editingEvent?.player_out || '',
  );
  const [playerIn, setPlayerIn] = useState(
    editingEvent?.player_in?._id || editingEvent?.player_in || '',
  );
  const [note, setNote] = useState(editingEvent?.note || '');

  const teamLineup = team === 'team1' ? fixture.team1_lineup : fixture.team2_lineup;
  const starters = teamLineup?.starters || [];
  const bench = teamLineup?.bench || [];
  const allPlayers = [...starters, ...bench];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!playerOut || !playerIn) return;

    const data = {
      type: 'substitution',
      team,
      minute: Number(minute),
      period: fixture.clock?.period || 'first_half',
      player_out: playerOut,
      player_in: playerIn,
      note,
    };

    const ok = await run(() =>
      isEditing
        ? api.updateEvent(fixture._id, editingEvent._id, data)
        : api.addEvent(fixture._id, data),
    );
    if (ok) onClose();
  }

  return (
    <div className="co-modal-backdrop" onClick={onClose}>
      <div className="co-modal" onClick={(e) => e.stopPropagation()}>
        <div className="co-modal-head">
          <h3 className="co-modal-title">
            {isEditing ? 'Edit Substitution' : 'Make Substitution (Rolling)'}
          </h3>
          <button type="button" className="co-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="co-form">
          <div style={{ marginBottom: '1rem' }}>
            <label className="co-label">Team</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`co-btn ${team === 'team1' ? 'co-btn-primary' : 'co-btn-secondary'}`}
                onClick={() => {
                  setTeam('team1');
                  setPlayerOut('');
                  setPlayerIn('');
                }}
              >
                {names.team1}
              </button>
              <button
                type="button"
                className={`co-btn ${team === 'team2' ? 'co-btn-primary' : 'co-btn-secondary'}`}
                onClick={() => {
                  setTeam('team2');
                  setPlayerOut('');
                  setPlayerIn('');
                }}
              >
                {names.team2}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="co-label" htmlFor="sub-minute">
              Minute
            </label>
            <input
              id="sub-minute"
              type="number"
              min="0"
              max="180"
              className="co-input"
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="co-label" htmlFor="player-out">
                Player Coming OFF
              </label>
              <select
                id="player-out"
                className="co-input"
                value={playerOut}
                onChange={(e) => setPlayerOut(e.target.value)}
                required
              >
                <option value="">Select player…</option>
                {allPlayers
                  .filter((p) => p._id !== playerIn)
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (@{p.username})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="co-label" htmlFor="player-in">
                Player Coming ON
              </label>
              <select
                id="player-in"
                className="co-input"
                value={playerIn}
                onChange={(e) => setPlayerIn(e.target.value)}
                required
              >
                <option value="">Select player…</option>
                {allPlayers
                  .filter((p) => p._id !== playerOut)
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (@{p.username})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="co-label" htmlFor="sub-note">
              Note (Optional)
            </label>
            <input
              id="sub-note"
              type="text"
              className="co-input"
              placeholder="e.g. Tactical, Injury"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength="100"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="co-btn co-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="co-btn co-btn-primary"
              disabled={busy || !playerOut || !playerIn || playerOut === playerIn}
            >
              {busy ? 'Saving…' : isEditing ? 'Update Substitution' : 'Confirm Sub'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustTimeModal({ fixture, currentSeconds, onClose, run, busy }) {
  const [mins, setMins] = useState(() => Math.floor(currentSeconds / 60));
  const [secs, setSecs] = useState(() => currentSeconds % 60);

  async function handleSubmit(e) {
    e.preventDefault();
    const totalSeconds = Number(mins) * 60 + Number(secs);
    const ok = await run(() =>
      api.clock(fixture._id, {
        action: 'set_time',
        elapsed_seconds: totalSeconds,
      }),
    );
    if (ok) onClose();
  }

  return (
    <div className="co-modal-backdrop" onClick={onClose}>
      <div className="co-modal" onClick={(e) => e.stopPropagation()}>
        <div className="co-modal-head">
          <h3 className="co-modal-title">Adjust Match Clock</h3>
          <button type="button" className="co-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="co-form">
          <p className="co-hint">
            Manually set or sync the timer (minutes and seconds) if the clock was paused or started late.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="co-label" htmlFor="adjust-mins">
                Minutes
              </label>
              <input
                id="adjust-mins"
                type="number"
                min="0"
                max="120"
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="co-btn co-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="co-btn co-btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Set Clock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
