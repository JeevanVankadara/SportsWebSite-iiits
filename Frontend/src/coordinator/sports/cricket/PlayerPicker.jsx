import { sameId } from '../../../sports/cricket/format.js'

// Pick one player from a list: the new batter, or the bowler with the overs each one has bowled.
// Players for whom `blocked(player)` is true are shown but cannot be picked.
export default function PlayerPicker({ title, hint, players, detail, tag, blocked, current, busy, onPick, onCancel }) {
  return (
    <div className="co-cr-sheet">
      <div className="co-cr-sheet-head">
        <p className="co-display">{title}</p>
        {onCancel && (
          <button type="button" className="co-btn co-btn-ghost co-btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      {hint && <p className="co-muted co-small">{hint}</p>}
      {players.length === 0 ? (
        <p className="co-muted co-small">No players left to pick.</p>
      ) : (
        <ul className="co-cr-pick">
          {players.map((player) => {
            const label = tag?.(player)
            return (
              <li key={player._id}>
                <button
                  type="button"
                  className={`co-cr-pick-btn${sameId(player._id, current) ? ' is-current' : ''}`}
                  disabled={busy || Boolean(blocked?.(player))}
                  onClick={() => onPick(player)}
                >
                  <span className="co-cr-pick-name">{player.name}</span>
                  <span className="co-muted co-small">{detail ? detail(player) : `@${player.username}`}</span>
                  {label && <span className="co-cr-pick-tag">{label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
