import { tournamentsApi } from '../api/endpoints.js'
import { useResource } from '../hooks/useResource.js'

// Loads one tournament. `tournament` is null while loading; `error` is set if loading failed.
export function useTournament(id) {
  const { data, error, setData, retry } = useResource(id, () =>
    tournamentsApi.get(id).then(({ tournament }) => tournament),
  )
  return { tournament: data, setTournament: setData, error, retry }
}
