import { StatusBadge } from '../../components/ui.jsx'
import { formatLabel, MATCH_TYPE_LABELS, playerNames } from '../../../sports/badminton/format.js'
import MatchResultForm from './MatchResultForm.jsx'

// One match of a fixture: lineup, set scores, result and (for the admin) result entry and correction.
export default function MatchCard({ match, team1, team2, canEnter, canClear, editing, onEdit, onCancel, onSaved, onClear }) {
  const completed = match.status === 'completed'
  const lineupIn = match.team1_players.length > 0 || match.team2_players.length > 0

  return (
    <article className={`match-card match-${match.status}`}>
      <header className="match-head">
        <span className="match-title">
          Match {match.match_no} · {MATCH_TYPE_LABELS[match.type]}
        </span>
        <span className="match-format">{formatLabel(match)}</span>
        <span className="match-badges">
          {match.result_type === 'abandoned' ? (
            <StatusBadge status="abandoned" />
          ) : (
            <StatusBadge status={match.status} />
          )}
        </span>
      </header>

      <div className="match-sides">
        <MatchSide name={team1} players={match.team1_players} sets={match.team1_sets_won} won={match.winner === 'team1'} />
        <MatchSide name={team2} players={match.team2_players} sets={match.team2_sets_won} won={match.winner === 'team2'} />
      </div>
      {!lineupIn && match.status !== 'not_played' && (
        <p className="match-note muted">Lineup not in yet: the referee adds it from the slips.</p>
      )}

      {match.sets.length > 0 && (
        <ol className="set-scores" aria-label="Set scores">
          {match.sets.map((set) => (
            <li key={set._id}>
              <span className={set.winner === 'team1' ? 'is-winner' : ''}>{set.team1_points}</span>
              <span aria-hidden="true">–</span>
              <span className={set.winner === 'team2' ? 'is-winner' : ''}>{set.team2_points}</span>
            </li>
          ))}
        </ol>
      )}

      {completed && match.result_type === 'abandoned' && (
        <p className="match-note">
          <strong>{match.winner ? `Awarded to ${match.winner === 'team1' ? team1 : team2}` : 'Declared a draw'}.</strong>{' '}
          {match.note}
        </p>
      )}
      {match.status === 'not_played' && (
        <p className="match-note muted">Not needed: the fixture was already decided.</p>
      )}

      {editing ? (
        <MatchResultForm match={match} team1={team1} team2={team2} onSaved={onSaved} onCancel={onCancel} />
      ) : (
        (canEnter || completed) && (
          <div className="match-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit}>
              {completed ? 'Edit result' : 'Enter result'}
            </button>
            {canClear && (
              <button type="button" className="btn btn-danger btn-sm" onClick={onClear}>
                Clear result
              </button>
            )}
          </div>
        )
      )}
    </article>
  )
}

function MatchSide({ name, players, sets, won }) {
  return (
    <div className={`match-side${won ? ' is-winner' : ''}`}>
      <span className="match-side-name">{name}</span>
      <span className="match-side-players">{players.length > 0 ? playerNames(players) : '—'}</span>
      <span className="match-side-sets" aria-label={`${sets} sets`}>
        {sets}
      </span>
    </div>
  )
}
