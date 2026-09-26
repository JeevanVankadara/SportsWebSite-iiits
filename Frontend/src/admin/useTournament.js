import { useEffect, useState } from 'react'
import { tournamentsApi } from '../api/endpoints.js'

// Loads one tournament. `tournament` is null while loading; `error` is set if loading failed.
export function useTournament(id) {
  const [loaded, setLoaded] = useState({ id: null, tournament: null })
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let ignore = false
    tournamentsApi.get(id).then(
      ({ tournament }) => {
        if (!ignore) setLoaded({ id, tournament })
      },
      (err) => {
        if (!ignore) setError(err.message)
      },
    )
    return () => {
      ignore = true
    }
  }, [id, attempt])

  function retry() {
    setError('')
    setAttempt((count) => count + 1)
  }

  // Replaces the loaded tournament after it was changed, e.g. started or ended.
  function setTournament(tournament) {
    setLoaded({ id, tournament })
  }

  // Never hand back a different tournament's data while a new id is loading.
  const tournament = loaded.id === id ? loaded.tournament : null
  return { tournament, setTournament, error, retry }
}
