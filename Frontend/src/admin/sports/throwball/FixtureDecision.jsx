import { useState } from 'react'
import { throwballApi } from '../../../api/endpoints.js'
import Alert from '../../../components/Alert.jsx'

export default function FixtureDecision({ fixture, team1, team2, onSaved, onError }) {
  const [result, setResult] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(body) {
    setError('')
    setSaving(true)
    try {
      onSaved(await throwballApi.setDecision(fixture._id, body))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function removeDecision() {
    if (!window.confirm('Remove the decision? If the match was played to the end the score decides it again; otherwise it reopens where it stopped.')) return
    try {
      onSaved(await throwballApi.setDecision(fixture._id, { result_type: 'normal' }))
    } catch (err) {
      onError(err.message)
    }
  }

  if (fixture.result_type === 'abandoned') {
    const awarded =
      fixture.result === 'draw'
        ? 'Declared a draw'
        : `Awarded to ${fixture.result === 'team1' ? team1 : team2}`
    return (
      <section className="panel decision-panel">
        <h2 className="panel-title">Match abandoned</h2>
        <p>
          <strong>{awarded}.</strong> {fixture.decision_note}
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
          save({ result_type: 'abandoned', result, decision_note: note })
        }}
      >
        <p className="field-hint">
          Use this if the match had to be stopped early (e.g. bad weather or forfeit).
        </p>
        <fieldset className="field">
          <legend className="field-label">Referee / Admin decision</legend>
          <div className="segmented">
            {[
              { value: 'team1', label: `${team1} wins` },
              { value: 'team2', label: `${team2} wins` },
              { value: 'draw', label: 'Draw' },
            ].map((option) => (
              <label key={option.value} className="segmented-option">
                <input
                  type="radio"
                  name="throwball-fixture-decision"
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
            placeholder="Reason for abandonment"
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
