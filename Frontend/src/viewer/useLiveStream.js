import { useEffect, useEffectEvent, useState } from 'react'
import { retainObservedOvers } from './cricketLiveData.js'
import { useViewerData } from './useViewerData.js'

// Live fixture data over Server-Sent Events. Nothing here polls.
//
// When `streamUrl` is set, this opens an EventSource and renders the full fixture snapshot the
// server pushes on connect and after every change. The browser reconnects on its own if the
// stream drops. If it keeps failing, or the stream cannot be opened at all, the page is loaded
// once with a normal request and says live updates are paused; Retry tries the stream again.
//
// When `streamUrl` is null (preview mode) it is a thin pass-through to useViewerData, so callers
// get an identical { data, error, updated, retry } either way.
//
// Streamed frames arrive as the raw API payload. `map` reshapes each one into exactly what `load`
// returns (loadFixture adds sport/tournamentId to the fixture and nests the payload under
// `detail`), so the page renders identically whether data came from the stream or a normal load.
// If `map` throws, its message is shown like a failed load.
export function useLiveStream({ key, load, streamUrl, map = (payload) => payload }) {
  // The fixture whose stream failed; a fallback applies only to that fixture, so moving to
  // another match tries the stream again.
  const [fallbackKey, setFallbackKey] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ key: null, data: null, error: '', updated: null })
  const usingSse = Boolean(streamUrl) && fallbackKey !== key
  // Retrying goes back to the stream, so a recovered connection is used again.
  const retryStream = () => {
    setFallbackKey(null)
    setAttempt((n) => n + 1)
  }

  // A one-time load, used only when we are not on SSE: preview mode, or after the stream failed.
  const once = useViewerData(key, load, !usingSse)

  // Returns false when the frame could not be shaped, so the caller stops listening.
  const receive = useEffectEvent((raw) => {
    let payload
    try {
      payload = JSON.parse(raw)
    } catch {
      return true // A malformed frame is ignored; the next full snapshot corrects everything.
    }
    try {
      const next = map(payload)
      // Same treatment as loaded data: cricket keeps the overs this viewer has already seen.
      setState((previous) => ({
        key,
        data: retainObservedOvers(previous.key === key ? previous.data : null, next),
        error: '',
        updated: new Date(),
      }))
      return true
    } catch (error) {
      setState({ key, data: null, error: error.message || 'Scores are unavailable. Please try again.', updated: null })
      return false
    }
  })

  useEffect(() => {
    if (!usingSse) return
    let failures = 0
    const source = new EventSource(streamUrl)

    const onUpdate = (event) => {
      failures = 0
      if (!receive(event.data)) source.close()
    }
    source.addEventListener('score_update', onUpdate)
    source.addEventListener('match_complete', (event) => {
      onUpdate(event)
      source.close() // The match is over: nothing more will change, so don't reconnect.
    })
    source.onopen = () => {
      failures = 0
    }
    source.onerror = () => {
      // CLOSED means the browser will not retry (e.g. the stream answered 404 or not as a
      // stream); fall back now so a normal load can show the page or the real error. Otherwise
      // it is reconnecting by itself; tolerate a few blips before falling back.
      failures += 1
      if (source.readyState === EventSource.CLOSED || failures >= 4) {
        source.close()
        setFallbackKey(key)
      }
    }

    return () => source.close()
  }, [key, streamUrl, usingSse, attempt])

  if (!usingSse) {
    if (!streamUrl) return once
    // The stream failed: show the one-time load, and say it will not update by itself
    // (unless the match is already over, when there is nothing more to update).
    const paused = once.data && !once.error && once.data.fixture?.status !== 'completed'
    return {
      ...once,
      error: paused ? 'Live updates are paused. Refresh the page to see the latest score.' : once.error,
      retry: retryStream,
    }
  }

  const current = state.key === key
  return {
    data: current ? state.data : null,
    error: current ? state.error : '',
    updated: current ? state.updated : null,
    retry: retryStream,
  }
}
