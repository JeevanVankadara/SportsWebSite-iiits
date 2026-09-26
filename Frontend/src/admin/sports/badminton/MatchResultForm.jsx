import { useState } from 'react'
import { badmintonApi } from '../../../api/endpoints.js'
import Alert from '../../../components/Alert.jsx'
import { ruleHint, setWinner } from '../../../sports/badminton/format.js'

const RESULT_TYPES = [
  { value: 'normal', label: 'Played to the end' },
  { value: 'abandoned', label: 'Abandoned' },
]

// Enter or correct one match's result. An abandoned match is decided by the referee
// (team 1, team 2 or a draw) with a note; the points already played still count.
export default function MatchResultForm({ match, team1, team2, onSaved, onCancel }) {
  const [resultType, setResultType] = useState(match.result_type ?? 'normal')
  const [rows, setRows] = useState(() =>
    Array.from({ length: match.sets_count }, (_, index) => ({
      team1: String(match.sets[index]?.team1_points ?? ''),
      team2: String(match.sets[index]?.team2_points ?? ''),
    })),
  )
  const [decision, setDecision] = useState(match.result_type === 'abandoned' ? (match.winner ?? 'draw') : '')
  const [note, setNote] = useState(match.note ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const names = { team1, team2 }

  function updateRow(index, side, value) {
    const digits = value.replace(/\D/g, '').slice(0, 2)
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [side]: digits } : row)))
  }

  function setStatus(row) {
    if (row.team1 === '' || row.team2 === '') return ''
    const winner = setWinner(Number(row.team1), Number(row.team2), match.points_to_win, match.point_cap)
    return winner ? `${names[winner]} wins the set` : 'Not finished'
  }

  async function handleSubmit(event) {
    event.preventDefault()
    // Sets are entered from set 1 onwards; empty rows at the end are simply not played.
    const lastFilled = rows.findLastIndex((row) => row.team1 !== '' || row.team2 !== '')
    const sets = rows.slice(0, lastFilled + 1)
    if (sets.some((row) => row.team1 === '' || row.team2 === '')) {
      setError('Fill in both scores for every set you enter, starting from set 1')
      return
    }

    const body = {
      result_type: resultType,
      sets: sets.map((row) => ({ team1_points: Number(row.team1), team2_points: Number(row.team2) })),
    }
    if (resultType === 'abandoned') Object.assign(body, { winner: decision, note })

    setError('')
    setSaving(true)
    try {
      onSaved(await badmintonApi.saveResult(match._id, body))
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="result-form" onSubmit={handleSubmit}>
      <div className="segmented" role="radiogroup" aria-label="How the match ended">
        {RESULT_TYPES.map((option) => (
          <label key={option.value} className="segmented-option">
            <input
              type="radio"
              name={`result-type-${match._id}`}
              value={option.value}
              checked={resultType === option.value}
              onChange={() => setResultType(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      <div className="set-inputs">
        <div className="set-input-head" aria-hidden="true">
          <span />
          <span>{team1}</span>
          <span>{team2}</span>
        </div>
        {rows.map((row, index) => (
          <div key={index} className="set-input-row">
            <span className="set-input-label">Set {index + 1}</span>
            <input
              className="input"
              inputMode="numeric"
              value={row.team1}
              onChange={(event) => updateRow(index, 'team1', event.target.value)}
              aria-label={`Set ${index + 1}, ${team1} points`}
            />
            <input
              className="input"
              inputMode="numeric"
              value={row.team2}
              onChange={(event) => updateRow(index, 'team2', event.target.value)}
              aria-label={`Set ${index + 1}, ${team2} points`}
            />
            <span className="set-input-status">{setStatus(row)}</span>
          </div>
        ))}
        <p className="field-hint">{ruleHint(match)}</p>
      </div>

      {resultType === 'abandoned' && (
        <>
          <fieldset className="field">
            <legend className="field-label">Referee's decision</legend>
            <div className="segmented">
              {[
                { value: 'team1', label: `${team1} wins` },
                { value: 'team2', label: `${team2} wins` },
                { value: 'draw', label: 'Draw' },
              ].map((option) => (
                <label key={option.value} className="segmented-option">
                  <input
                    type="radio"
                    name={`decision-${match._id}`}
                    value={option.value}
                    checked={decision === option.value}
                    onChange={() => setDecision(option.value)}
                    required
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span className="field-label">Note</span>
            <textarea
              className="input textarea note-input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why the match was stopped, e.g. injury or malpractice"
              maxLength={500}
              required
            />
          </label>
        </>
      )}

      {error && <Alert>{error}</Alert>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save result'}
        </button>
      </div>
    </form>
  )
}
