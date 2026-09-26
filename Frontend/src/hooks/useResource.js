import { useEffect, useEffectEvent, useState } from 'react'

// Loads data for a key (e.g. an id) and reloads when the key changes.
// `data` is null while loading; `error` is set if loading failed; `setData` replaces it after a change.
export function useResource(key, load) {
  const [state, setState] = useState({ key: null, data: null, error: '' })
  const [attempt, setAttempt] = useState(0)
  const runLoad = useEffectEvent(load)

  useEffect(() => {
    let ignore = false
    runLoad().then(
      (data) => {
        if (!ignore) setState({ key, data, error: '' })
      },
      (err) => {
        if (!ignore) setState({ key, data: null, error: err.message })
      },
    )
    return () => {
      ignore = true
    }
  }, [key, attempt])

  function retry() {
    setState((current) => ({ ...current, key: null }))
    setAttempt((count) => count + 1)
  }

  function setData(data) {
    setState({ key, data, error: '' })
  }

  // Never hand back data or errors that belong to a different key while the new one loads.
  const current = state.key === key
  return { data: current ? state.data : null, error: current ? state.error : '', setData, retry }
}
