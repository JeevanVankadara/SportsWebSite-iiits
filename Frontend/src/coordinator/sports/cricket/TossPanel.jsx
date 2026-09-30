import { useState } from 'react'
import { coordinatorCricketApi as api } from '../../../api/endpoints.js'
import { otherTeam, TEAMS } from '../../../sports/cricket/format.js'
import { Eyebrow } from '../../components/ui.jsx'

const DECISIONS = [
  { value: 'bat', label: 'Bat' },
  { value: 'bowl', label: 'Bowl' },
]

// Step 2: who won the toss and what they chose. It decides who bats first.
export default function TossPanel({ fixture, names, busy, run, collapsible }) {
  return (
    <TossForm
      key={`${fixture.toss?.winner}-${fixture.toss?.decision}`}
      toss={fixture.toss}
      names={names}
      busy={busy}
      collapsible={collapsible}
      onSave={(data) => run(() => api.saveToss(fixture._id, data))}
    />
  )
}

function TossForm({ toss, names, busy, collapsible, onSave }) {
  const [winner, setWinner] = useState(toss?.winner ?? '')
  const [decision, setDecision] = useState(toss?.decision ?? '')
  const battingFirst = winner && decision ? (decision === 'bat' ? winner : otherTeam(winner)) : null

  const form = (
    <form
      className="co-decision"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({ winner, decision })
      }}
    >
      <fieldset className="co-field">
        <legend className="co-label">Toss won by</legend>
        <div className="co-segmented">
          {TEAMS.map((team) => (
            <label key={team} className="co-segmented-option">
              <input
                type="radio"
                name="toss-winner"
                value={team}
                checked={winner === team}
                onChange={() => setWinner(team)}
                required
              />
              <span>{names[team]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="co-field">
        <legend className="co-label">They chose to</legend>
        <div className="co-segmented">
          {DECISIONS.map((option) => (
            <label key={option.value} className="co-segmented-option">
              <input
                type="radio"
                name="toss-decision"
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
      {battingFirst && <p className="co-muted co-small">{names[battingFirst]} bat first.</p>}
      <div className="co-actions">
        <button type="submit" className="co-btn co-btn-primary" disabled={busy || !battingFirst}>
          Save toss
        </button>
      </div>
    </form>
  )

  if (collapsible) {
    return (
      <details className="co-panel co-manage">
        <summary>Change the toss</summary>
        {form}
      </details>
    )
  }

  return (
    <section className="co-panel">
      <Eyebrow>Step 2</Eyebrow>
      <h2 className="co-display co-display-md">Toss</h2>
      {form}
    </section>
  )
}
