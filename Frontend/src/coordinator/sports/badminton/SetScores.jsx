import { useState } from 'react'
import { coordinatorBadmintonApi as api } from '../../../api/endpoints.js'
import SetScoreEditor from './SetScoreEditor.jsx'

// The set scores of one match, each with an edit (✎) button when the referee may correct it.
export default function SetScores({ match, names, editable, busy, run }) {
  const [editingId, setEditingId] = useState(null)
  const editing = match.sets.find((set) => set._id === editingId)

  async function save(score) {
    if (await run(() => api.editSet(editing._id, score))) setEditingId(null)
  }

  return (
    <div className="co-sets">
      <ol className="co-set-chips" aria-label={`Match ${match.match_no} set scores`}>
        {match.sets.map((set) => (
          <li key={set._id} className={`co-set-chip${set.status === 'live' ? ' is-live' : ''}`}>
            <span className="co-set-no">S{set.set_no}</span>
            <span className={set.winner === 'team1' ? 'is-winner' : ''}>{set.team1_points}</span>
            <span aria-hidden="true">–</span>
            <span className={set.winner === 'team2' ? 'is-winner' : ''}>{set.team2_points}</span>
            {editable && (
              <button
                type="button"
                className="co-edit-btn"
                onClick={() => setEditingId(set._id)}
                disabled={busy}
                aria-label={`Edit the score of set ${set.set_no}`}
              >
                ✎
              </button>
            )}
          </li>
        ))}
      </ol>
      {editing && (
        <SetScoreEditor
          key={editing._id}
          set={editing}
          names={names}
          busy={busy}
          onSave={save}
          onCancel={() => setEditingId(null)}
        />
      )}
    </div>
  )
}
