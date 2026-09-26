import { useState } from 'react'
import { coordinatorBadmintonApi as api } from '../../../api/endpoints.js'
import {
  DEFAULT_ORDER,
  MATCH_TYPE_LABELS,
  MAX_MATCHES,
  POINTS_OPTIONS,
  SETS_OPTIONS,
} from '../../../sports/badminton/format.js'
import { Eyebrow } from '../../components/ui.jsx'

const orderOf = (matches) => matches.map(({ type, sets_count, points_to_win }) => ({ type, sets_count, points_to_win }))

// Step 1: the order of matches, and the sets and points of each. The referee can change matches
// that have not started at any time; the server keeps started ones as they are.
export default function MatchOrderPanel({ fixture, matches, busy, run, collapsible }) {
  // Starts a fresh draft whenever the saved order or a match's progress changes.
  const version = matches.map((match) => `${match._id}:${match.type}:${match.sets_count}:${match.points_to_win}:${match.status}`).join('|')
  return (
    <OrderEditor
      key={version}
      matches={matches}
      busy={busy}
      collapsible={collapsible}
      onSave={(plan) => run(() => api.saveOrder(fixture._id, plan))}
    />
  )
}

function OrderEditor({ matches, busy, collapsible, onSave }) {
  const saved = matches.length > 0 ? orderOf(matches) : DEFAULT_ORDER
  const [plan, setPlan] = useState(saved)
  const changed = matches.length === 0 || JSON.stringify(plan) !== JSON.stringify(saved)
  const hasStarted = (index) => matches[index]?.status === 'live' || matches[index]?.status === 'completed'

  function update(index, field, value) {
    setPlan((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const editor = (
    <>
      <ol className="co-order">
        {plan.map((item, index) => {
          const locked = hasStarted(index)
          return (
            <li key={index} className={`co-order-row${locked ? ' is-locked' : ''}`}>
              <span className="co-order-no">Match {index + 1}</span>
              <select
                className="co-input"
                value={item.type}
                onChange={(event) => update(index, 'type', event.target.value)}
                disabled={locked}
                aria-label={`Match ${index + 1} type`}
              >
                {Object.entries(MATCH_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className="co-input"
                value={item.sets_count}
                onChange={(event) => update(index, 'sets_count', Number(event.target.value))}
                disabled={locked}
                aria-label={`Match ${index + 1} sets`}
              >
                {SETS_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    {count === 1 ? '1 set' : 'Best of 3'}
                  </option>
                ))}
              </select>
              <select
                className="co-input"
                value={item.points_to_win}
                onChange={(event) => update(index, 'points_to_win', Number(event.target.value))}
                disabled={locked}
                aria-label={`Match ${index + 1} points per set`}
              >
                {POINTS_OPTIONS.map((points) => (
                  <option key={points} value={points}>
                    To {points}
                  </option>
                ))}
              </select>
              {locked ? (
                <span className="co-order-lock">Started</span>
              ) : (
                <button
                  type="button"
                  className="co-icon-btn"
                  onClick={() => setPlan((current) => current.filter((_, i) => i !== index))}
                  disabled={plan.length === 1}
                  aria-label={`Remove match ${index + 1}`}
                >
                  ×
                </button>
              )}
            </li>
          )
        })}
      </ol>
      <div className="co-actions">
        {plan.length < MAX_MATCHES && (
          <button
            type="button"
            className="co-btn co-btn-ghost"
            onClick={() => setPlan((current) => [...current, { ...(current.at(-1) ?? DEFAULT_ORDER[0]) }])}
          >
            + Add match
          </button>
        )}
        <button type="button" className="co-btn co-btn-primary" disabled={busy || !changed} onClick={() => onSave(plan)}>
          {matches.length > 0 ? 'Save match order' : 'Confirm match order'}
        </button>
      </div>
    </>
  )

  if (collapsible) {
    return (
      <details className="co-panel co-manage">
        <summary>Change the match order</summary>
        <p className="co-muted co-small">Matches that have started cannot change. Later ones can be changed, added or removed.</p>
        {editor}
      </details>
    )
  }

  return (
    <section className="co-panel">
      <Eyebrow>Step 1</Eyebrow>
      <h2 className="co-display co-display-md">Match order</h2>
      <p className="co-muted">
        Decide the order of matches, and for each one singles or doubles, 1 set or best of 3, and the points per set.
      </p>
      {editor}
    </section>
  )
}
