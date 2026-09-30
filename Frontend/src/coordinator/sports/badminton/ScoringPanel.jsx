import { useState } from 'react'
import { coordinatorBadmintonApi as api } from '../../../api/endpoints.js'
import {
  formatLabel,
  MATCH_TYPE_LABELS,
  playerNames,
  playersPerSide,
  ruleHint,
  setsToWin,
  setWinner,
} from '../../../sports/badminton/format.js'
import { Eyebrow } from '../../components/ui.jsx'
import DecisionForm from '../../components/DecisionForm.jsx'
import SetScores from './SetScores.jsx'

const TEAMS = ['team1', 'team2']

// Step 3: the court-side scoring screen for the match in play, or the next match waiting to start.
export default function ScoringPanel({ matches, names, busy, run }) {
  const live = matches.find((match) => match.status === 'live')
  if (live) return <LiveMatch key={live._id} match={live} names={names} busy={busy} run={run} />

  const next = matches.find((match) => match.status !== 'completed')
  if (next?.status === 'pending') return <UpNext key={next._id} match={next} names={names} busy={busy} run={run} />
  return null
}

function LiveMatch({ match, names, busy, run }) {
  const [abandoning, setAbandoning] = useState(false)
  const set = match.sets.find((item) => item.status === 'live')
  if (!set) return null

  const score = { team1: set.team1_points, team2: set.team2_points }
  // The set is only closed when the referee taps Next set / Finish match, so a mistake can still be fixed.
  const setWon = setWinner(score.team1, score.team2, match.points_to_win, match.point_cap)
  const matchWon = setWon && match[`${setWon}_sets_won`] + 1 >= setsToWin(match.sets_count) ? setWon : null

  function tap(team, change) {
    run(() =>
      api.score(match._id, { team, change, expected: { team1_points: score.team1, team2_points: score.team2 } }),
    )
  }

  return (
    <section className="co-panel co-court" aria-label={`Match ${match.match_no} in play`}>
      <header className="co-court-head">
        <div>
          <Eyebrow>§ Now playing</Eyebrow>
          <h2 className="co-display co-display-md">
            Match {match.match_no} · {MATCH_TYPE_LABELS[match.type]}
          </h2>
          <p className="co-muted co-small">
            {formatLabel(match)}. {ruleHint(match)}
          </p>
        </div>
        <p className="co-court-set">
          <span className="co-display">Set {set.set_no}</span>
          <small>of {match.sets_count}</small>
        </p>
      </header>

      <div className="co-court-sides">
        {TEAMS.map((team) => (
          <div key={team} className={`co-side${setWon === team ? ' is-leading' : ''}`}>
            <p className="co-display co-side-name">{names[team]}</p>
            <p className="co-side-players">{playerNames(match[`${team}_players`])}</p>
            <p className="co-display co-side-score" aria-live="polite">
              {score[team]}
            </p>
            <div className="co-side-controls">
              <button
                type="button"
                className="co-score-btn is-minus"
                onClick={() => tap(team, -1)}
                disabled={busy || score[team] === 0}
                aria-label={`Take a point back from ${names[team]}`}
              >
                −
              </button>
              <button
                type="button"
                className="co-score-btn is-plus"
                onClick={() => tap(team, 1)}
                disabled={busy || Boolean(setWon)}
                aria-label={`Point to ${names[team]}`}
              >
                +
              </button>
            </div>
            <p className="co-side-sets">
              Sets won <strong>{match[`${team}_sets_won`]}</strong>
            </p>
          </div>
        ))}
      </div>

      {setWon && (
        <div className="co-banner" role="status">
          <p className="co-display">
            {matchWon ? `${names[matchWon]} wins the match` : `${names[setWon]} wins set ${set.set_no}`}
          </p>
          <button
            type="button"
            className="co-btn co-btn-primary co-btn-lg"
            disabled={busy}
            onClick={() => run(() => (matchWon ? api.finishMatch(match._id) : api.nextSet(match._id)))}
          >
            {matchWon ? 'Finish match' : 'Next set'}
          </button>
        </div>
      )}

      <SetScores match={match} names={names} editable busy={busy} run={run} />
      <p className="co-muted co-small">Point given by mistake? Use − or edit (✎) the set score.</p>

      {abandoning ? (
        <DecisionForm
          names={names}
          busy={busy}
          submitLabel="Abandon match"
          onCancel={() => setAbandoning(false)}
          onSubmit={({ decision, note }) => run(() => api.abandonMatch(match._id, { winner: decision, note }))}
        />
      ) : (
        <div className="co-actions co-actions-start">
          <button type="button" className="co-btn co-btn-danger co-btn-sm" onClick={() => setAbandoning(true)}>
            Abandon match
          </button>
        </div>
      )}
    </section>
  )
}

function UpNext({ match, names, busy, run }) {
  const [abandoning, setAbandoning] = useState(false)
  const size = playersPerSide(match.type)
  const ready = match.team1_players.length === size && match.team2_players.length === size

  return (
    <section className="co-panel co-upnext">
      <Eyebrow>§ Up next</Eyebrow>
      <h2 className="co-display co-display-md">
        Match {match.match_no} · {MATCH_TYPE_LABELS[match.type]}
      </h2>
      <p className="co-muted co-small">{formatLabel(match)}</p>

      <div className="co-upnext-sides">
        {TEAMS.map((team) => (
          <div key={team} className="co-upnext-side">
            <span className="co-display">{names[team]}</span>
            <span className="co-muted">{playerNames(match[`${team}_players`]) || 'Players missing'}</span>
          </div>
        ))}
        <span className="co-upnext-vs co-display" aria-hidden="true">
          vs
        </span>
      </div>

      {!ready && (
        <p className="co-alert" role="alert">
          Add both houses' players for this match in the slips first.
        </p>
      )}

      {abandoning ? (
        <DecisionForm
          names={names}
          busy={busy}
          submitLabel="Abandon match"
          onCancel={() => setAbandoning(false)}
          onSubmit={({ decision, note }) => run(() => api.abandonMatch(match._id, { winner: decision, note }))}
        />
      ) : (
        <div className="co-actions co-actions-start">
          <button
            type="button"
            className="co-btn co-btn-primary co-btn-lg"
            disabled={busy || !ready}
            onClick={() => run(() => api.startMatch(match._id))}
          >
            Start match {match.match_no}
          </button>
          <button type="button" className="co-btn co-btn-danger co-btn-sm" onClick={() => setAbandoning(true)}>
            Abandon (e.g. walkover)
          </button>
        </div>
      )}
    </section>
  )
}
