import { useState } from 'react'
import { coordinatorCricketApi as api } from '../../../api/endpoints.js'
import { nextInnings, otherTeam, SUPER_OVER_WICKETS } from '../../../sports/cricket/format.js'
import { Eyebrow } from '../../components/ui.jsx'
import { playerHandle } from '../../../sports/playerHandle.js'

// Before each innings: the first innings, the chase, or a super over when the scores are level.
export default function InningsStart({ fixture, innings, names, busy, run }) {
  const plan = nextInnings(fixture, innings)
  if (!plan) return null

  const batting = plan.batting_team
  const bowling = otherTeam(batting)
  const superOver = plan.super_over > 0
  const tied = superOver && plan.innings_no % 2 === 1
  const superRule = `1 over, and the innings stops at ${SUPER_OVER_WICKETS} wickets.`

  let eyebrow = '§ Innings break'
  let title = `${names[batting]} need ${plan.target} to win`
  let text = `From ${fixture.overs} overs.`
  if (plan.innings_no === 1) {
    eyebrow = '§ 1st innings'
    title = `${names[batting]} bat first`
    text = `${fixture.overs} overs, powerplay ${fixture.powerplay_overs}. Pick the openers and the bowler.`
  } else if (tied) {
    eyebrow = '§ Scores level'
    title = plan.super_over > 1 ? `Super over ${plan.super_over}` : 'Super over'
    text = `${names[batting]} bat first, as they batted second. ${superRule}`
  } else if (superOver) {
    eyebrow = '§ Super over'
    text = superRule
  }

  return (
    <section className={`co-panel co-cr-start${superOver ? ' is-super' : ''}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="co-display co-display-md">{title}</h2>
      <p className="co-muted co-small">{text}</p>
      <OpenersForm
        key={plan.innings_no}
        batters={fixture[`${batting}_players`]}
        bowlers={fixture[`${bowling}_players`]}
        busy={busy}
        submitLabel={superOver ? 'Start super over' : plan.innings_no === 1 ? 'Start 1st innings' : 'Start 2nd innings'}
        onSubmit={(data) => run(() => api.startInnings(fixture._id, data))}
      />
      {tied && (
        <div className="co-cr-tie">
          <p className="co-muted co-small">Or finish the match as a tie: 1 point each.</p>
          <button
            type="button"
            className="co-btn co-btn-ghost co-btn-sm"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Finish the match as a tie?')) run(() => api.acceptTie(fixture._id))
            }}
          >
            Finish as tie
          </button>
        </div>
      )}
    </section>
  )
}

function OpenersForm({ batters, bowlers, busy, submitLabel, onSubmit }) {
  const [striker, setStriker] = useState('')
  const [nonStriker, setNonStriker] = useState('')
  const [bowler, setBowler] = useState('')
  const ready = striker && nonStriker && bowler && striker !== nonStriker

  return (
    <form
      className="co-cr-openers"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ striker, non_striker: nonStriker, bowler })
      }}
    >
      <PlayerSelect label="Striker" players={batters} value={striker} onChange={setStriker} taken={nonStriker} />
      <PlayerSelect label="Non-striker" players={batters} value={nonStriker} onChange={setNonStriker} taken={striker} />
      <PlayerSelect label="Bowler" players={bowlers} value={bowler} onChange={setBowler} />
      <div className="co-actions">
        <button type="submit" className="co-btn co-btn-primary" disabled={busy || !ready}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

function PlayerSelect({ label, players, value, onChange, taken }) {
  return (
    <label className="co-field">
      <span className="co-label">{label}</span>
      <select className="co-input" value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="" disabled>
          Choose a player
        </option>
        {players.map((player) => (
          <option key={player._id} value={player._id} disabled={player._id === taken}>
            {player.name} ({playerHandle(player)})
          </option>
        ))}
      </select>
    </label>
  )
}
