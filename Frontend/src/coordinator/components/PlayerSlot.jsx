import { useEffect, useState } from 'react'
import { coordinatorPlayersApi } from '../../api/endpoints.js'

// One player on a slip or squad: shows the chosen player, or a search box to find one by username,
// name or roll number. Players whose ids are in `exclude` are left out of the results.
export default function PlayerSlot({ player, onChange, label, exclude }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ search: '', players: [], error: '' })
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
          {player.name} <span className="co-muted">@{player.username}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} aria-label={`Remove ${player.name}`}>
          ×
        </button>
      </span>
    )
  }

  const upToDate = search !== '' && results.search === search
  const options = upToDate ? results.players.filter((option) => !exclude?.has(option._id)) : []

  function pick(chosen) {
    onChange(chosen)
    setQuery('')
  }

  return (
    <div className="co-player-search">
      <input
        className="co-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
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
          {options.length > 0 && (
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
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
