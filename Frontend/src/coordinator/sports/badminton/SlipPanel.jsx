import { useState } from 'react'
import { coordinatorBadmintonApi as api } from '../../../api/endpoints.js'
import { MATCH_TYPE_LABELS, playersPerSide } from '../../../sports/badminton/format.js'
import { Eyebrow } from '../../components/ui.jsx'
import PlayerSlot from './PlayerSlot.jsx'

const TEAMS = ['team1', 'team2']

// Step 2: each house's slip, i.e. who plays each match. The referee types it in and submits it;
// once both houses' slips are in, the lineup is locked and play can start. It can still be corrected later.
export default function SlipPanel({ fixture, matches, names, busy, run, embedded }) {
  const [team, setTeam] = useState('team1')
  const field = `${team}_players`
  // Starts a fresh draft whenever the saved slip changes.
  const version = matches.map((match) => match[field].map((player) => player._id).join(',')).join('|')

  const content = (
    <>
      <div className="co-tabs" role="tablist" aria-label="Slips">
        {TEAMS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            className="co-tab"
            aria-selected={team === item}
            onClick={() => setTeam(item)}
          >
            {names[item]}
            {fixture.slips?.[`${item}_submitted_at`] && <span className="co-tab-check">✓ submitted</span>}
          </button>
        ))}
      </div>
      <SlipEditor
        key={`${team}-${version}`}
        team={team}
        teamName={names[team]}
        submitted={Boolean(fixture.slips?.[`${team}_submitted_at`])}
        matches={matches}
        busy={busy}
        onSave={(lineup, submit) => run(() => api.saveSlip(fixture._id, team, { lineup, submit }))}
      />
    </>
  )

  if (embedded) return content

  return (
    <section className="co-panel">
      <Eyebrow>Step 2</Eyebrow>
      <h2 className="co-display co-display-md">Slips</h2>
      <p className="co-muted">
        Type in each house's slip, then submit it. Once both slips are in, the lineup is locked and play can start.
      </p>
      {content}
    </section>
  )
}

function SlipEditor({ team, teamName, submitted, matches, busy, onSave }) {
  const field = `${team}_players`
  const [draft, setDraft] = useState(() => Object.fromEntries(matches.map((match) => [match._id, match[field]])))
  const rows = matches.filter((match) => match.status !== 'not_played')

  function setPlayer(matchId, slot, player) {
    setDraft((current) => {
      const players = [...(current[matchId] ?? [])]
      if (player) players[slot] = player
      else players.splice(slot, 1)
      return { ...current, [matchId]: players.filter(Boolean) }
    })
  }

  const lineup = rows.map((match) => ({ match: match._id, players: (draft[match._id] ?? []).map((player) => player._id) }))
  const complete = rows.every((match) => (draft[match._id] ?? []).length === playersPerSide(match.type))

  return (
    <div className="co-slip">
      <p className="co-muted co-small">
        {submitted
          ? `${teamName}'s slip is submitted. You can still correct it and save the changes.`
          : `Fill in ${teamName}'s players for every match, then submit the slip.`}
      </p>

      <ol className="co-slip-rows">
        {rows.map((match) => (
          <li key={match._id} className="co-slip-row">
            <div className="co-slip-match">
              <span className="co-display">M{match.match_no}</span>
              <span className="co-muted co-small">{MATCH_TYPE_LABELS[match.type]}</span>
            </div>
            <div className="co-slip-slots">
              {Array.from({ length: playersPerSide(match.type) }, (_, slot) => (
                <PlayerSlot
                  key={slot}
                  player={(draft[match._id] ?? [])[slot] ?? null}
                  onChange={(player) => setPlayer(match._id, slot, player)}
                  label={`${teamName}, match ${match.match_no}, player ${slot + 1}`}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="co-actions">
        {submitted ? (
          <button type="button" className="co-btn co-btn-primary" disabled={busy} onClick={() => onSave(lineup, false)}>
            Save changes
          </button>
        ) : (
          <>
            <button type="button" className="co-btn co-btn-ghost" disabled={busy} onClick={() => onSave(lineup, false)}>
              Save draft
            </button>
            <button
              type="button"
              className="co-btn co-btn-primary"
              disabled={busy || !complete}
              onClick={() => onSave(lineup, true)}
            >
              Submit {teamName}'s slip
            </button>
          </>
        )}
      </div>
    </div>
  )
}
