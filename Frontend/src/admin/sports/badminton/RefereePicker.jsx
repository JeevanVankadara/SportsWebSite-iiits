import { useEffect, useState } from 'react'
import { playersApi } from '../../../api/endpoints.js'

// Search registered players by username, name or roll number and add them as referees.
// referees: [{ _id, name, username }]
export default function RefereePicker({ referees, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ search: '', players: [], error: '' })
  const search = query.trim()

  useEffect(() => {
    if (!search) return
    let ignore = false
    const timer = setTimeout(() => {
      playersApi.search(search).then(
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

  const upToDate = search !== '' && results.search === search
  const chosen = new Set(referees.map((referee) => referee._id))
  const options = upToDate ? results.players.filter((player) => !chosen.has(player._id)) : []

  function add(player) {
    onChange([...referees, player])
    setQuery('')
  }

  function handleKeyDown(event) {
    // Enter picks the first match instead of submitting the whole form.
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      if (options.length > 0) add(options[0])
    }
  }

  return (
    <div className="referee-picker">
      {referees.length > 0 ? (
        <ul className="house-list">
          {referees.map((referee) => (
            <li key={referee._id} className="house-chip">
              <span>
                {referee.name} <span className="muted">@{referee.username}</span>
              </span>
              <button
                type="button"
                className="house-remove"
                onClick={() => onChange(referees.filter((item) => item._id !== referee._id))}
                aria-label={`Remove ${referee.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="field-hint">No referee yet. A fixture can have more than one.</p>
      )}

      <input
        className="input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search players by username, name or roll number"
        aria-label="Search players to add as referee"
        autoComplete="off"
      />

      {search && !upToDate && <p className="field-hint">Searching…</p>}
      {upToDate && results.error && <p className="field-error">{results.error}</p>}
      {upToDate && !results.error && options.length === 0 && (
        <p className="field-hint">No players found. Players show up here after they register.</p>
      )}
      {options.length > 0 && (
        <ul className="search-results">
          {options.map((player) => (
            <li key={player._id}>
              <button type="button" onClick={() => add(player)}>
                <span className="search-result-name">{player.name}</span>
                <span className="muted">
                  @{player.username} · {player.roll_number}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
