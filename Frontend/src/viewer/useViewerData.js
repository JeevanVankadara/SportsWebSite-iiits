import { retainObservedOvers } from './cricketLiveData.js'
import { useEffect, useEffectEvent, useState } from 'react'

// Loads a page's data once. There is no polling: refreshing repeatedly would reload the same data
// from the server and database for every open tab. Live match pages get updates over SSE instead
// (see useLiveStream); every other page shows what was current when it loaded.
//
// Until the first load succeeds it retries with backoff after server or network errors, and again
// when the connection comes back or the tab becomes visible. After that it never reloads by
// itself; `retry` reloads on request.
export function useViewerData(key, load, enabled = true) {
  const [state, setState] = useState({ key: null, data: null, error: '', updated: null })
  const [attempt, setAttempt] = useState(0)
  const runLoad = useEffectEvent(load)
  useEffect(() => {
    if (!enabled) return
    let active = true
    let pending = false
    let failures = 0
    let loaded = false
    let timer
    const refresh = async () => {
      // Once loaded, nothing reloads automatically. A failed first load waits for a visible tab.
      if (!active || pending || loaded || (failures && document.visibilityState === 'hidden')) return
      window.clearTimeout(timer)
      if (navigator.onLine === false) {
        setState(current => ({ ...current, key, data: current.key === key ? current.data : null, error: 'You’re offline. Scores will load when your connection returns.' }))
        return
      }
      pending = true
      let delay = null
      try {
        const data = await runLoad()
        loaded = true
        if (active) setState(previous => ({ key, data: retainObservedOvers(previous.key === key ? previous.data : null, data), error: '', updated: new Date() }))
      } catch (error) {
        const retryable = !error.status || error.status === 408 || error.status === 429 || error.status >= 500
        delay = retryable ? Math.min(30000, 3000 * 2 ** Math.min(failures++, 4)) : null
        if (active) setState(current => ({ ...current, key, data: retryable && current.key === key ? current.data : null, error: error.message || 'Scores are unavailable. Please try again.' }))
      } finally {
        pending = false
        if (active && delay != null) timer = window.setTimeout(refresh, delay)
      }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    const onOffline = () => {
      if (loaded) return
      window.clearTimeout(timer)
      setState(current => ({ ...current, key, data: current.key === key ? current.data : null, error: 'You’re offline. Scores will load when your connection returns.' }))
    }
    refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', refresh)
    window.addEventListener('offline', onOffline)
    return () => {
      active = false
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', onOffline)
    }
  }, [key, attempt, enabled])
  const current = state.key === key
  return { data: current ? state.data : null, error: current ? state.error : '', updated: current ? state.updated : null, retry: () => setAttempt(n => n + 1) }
}
