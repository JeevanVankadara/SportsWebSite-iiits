import { useEffect, useState } from 'react'
import { configOf, TEAMS } from './format.js'
import './throwball.css'
import { playerHandle } from '../playerHandle.js'

const ids = (players) => players.map((player) => player._id)

function savedLineup(fixture, team) {
  const lineup = fixture[`${team}_lineup`]
  return { starters: lineup?.starters ?? [], bench: lineup?.bench ?? [] }
}

// Each house's 5 starters and up to 3 substitutes. Both houses keep their own draft, so switching
// tabs never loses what was picked; Submit saves only the house on screen.
// searchPlayers(text) -> Promise<{ players }> uses the admin or co-ordinator player search.
// addGuest(name) -> Promise<player>, when given, lets someone without an account be added by name
// for this match only.
export default function LineupEditor({ fixture, names, api, busy, run, searchPlayers, addGuest }) {
  const [activeTeam, setActiveTeam] = useState('team1')
  const [drafts, setDrafts] = useState(() => Object.fromEntries(TEAMS.map((team) => [team, savedLineup(fixture, team)])))
  const { starters, bench } = drafts[activeTeam]

  // A player can be named once in the whole fixture.
  const named = new Set(TEAMS.flatMap((team) => [...ids(drafts[team].starters), ...ids(drafts[team].bench)]))

  const update = (key, change) =>
    setDrafts((current) => ({ ...current, [activeTeam]: { ...current[activeTeam], [key]: change(current[activeTeam][key]) } }))

  const isDirty = (team) => {
    const saved = savedLineup(fixture, team)
    return ['starters', 'bench'].some((key) => ids(drafts[team][key]).join() !== ids(saved[key]).join())
  }

  function submit(event) {
    event.preventDefault()
    run(() => api.saveSlip(fixture._id, activeTeam, { starters: ids(starters), bench: ids(bench) }))
  }

  const complete = starters.length === configOf(fixture).players_on_court

  return (
    <form className="vb tb-form" onSubmit={submit}>
      <div className="tb-seg" role="tablist" aria-label="House">
        {TEAMS.map((team) => (
          <button key={team} type="button" role="tab" aria-selected={activeTeam === team} aria-pressed={activeTeam === team} onClick={() => setActiveTeam(team)}>
            {names[team]}
            {isDirty(team) ? (
              <span className="tb-seg-note is-pending"> · not saved</span>
            ) : (
              fixture.slips?.[`${team}_submitted_at`] && <span className="tb-seg-note"> · ✓</span>
            )}
          </button>
        ))}
      </div>

      <PlayerGroup
        title={`Starting players (${starters.length}/${configOf(fixture).players_on_court})`}
        players={starters}
        max={configOf(fixture).players_on_court}
        onRemove={(id) => update('starters', (list) => list.filter((player) => player._id !== id))}
        onAdd={(player) => update('starters', (list) => [...list, player])}
        exclude={named}
        searchPlayers={searchPlayers}
        addGuest={addGuest}
      />
      <PlayerGroup
        title={`Substitutes (${bench.length}/${configOf(fixture).max_substitutes})`}
        players={bench}
        max={configOf(fixture).max_substitutes}
        onRemove={(id) => update('bench', (list) => list.filter((player) => player._id !== id))}
        onAdd={(player) => update('bench', (list) => [...list, player])}
        exclude={named}
        searchPlayers={searchPlayers}
        addGuest={addGuest}
      />

      <div className="tb-row">
        <button type="submit" className="tb-btn tb-btn-primary" disabled={busy || !complete}>
          Submit {names[activeTeam]} lineup
        </button>
        {!complete && <span className="tb-hint">Pick exactly {configOf(fixture).players_on_court} starting players.</span>}
      </div>
    </form>
  )
}

function PlayerGroup({ title, players, max, onRemove, onAdd, exclude, searchPlayers, addGuest }) {
  return (
    <div className="tb-group">
      <p className="tb-step">{title}</p>
      {players.length > 0 && (
        <div className="tb-chips">
          {players.map((player) => (
            <span key={player._id} className="tb-chip tb-chip-static">
              {player.name} <span className="tb-muted">{playerHandle(player)}</span>
              <button type="button" className="tb-chip-x" onClick={() => onRemove(player._id)} aria-label={`Remove ${player.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {players.length < max && (
        <PlayerSearch onPick={onAdd} exclude={exclude} searchPlayers={searchPlayers} addGuest={addGuest} />
      )}
    </div>
  )
}

function PlayerSearch({ onPick, exclude, searchPlayers, addGuest }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ search: '', players: [], error: '' })
  const [guest, setGuest] = useState({ busy: false, error: '' })
  const search = query.trim()
  const canAddGuest = Boolean(addGuest) && search.length >= 2

  useEffect(() => {
    if (!search) return
    let ignore = false
    const timer = setTimeout(() => {
      searchPlayers(search).then(
        ({ players }) => !ignore && setResults({ search, players, error: '' }),
        (err) => !ignore && setResults({ search, players: [], error: err.message }),
      )
    }, 250)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [search, searchPlayers])

  const upToDate = search !== '' && results.search === search
  const options = upToDate ? results.players.filter((player) => !exclude.has(player._id)) : []

  function pick(player) {
    onPick(player)
    setQuery('')
    setGuest({ busy: false, error: '' })
  }

  // Someone without an account, added by name for this match only.
  async function addAsGuest() {
    setGuest({ busy: true, error: '' })
    try {
      const added = await addGuest(search)
      if (exclude.has(added._id)) {
        setGuest({ busy: false, error: `${added.name} is already in this match.` })
        return
      }
      pick(added)
    } catch (err) {
      setGuest({ busy: false, error: err.message })
    }
  }

  return (
    <div className="tb-search">
      <input
        className="tb-input"
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          if (guest.error) setGuest({ busy: false, error: '' })
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault()
            if (options.length > 0) pick(options[0])
          }
        }}
        placeholder="Add a player: username, name or roll no."
        aria-label="Search players"
        autoComplete="off"
      />
      {search && (
        <div className="tb-results">
          {!upToDate && <p className="tb-hint">Searching…</p>}
          {upToDate && results.error && <p className="tb-hint">{results.error}</p>}
          {upToDate && !results.error && options.length === 0 && <p className="tb-hint">No players found</p>}
          {(options.length > 0 || canAddGuest) && (
            <ul>
              {options.map((player) => (
                <li key={player._id}>
                  <button type="button" onClick={() => pick(player)}>
                    {player.name}{' '}
                    <span className="tb-muted">
                      @{player.username} · {player.roll_number}
                    </span>
                  </button>
                </li>
              ))}
              {canAddGuest && (
                <li>
                  <button type="button" onClick={addAsGuest} disabled={guest.busy}>
                    {guest.busy ? 'Adding…' : `+ Add “${search}” for this match only`}{' '}
                    <span className="tb-muted">No account needed. Not added to the player list.</span>
                  </button>
                </li>
              )}
            </ul>
          )}
          {guest.error && (
            <p className="tb-hint" role="alert">
              {guest.error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
