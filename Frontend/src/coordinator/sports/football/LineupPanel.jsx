import { useState } from 'react';
import { coordinatorFootballApi as api } from '../../../api/endpoints.js';
import PlayerSlot from '../../components/PlayerSlot.jsx';
import { Eyebrow } from '../../components/ui.jsx';

export default function LineupPanel({ fixture, names, busy, run, embedded }) {
  const [activeTeam, setActiveTeam] = useState('team1');
  const requiredStarters = fixture.config?.players_per_team || 8;
  const maxSubstitutes = fixture.config?.max_substitutes ?? 5;

  const currentLineup = activeTeam === 'team1' ? fixture.team1_lineup : fixture.team2_lineup;
  const [starters, setStarters] = useState(() => currentLineup?.starters || []);
  const [bench, setBench] = useState(() => currentLineup?.bench || []);
  const [teamKey, setTeamKey] = useState(activeTeam);

  // Sync state when switching tabs
  if (teamKey !== activeTeam) {
    const l = activeTeam === 'team1' ? fixture.team1_lineup : fixture.team2_lineup;
    setStarters(l?.starters || []);
    setBench(l?.bench || []);
    setTeamKey(activeTeam);
  }

  function handleSetStarter(index, player) {
    if (!player) {
      setStarters((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setStarters((prev) => {
      const copy = [...prev];
      copy[index] = player;
      return copy;
    });
  }

  function handleAddStarter(player) {
    if (!player) return;
    if (starters.length >= requiredStarters) return;
    if (starters.some((p) => p._id === player._id) || bench.some((p) => p._id === player._id)) {
      return;
    }
    setStarters((prev) => [...prev, player]);
  }

  function handleSetBench(index, player) {
    if (!player) {
      setBench((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setBench((prev) => {
      const copy = [...prev];
      copy[index] = player;
      return copy;
    });
  }

  function handleAddBench(player) {
    if (!player) return;
    if (bench.length >= maxSubstitutes) return;
    if (starters.some((p) => p._id === player._id) || bench.some((p) => p._id === player._id)) {
      return;
    }
    setBench((prev) => [...prev, player]);
  }

  async function handleSaveSlip(event) {
    event.preventDefault();
    await run(() =>
      api.saveSlip(fixture._id, activeTeam, {
        starters: starters.map((p) => p._id),
        bench: bench.map((p) => p._id),
      }),
    );
  }

  const team1Submitted = Boolean(fixture.slips?.team1_submitted_at);
  const team2Submitted = Boolean(fixture.slips?.team2_submitted_at);
  const locked = Boolean(fixture.lineup_locked_at);
  const hasExactStarters = starters.length === requiredStarters;
  const isBenchValid = bench.length <= maxSubstitutes;
  const canSubmit = !busy && hasExactStarters && isBenchValid;

  return (
    <section className="co-panel">
      <div className="co-panel-head">
        <div>
          <Eyebrow>§ 02 — Match lineups</Eyebrow>
          <h2 className="co-display co-display-md">
            Team Slips<span className="co-accent">.</span>
          </h2>
        </div>
        {locked && !embedded && (
          <span className="co-pill is-completed" style={{ alignSelf: 'center' }}>
            ✓ Both slips locked
          </span>
        )}
      </div>

      <p className="co-hint">
        Enter the starting {requiredStarters} players and up to {maxSubstitutes} substitutes for each house. Search by name, username, or roll number.
      </p>

      <div className="co-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          className={`co-btn ${activeTeam === 'team1' ? 'co-btn-primary' : 'co-btn-secondary'}`}
          onClick={() => setActiveTeam('team1')}
        >
          {names.team1} {team1Submitted ? '✓' : ''}
        </button>
        <button
          type="button"
          className={`co-btn ${activeTeam === 'team2' ? 'co-btn-primary' : 'co-btn-secondary'}`}
          onClick={() => setActiveTeam('team2')}
        >
          {names.team2} {team2Submitted ? '✓' : ''}
        </button>
      </div>

      <form onSubmit={handleSaveSlip}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 className="co-display" style={{ fontSize: '1.25rem', margin: 0 }}>
              Starting Players ({starters.length}/{requiredStarters} required)
            </h3>
            {hasExactStarters ? (
              <span className="co-pill is-completed" style={{ fontSize: '0.75rem' }}>
                ✓ Starting {requiredStarters} complete
              </span>
            ) : starters.length > requiredStarters ? (
              <span style={{ fontSize: '0.8rem', color: '#f87171' }}>
                Exceeds limit by {starters.length - requiredStarters} (remove extra)
              </span>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--co-muted)' }}>
                {requiredStarters - starters.length} more needed
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {starters.map((player, idx) => (
              <PlayerSlot
                key={player._id || idx}
                player={player}
                onChange={(p) => handleSetStarter(idx, p)}
                label={`Starter ${idx + 1}`}
              />
            ))}
          </div>
          {starters.length < requiredStarters ? (
            <div>
              <span style={{ fontSize: '0.875rem', color: 'var(--co-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Add starting player ({starters.length + 1} of {requiredStarters}):
              </span>
              <PlayerSlot player={null} onChange={handleAddStarter} label="Add starting player" />
            </div>
          ) : (
            <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', color: '#4ade80', fontSize: '0.85rem' }}>
              ✓ Starting lineup complete ({requiredStarters}/{requiredStarters}). To change a player, click on their card or remove them.
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 className="co-display" style={{ fontSize: '1.25rem', margin: 0 }}>
              Bench / Substitutes ({bench.length}/{maxSubstitutes} max)
            </h3>
            {bench.length >= maxSubstitutes ? (
              <span className="co-pill is-completed" style={{ fontSize: '0.75rem' }}>
                ✓ Bench full ({maxSubstitutes}/{maxSubstitutes})
              </span>
            ) : null}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {bench.map((player, idx) => (
              <PlayerSlot
                key={player._id || idx}
                player={player}
                onChange={(p) => handleSetBench(idx, p)}
                label={`Sub ${idx + 1}`}
              />
            ))}
          </div>
          {bench.length < maxSubstitutes ? (
            <div>
              <span style={{ fontSize: '0.875rem', color: 'var(--co-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Add substitute player ({bench.length}/{maxSubstitutes} allowed):
              </span>
              <PlayerSlot player={null} onChange={handleAddBench} label="Add substitute player" />
            </div>
          ) : (
            <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--co-border)', borderRadius: '6px', color: 'var(--co-muted)', fontSize: '0.85rem' }}>
              ✓ Maximum substitutes reached ({maxSubstitutes}/{maxSubstitutes}).
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="co-btn co-btn-primary"
            disabled={!canSubmit}
          >
            {busy ? 'Saving…' : `Submit ${names[activeTeam]} Slip`}
          </button>
          {!hasExactStarters && (
            <span style={{ fontSize: '0.875rem', color: '#f87171' }}>
              Must have exactly {requiredStarters} starters before submitting ({starters.length}/{requiredStarters}).
            </span>
          )}
          {!isBenchValid && (
            <span style={{ fontSize: '0.875rem', color: '#f87171' }}>
              Bench exceeds maximum of {maxSubstitutes} substitutes ({bench.length}/{maxSubstitutes}).
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
