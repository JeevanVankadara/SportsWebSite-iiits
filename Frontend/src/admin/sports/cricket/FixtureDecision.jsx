import { useState } from 'react'
import { cricketApi } from '../../../api/endpoints.js'
import Alert from '../../../components/Alert.jsx'

// The decision on a match that could not be finished (e.g. rain): awarded to a house or no result, with a note.
// Points follow the decision; the match is left out of the net run rate.
export default function FixtureDecision({ fixture, names, onSaved, onError }) {
  const [result, setResult] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(body) {
    setError('')
    setSaving(true)
    try {
      onSaved(await cricketApi.setDecision(fixture._id, body))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function removeDecision() {
    if (!window.confirm('Remove the decision? The result will come from the innings again.')) return
    try {
      onSaved(await cricketApi.setDecision(fixture._id, { result_type: 'normal' }))
    } catch (err) {
      onError(err.message)
    }
  }

  if (fixture.result_type === 'abandoned') {
    const awarded = fixture.result === 'no_result' ? 'No result' : `Awarded to ${names[fixture.result]}`
    return (
      <section className="panel decision-panel">
        <h2 className="panel-title">Match abandoned</h2>
        <p>
          <strong>{awarded}.</strong> {fixture.note}
        </p>
        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={removeDecision}>
            Remove decision
          </button>
        </div>
      </section>
    )
  }

  return (
    <details className="panel decision-panel">
      <summary className="panel-title">Abandon the match</summary>
      <form
        className="form-stack decision-form"
        onSubmit={(event) => {
          event.preventDefault()
          save({ result_type: 'abandoned', result, note })
        }}
      >
        <p className="field-hint">Use this when the match cannot be finished. It closes the fixture with your decision.</p>
        <fieldset className="field">
          <legend className="field-label">Decision</legend>
          <div className="segmented">
            {[
              { value: 'team1', label: `${names.team1} wins` },
              { value: 'team2', label: `${names.team2} wins` },
              { value: 'no_result', label: 'No result' },
            ].map((option) => (
              <label key={option.value} className="segmented-option">
                <input
                  type="radio"
                  name="cricket-decision"
                  value={option.value}
                  checked={result === option.value}
                  onChange={() => setResult(option.value)}
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
            placeholder="What happened, e.g. rain or bad light"
            maxLength={500}
            required
          />
        </label>
        {error && <Alert>{error}</Alert>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? 'Saving…' : 'Save decision'}
          </button>
        </div>
      </form>
    </details>
  )
}
