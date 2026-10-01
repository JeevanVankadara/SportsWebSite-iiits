import { STAGE_OPTIONS } from '../../sports/stages.js'

// The optional tag line of a fixture (Semi final, Final, ...), used by every sport's fixture form.
export default function StageSelect({ value, onChange }) {
  return (
    <label className="field">
      <span className="field-label">
        Stage <span className="optional">optional</span>
      </span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No tag</option>
        {STAGE_OPTIONS.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <span className="field-hint">Shown on the match card and match page, e.g. Semi final or Final.</span>
    </label>
  )
}
