import { useState } from 'react'
import { coordinatorCricketApi as api } from '../../../api/endpoints.js'
import { MAX_SUBSTITUTES, PLAYING_XI, TEAMS } from '../../../sports/cricket/format.js'
import { GuestScope } from '../../components/guestScope.jsx'
import PlayerSlot from '../../components/PlayerSlot.jsx'
import { Eyebrow } from '../../components/ui.jsx'

const ids = (list) => list.filter(Boolean).map((player) => player._id)
const slots = (players, size) => Array.from({ length: size }, (_, index) => players[index] ?? null)

// Step 1: overs, powerplay and both squads (11 players and up to 3 substitutes each), picked by username.
// It can be saved part-filled; the toss needs 11 players on both sides.
export default function SetupPanel({ fixture, names, busy, run, collapsible }) {
  const version = [
    fixture.overs,
    fixture.powerplay_overs,
    ...TEAMS.flatMap((team) => [...ids(fixture[`${team}_players`]), '|', ...ids(fixture[`${team}_substitutes`])]),
  ].join(',')
  return (
    <GuestScope sport="cricket" fixtureId={fixture._id}>
      <SetupEditor
        key={version}
        fixture={fixture}
        names={names}
        busy={busy}
        collapsible={collapsible}
        onSave={(data) => run(() => api.saveSetup(fixture._id, data))}
      />
    </GuestScope>
  )
}

function SetupEditor({ fixture, names, busy, collapsible, onSave }) {
  const [overs, setOvers] = useState(fixture.overs ? String(fixture.overs) : '')
  const [powerplay, setPowerplay] = useState(fixture.overs ? String(fixture.powerplay_overs) : '')
  const [team, setTeam] = useState('team1')
  const [squads, setSquads] = useState(() =>
    Object.fromEntries(
      TEAMS.map((item) => [
        item,
        {
          players: slots(fixture[`${item}_players`], PLAYING_XI),
          substitutes: slots(fixture[`${item}_substitutes`], MAX_SUBSTITUTES),
        },
      ]),
    ),
  )

  const named = new Set(TEAMS.flatMap((item) => [...ids(squads[item].players), ...ids(squads[item].substitutes)]))
  const filled = (item) => ids(squads[item].players).length

  function setSlot(list, index, player) {
    setSquads((current) => ({
      ...current,
      [team]: { ...current[team], [list]: current[team][list].map((item, i) => (i === index ? player : item)) },
    }))
  }

  function save(event) {
    event.preventDefault()
    onSave({
      overs,
      powerplay_overs: powerplay,
      ...Object.fromEntries(
        TEAMS.map((item) => [item, { players: ids(squads[item].players), substitutes: ids(squads[item].substitutes) }]),
      ),
    })
  }

  const form = (
    <form className="co-cr-setup" onSubmit={save}>
      <div className="co-cr-fields">
        <label className="co-field">
          <span className="co-label">Overs per innings</span>
          <input
            className="co-input"
            type="number"
            inputMode="numeric"
            min="1"
            max="50"
            value={overs}
            onChange={(event) => setOvers(event.target.value)}
            placeholder="e.g. 10"
            required
          />
        </label>
        <label className="co-field">
          <span className="co-label">Powerplay overs</span>
          <input
            className="co-input"
            type="number"
            inputMode="numeric"
            min="0"
            max={overs || 50}
            value={powerplay}
            onChange={(event) => setPowerplay(event.target.value)}
            placeholder="e.g. 3"
            required
          />
        </label>
      </div>

      <div className="co-tabs" role="tablist" aria-label="Squads">
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
            <span className={`co-tab-check${filled(item) === PLAYING_XI ? '' : ' is-pending'}`}>
              {filled(item)}/{PLAYING_XI}
            </span>
          </button>
        ))}
      </div>
      <p className="co-muted co-small">
        Search by username, name or roll number. A player can play for one house only, so players already picked are
        hidden.
      </p>

      <ol className="co-cr-squad" aria-label={`${names[team]} playing XI`}>
        {squads[team].players.map((player, index) => (
          <li key={`${team}-${index}`}>
            <span className="co-cr-squad-no">{index + 1}</span>
            <PlayerSlot
              player={player}
              onChange={(chosen) => setSlot('players', index, chosen)}
              label={`${names[team]} player ${index + 1}`}
              exclude={named}
            />
          </li>
        ))}
      </ol>

      <p className="co-label">Substitutes (optional)</p>
      <ol className="co-cr-squad" aria-label={`${names[team]} substitutes`}>
        {squads[team].substitutes.map((player, index) => (
          <li key={`${team}-sub-${index}`}>
            <span className="co-cr-squad-no">S{index + 1}</span>
            <PlayerSlot
              player={player}
              onChange={(chosen) => setSlot('substitutes', index, chosen)}
              label={`${names[team]} substitute ${index + 1}`}
              exclude={named}
            />
          </li>
        ))}
      </ol>
      <p className="co-muted co-small">Substitutes can field, but cannot bat or bowl.</p>

      <div className="co-actions">
        <button type="submit" className="co-btn co-btn-primary" disabled={busy}>
          Save setup
        </button>
      </div>
    </form>
  )

  if (collapsible) {
    return (
      <details className="co-panel co-manage">
        <summary>Change the overs or squads</summary>
        {form}
      </details>
    )
  }

  return (
    <section className="co-panel">
      <Eyebrow>Step 1</Eyebrow>
      <h2 className="co-display co-display-md">Setup</h2>
      <p className="co-muted co-small">
        Set the overs and the powerplay, then each house's playing XI. You can save and come back to it.
      </p>
      {form}
    </section>
  )
}
