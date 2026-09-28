import { useState } from 'react';
import { coordinatorFootballApi as api } from '../../../api/endpoints.js';
import { Eyebrow } from '../../components/ui.jsx';

export default function MatchConfigPanel({ fixture, busy, run, collapsible }) {
  const [open, setOpen] = useState(!collapsible);
  const [playersPerTeam, setPlayersPerTeam] = useState(fixture.config?.players_per_team || 8);
  const [maxSubstitutes, setMaxSubstitutes] = useState(fixture.config?.max_substitutes ?? 5);
  const [halfDuration, setHalfDuration] = useState(fixture.config?.half_duration_minutes || 20);
  const [extraTime, setExtraTime] = useState(fixture.config?.extra_time_duration_minutes || 0);
  const [rollingSubs, setRollingSubs] = useState(fixture.config?.rolling_subs ?? true);

  const canEdit = fixture.status === 'scheduled' && fixture.clock?.period === 'not_started';

  async function handleSave(event) {
    event.preventDefault();
    await run(() =>
      api.saveConfig(fixture._id, {
        players_per_team: Number(playersPerTeam),
        max_substitutes: Number(maxSubstitutes),
        half_duration_minutes: Number(halfDuration),
        extra_time_duration_minutes: Number(extraTime),
        rolling_subs: Boolean(rollingSubs),
      }),
    );
  }

  return (
    <section className="co-panel">
      <div className="co-panel-head">
        <div>
          <Eyebrow>§ 01 — Match format & duration</Eyebrow>
          <h2 className="co-display co-display-md">
            Match Settings<span className="co-accent">.</span>
          </h2>
        </div>
        {collapsible && (
          <button type="button" className="co-btn co-btn-ghost co-btn-sm" onClick={() => setOpen((prev) => !prev)}>
            {open ? 'Hide settings' : 'View settings'}
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSave} className="co-form">
          <p className="co-hint">
            Configure squad size and half lengths before submitting lineups and kicking off.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="co-label" htmlFor="players-per-team">
                Players per side on pitch (e.g. 6, 8, 11)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  id="players-per-team"
                  type="number"
                  min="3"
                  max="15"
                  className="co-input"
                  value={playersPerTeam}
                  onChange={(e) => setPlayersPerTeam(e.target.value)}
                  disabled={!canEdit || busy}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[6, 7, 8, 9, 11].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`co-btn co-btn-sm ${Number(playersPerTeam) === n ? 'co-btn-primary' : 'co-btn-secondary'}`}
                    onClick={() => setPlayersPerTeam(n)}
                    disabled={!canEdit || busy}
                  >
                    {n}v{n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="co-label" htmlFor="max-substitutes">
                Substitutes per side (bench limit)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  id="max-substitutes"
                  type="number"
                  min="0"
                  max="20"
                  className="co-input"
                  value={maxSubstitutes}
                  onChange={(e) => setMaxSubstitutes(e.target.value)}
                  disabled={!canEdit || busy}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[3, 5, 7, 9].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`co-btn co-btn-sm ${Number(maxSubstitutes) === n ? 'co-btn-primary' : 'co-btn-secondary'}`}
                    onClick={() => setMaxSubstitutes(n)}
                    disabled={!canEdit || busy}
                  >
                    {n} subs
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="co-label" htmlFor="half-duration">
                Half duration (minutes)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  id="half-duration"
                  type="number"
                  min="5"
                  max="60"
                  className="co-input"
                  value={halfDuration}
                  onChange={(e) => setHalfDuration(e.target.value)}
                  disabled={!canEdit || busy}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[15, 20, 25, 30, 45].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`co-btn co-btn-sm ${Number(halfDuration) === m ? 'co-btn-primary' : 'co-btn-secondary'}`}
                    onClick={() => setHalfDuration(m)}
                    disabled={!canEdit || busy}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="co-label" htmlFor="extra-time">
                Extra time halves (if tied, in mins)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  id="extra-time"
                  type="number"
                  min="0"
                  max="30"
                  className="co-input"
                  value={extraTime}
                  onChange={(e) => setExtraTime(e.target.value)}
                  disabled={!canEdit || busy}
                  placeholder="0 for none"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[0, 5, 10, 15].map((et) => (
                  <button
                    key={et}
                    type="button"
                    className={`co-btn co-btn-sm ${Number(extraTime) === et ? 'co-btn-primary' : 'co-btn-secondary'}`}
                    onClick={() => setExtraTime(et)}
                    disabled={!canEdit || busy}
                  >
                    {et === 0 ? 'None (0m)' : `${et}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: canEdit ? 'pointer' : 'default' }}>
              <input
                type="checkbox"
                checked={rollingSubs}
                onChange={(e) => setRollingSubs(e.target.checked)}
                disabled={!canEdit || busy}
              />
              <span><strong>Enable Rolling Substitutions</strong> (subbed-out players can re-enter after informing ref)</span>
            </label>
          </div>

          {canEdit && (
            <button type="submit" className="co-btn co-btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save Match Settings'}
            </button>
          )}

          {!canEdit && (
            <p className="co-hint" style={{ color: 'var(--co-accent)' }}>
              Match has already started. Settings are locked.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
