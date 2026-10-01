import { useState } from 'react'
import { configOf } from './format.js'
import './kabaddi.css'

const NUMBERS = [
  { key: 'players_on_court', label: 'Players on court', min: 3, max: 12 },
  { key: 'max_substitutes', label: 'Substitutes', min: 0, max: 10 },
  { key: 'half_duration_minutes', label: 'Half length (min)', min: 1, max: 60 },
  { key: 'all_out_points', label: 'All-out bonus', min: 0, max: 10 },
  { key: 'super_raid_min_points', label: 'Super raid from (points)', min: 2, max: 12 },
]

// The match rules, set before the match starts. Shared by the admin and the referee.
export default function RulesForm({ fixture, api, busy, run }) {
  const [values, setValues] = useState(() => configOf(fixture))
  const canEdit = fixture.status === 'scheduled'
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }))

  function submit(event) {
    event.preventDefault()
    const body = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, typeof value === 'boolean' ? value : Number(value)]),
    )
    run(() => api.saveConfig(fixture._id, body))
  }

  const number = ({ key, label, min, max }) => (
    <label key={key} className="kb-field kb-field-narrow">
      <span>{label}</span>
      <input
        className="kb-input"
        type="number"
        min={min}
        max={max}
        value={values[key]}
        onChange={(event) => set(key, event.target.value)}
        disabled={!canEdit}
        required
      />
    </label>
  )

  const toggle = (key, label) => (
    <label className="kb-check">
      <input type="checkbox" checked={values[key]} onChange={(event) => set(key, event.target.checked)} disabled={!canEdit} />
      {label}
    </label>
  )

  return (
    <form className="kb kb-form" onSubmit={submit}>
      <div className="kb-grid">{NUMBERS.map(number)}</div>

      <div className="kb-rule">
        {toggle('bonus_enabled', 'Bonus point')}
        <span className="kb-hint">The raider earns 1 extra point for crossing the bonus line.</span>
      </div>

      <div className="kb-rule">
        {toggle('super_tackle_enabled', 'Super tackle')}
        {values.super_tackle_enabled && (
          <div className="kb-grid">
            {number({ key: 'super_tackle_threshold', label: 'When defenders are at most', min: 1, max: 12 })}
            {number({ key: 'super_tackle_points', label: 'Points', min: 1, max: 5 })}
          </div>
        )}
      </div>

      <div className="kb-rule">
        {toggle('do_or_die_enabled', 'Do-or-die raid')}
        {values.do_or_die_enabled && (
          <div className="kb-grid">
            {number({ key: 'do_or_die_after_empty_raids', label: 'After empty raids in a row', min: 1, max: 10 })}
          </div>
        )}
        <span className="kb-hint">An empty do-or-die raid puts the raider out and gives the defenders 1 point.</span>
      </div>

      <p className="kb-hint">
        Always on: 1 point per defender touched, 1 point per tackle, 1 point to the other house when a player steps
        out of bounds, one out player revived per point scored (first out, first back), and the all-out bonus when a
        whole house is out.
      </p>

      {canEdit ? (
        <div className="kb-row">
          <button type="submit" className="kb-btn kb-btn-primary" disabled={busy}>
            Save rules
          </button>
        </div>
      ) : (
        <p className="kb-hint">The match has started, so the rules are locked.</p>
      )}
    </form>
  )
}
