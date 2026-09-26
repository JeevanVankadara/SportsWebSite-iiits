import { useState } from 'react'

// The edit (✎) form: type in the correct score of a set when a point was given by mistake.
export default function SetScoreEditor({ set, names, busy, onSave, onCancel }) {
  const [team1, setTeam1] = useState(String(set.team1_points))
  const [team2, setTeam2] = useState(String(set.team2_points))
  const digits = (value) => value.replace(/\D/g, '').slice(0, 2)

  return (
    <form
      className="co-set-editor"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({ team1_points: Number(team1), team2_points: Number(team2) })
      }}
    >
      <p className="co-label">Correct the score of set {set.set_no}</p>
      <div className="co-set-editor-fields">
        <label className="co-field">
          <span className="co-small co-muted">{names.team1}</span>
          <input
            className="co-input"
            inputMode="numeric"
            value={team1}
            onChange={(event) => setTeam1(digits(event.target.value))}
            required
            autoFocus
          />
        </label>
        <span className="co-set-editor-dash" aria-hidden="true">
          –
        </span>
        <label className="co-field">
          <span className="co-small co-muted">{names.team2}</span>
          <input
            className="co-input"
            inputMode="numeric"
            value={team2}
            onChange={(event) => setTeam2(digits(event.target.value))}
            required
          />
        </label>
      </div>
      <div className="co-actions">
        <button type="button" className="co-btn co-btn-ghost co-btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="co-btn co-btn-primary co-btn-sm" disabled={busy}>
          Save score
        </button>
      </div>
    </form>
  )
}
