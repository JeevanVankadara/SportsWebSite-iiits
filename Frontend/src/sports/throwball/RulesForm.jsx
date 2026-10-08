import { useState } from 'react'
import { configOf } from './format.js'
import './throwball.css'

// The scoring rules: points to win a set and the point cap. Locked once the match starts.
export default function RulesForm({ fixture, api, busy, run }) {
  const saved = configOf(fixture)
  const [pointsToWin, setPointsToWin] = useState(String(saved.points_to_win))
  const [pointCap, setPointCap] = useState(String(saved.point_cap))
  const [playersOnCourt, setPlayersOnCourt] = useState(String(saved.players_on_court))
  const [maxSubstitutes, setMaxSubstitutes] = useState(String(saved.max_substitutes))
  const [matchSets, setMatchSets] = useState(String(saved.match_sets))
  const locked = fixture.status !== 'scheduled' || (fixture.sets?.length ?? 0) > 0

  function submit(event) {
    event.preventDefault()
    run(() => api.saveConfig(fixture._id, { points_to_win: Number(pointsToWin), point_cap: Number(pointCap), players_on_court: Number(playersOnCourt), max_substitutes: Number(maxSubstitutes), match_sets: Number(matchSets) }))
  }

  return (
    <form className="vb tb-form" onSubmit={submit}>
      <p className="tb-hint">Best of 3 sets. Every set is played to the points below, with a cap for long deuces.</p>
      <div className="tb-grid">
        <label className="tb-field">
          <span>Points to win a set</span>
          <input
            className="tb-input"
            type="number"
            min="5"
            max="99"
            value={pointsToWin}
            onChange={(event) => setPointsToWin(event.target.value)}
            disabled={locked}
            required
          />
        </label>
        <label className="tb-field">
          <span>Point cap (sudden win)</span>
          <input
            className="tb-input"
            type="number"
            min={pointsToWin || 5}
            value={pointCap}
            onChange={(event) => setPointCap(event.target.value)}
            disabled={locked}
            required
          />
        </label>
        <label className="tb-field">
          <span>Players on court</span>
          <input className="tb-input" type="number" min="1" max="20" value={playersOnCourt} onChange={(e) => setPlayersOnCourt(e.target.value)} disabled={locked} required />
        </label>
        <label className="tb-field">
          <span>Max substitutes</span>
          <input className="tb-input" type="number" min="0" max="20" value={maxSubstitutes} onChange={(e) => setMaxSubstitutes(e.target.value)} disabled={locked} required />
        </label>
        <label className="tb-field">
          <span>Match sets</span>
          <input className="tb-input" type="number" min="1" max="9" step="2" value={matchSets} onChange={(e) => setMatchSets(e.target.value)} disabled={locked} required />
        </label>
      </div>
      {locked ? (
        <p className="tb-hint">The rules cannot change after the match has started.</p>
      ) : (
        <div className="tb-row">
          <button type="submit" className="tb-btn tb-btn-primary" disabled={busy}>
            Save rules
          </button>
        </div>
      )}
    </form>
  )
}
