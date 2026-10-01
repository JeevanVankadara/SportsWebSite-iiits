import { useEffect, useState } from 'react'
import { coordinatorPlayersApi } from '../../api/endpoints.js'
import { playerHandle } from '../../sports/playerHandle.js'
import { useAddGuest } from './guestContext.js'

// One player on a slip or squad: shows the chosen player, or a search box to find one by username,
// name or roll number. Players whose ids are in `exclude` are left out of the results.
// Inside a GuestScope, someone without an account can be added by name, for this match only.
export default function PlayerSlot({ player, onChange, label, exclude }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ search: '', players: [], error: '' })
  const [guest, setGuest] = useState({ busy: false, error: '' })
  const addGuest = useAddGuest()
  const search = query.trim()

  useEffect(() => {
    if (!search) return
    let ignore = false
    const timer = setTimeout(() => {
      coordinatorPlayersApi.search(search).then(
        ({ players }) => {
          if (!ignore) setResults({ search, players, error: '' })
        },
        (err) => {
          if (!ignore) setResults({ search, players: [], error: err.message })
        },
      )
    }, 250)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [search])

  if (player) {
    return (
      <span className="co-player-chip">
        <span>
          {player.name} <span className="co-muted">{playerHandle(player)}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} aria-label={`Remove ${player.name}`}>
          ×
        </button>
      </span>
    )
  }

  const upToDate = search !== '' && results.search === search
  const options = upToDate ? results.players.filter((option) => !exclude?.has(option._id)) : []
  const canAddGuest = Boolean(addGuest) && search.length >= 2

  function pick(chosen) {
    onChange(chosen)
    setQuery('')
    setGuest({ busy: false, error: '' })
  }

  async function addAsGuest() {
    setGuest({ busy: true, error: '' })
    try {
      const added = await addGuest(search)
      if (exclude?.has(added._id)) {
        setGuest({ busy: false, error: `${added.name} is already in this match.` })
        return
      }
      pick(added)
    } catch (err) {
      setGuest({ busy: false, error: err.message })
    }
  }

  return (
    <div className="co-player-search">
      <input
        className="co-input"
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          if (guest.error) setGuest({ busy: false, error: '' })
        }}
        onKeyDown={(event) => {
          // Enter picks the first match instead of submitting anything.
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault()
            if (options.length > 0) pick(options[0])
          }
        }}
        placeholder="Username, name or roll no."
        aria-label={label}
        autoComplete="off"
      />
      {search && (
        <div className="co-results">
          {!upToDate && <p className="co-results-note">Searching…</p>}
          {upToDate && results.error && <p className="co-results-note">{results.error}</p>}
          {upToDate && !results.error && options.length === 0 && <p className="co-results-note">No players found</p>}
          {(options.length > 0 || canAddGuest) && (
            <ul>
              {options.map((option) => (
                <li key={option._id}>
                  <button type="button" onClick={() => pick(option)}>
                    <span>{option.name}</span>
                    <span className="co-muted">
                      @{option.username} · {option.roll_number}
                    </span>
                  </button>
                </li>
              ))}
              {canAddGuest && (
                <li>
                  <button type="button" onClick={addAsGuest} disabled={guest.busy}>
                    <span>{guest.busy ? 'Adding…' : `+ Add “${search}” for this match only`}</span>
                    <span className="co-muted">No account needed. Not added to the player list.</span>
                  </button>
                </li>
              )}
            </ul>
          )}
          {guest.error && <p className="co-results-note" role="alert">{guest.error}</p>}
        </div>
      )}
    </div>
  )
}
