import { useState } from 'react';

export default function DecisionForm({ names, busy, submitLabel, onSubmit, onCancel }) {
  const [decision, setDecision] = useState('');
  const [note, setNote] = useState('');

  const options = [
    { value: 'team1', label: `${names.team1} wins` },
    { value: 'team2', label: `${names.team2} wins` },
    { value: 'draw', label: 'Draw' },
  ];

  return (
    <form
      className="co-decision"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ decision, note });
      }}
    >
      <fieldset className="co-field">
        <legend className="co-label">Referee's decision</legend>
        <div className="co-segmented">
          {options.map((option) => (
            <label key={option.value} className="co-segmented-option">
              <input
                type="radio"
                name="football-decision"
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

      <label className="co-field">
        <span className="co-label">Note</span>
        <textarea
          className="co-input co-textarea"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Reason for match abandonment"
          maxLength={500}
          required
        />
      </label>

      <div className="co-actions">
        <button type="button" className="co-btn co-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="co-btn co-btn-danger-solid" disabled={busy}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
