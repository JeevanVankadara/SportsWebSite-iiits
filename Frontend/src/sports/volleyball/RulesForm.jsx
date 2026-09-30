import { useState } from 'react'
import { configOf } from './format.js'
import './volleyball.css'

// The scoring rules: points to win a set and the point cap. Locked once the match starts.
export default function RulesForm({ fixture, api, busy, run }) {
  const saved = configOf(fixture)
  const [pointsToWin, setPointsToWin] = useState(String(saved.points_to_win))
  const [pointCap, setPointCap] = useState(String(saved.point_cap))
  const locked = fixture.status !== 'scheduled' || (fixture.sets?.length ?? 0) > 0

  function submit(event) {
    event.preventDefault()
    run(() => api.saveConfig(fixture._id, { points_to_win: Number(pointsToWin), point_cap: Number(pointCap) }))
  }

  return (
    <form className="vb vb-form" onSubmit={submit}>
      <p className="vb-hint">Best of 3 sets. Every set is played to the points below, with a cap for long deuces.</p>
      <div className="vb-grid">
        <label className="vb-field">
          <span>Points to win a set</span>
          <input
            className="vb-input"
            type="number"
            min="5"
            max="99"
            value={pointsToWin}
            onChange={(event) => setPointsToWin(event.target.value)}
            disabled={locked}
            required
          />
        </label>
        <label className="vb-field">
          <span>Point cap (sudden win)</span>
          <input
            className="vb-input"
            type="number"
            min={pointsToWin || 5}
            value={pointCap}
            onChange={(event) => setPointCap(event.target.value)}
            disabled={locked}
            required
          />
        </label>
      </div>
      {locked ? (
        <p className="vb-hint">The rules cannot change after the match has started.</p>
      ) : (
        <div className="vb-row">
          <button type="submit" className="vb-btn vb-btn-primary" disabled={busy}>
            Save rules
          </button>
        </div>
      )}
    </form>
  )
}
