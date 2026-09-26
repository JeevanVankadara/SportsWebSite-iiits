import { formatLabel, MATCH_TYPE_LABELS, playerNames } from '../../../sports/badminton/format.js'
import { Eyebrow, StatusPill } from '../../components/ui.jsx'
import SetScores from './SetScores.jsx'

const TEAMS = ['team1', 'team2']

// Every match of the fixture with its players and set scores. While the fixture is going on,
// the referee can correct the set scores of finished matches here (the match in play is edited
// in the scoring panel).
export default function MatchList({ matches, names, busy, run, editable }) {
  if (matches.length === 0) return null

  return (
    <section className="co-block" aria-labelledby="all-matches">
      <Eyebrow>§ All matches</Eyebrow>
      <h2 id="all-matches" className="visually-hidden">
        All matches
      </h2>
      <ol className="co-match-list">
        {matches.map((match) => (
          <li key={match._id} className={`co-match-row is-${match.status}`}>
            <div className="co-match-row-head">
              <span className="co-display">Match {match.match_no}</span>
              <span className="co-muted co-small">
                {MATCH_TYPE_LABELS[match.type]} · {formatLabel(match)}
              </span>
              <StatusPill status={match.result_type === 'abandoned' ? 'abandoned' : match.status} />
            </div>

            <div className="co-match-row-sides">
              {TEAMS.map((team) => (
                <p key={team} className={`co-match-row-side${match.winner === team ? ' is-winner' : ''}`}>
                  <span className="co-match-row-house">{names[team]}</span>
                  <span className="co-muted co-small">{playerNames(match[`${team}_players`]) || '—'}</span>
                  <strong className="co-match-row-sets">{match[`${team}_sets_won`]}</strong>
                </p>
              ))}
            </div>

            {match.sets.length > 0 && (
              <SetScores
                match={match}
                names={names}
                editable={editable && match.status === 'completed'}
                busy={busy}
                run={run}
              />
            )}

            {match.result_type === 'abandoned' && (
              <p className="co-note">
                <strong>{match.winner ? `Awarded to ${names[match.winner]}.` : 'Declared a draw.'}</strong> {match.note}
              </p>
            )}
            {match.status === 'not_played' && <p className="co-note co-muted">Not needed: the fixture was already decided.</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}
