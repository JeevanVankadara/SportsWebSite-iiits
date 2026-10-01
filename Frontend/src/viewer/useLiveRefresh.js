import { useEffect, useEffectEvent, useState } from 'react'
import { viewerApi } from '../api/endpoints.js'

const REFRESH_MS = 60_000

// The home page's live cards, refreshed once a minute. Used only on the home page; every other
// list loads once. Each tick is one small request for the live fixtures (plus the ones shown as
// live, so a match that has just finished is updated too); the rest of the page is left as loaded.
// Ticks are skipped while the tab is hidden; coming back to it refreshes at once if one was missed.
export function useLiveRefresh(fixtures, enabled) {
  const [state, setState] = useState({ updates: new Map(), at: null })

  // Loaded fixtures with the latest refreshed copies swapped in, plus fixtures that went live after
  // the page loaded.
  const merged = fixtures.map((item) => state.updates.get(String(item._id)) ?? item)
  const loadedIds = new Set(fixtures.map((item) => String(item._id)))
  for (const [key, item] of state.updates) if (!loadedIds.has(key)) merged.push(item)

  // An effect event always sees the latest render, so it asks about the cards shown as live now.
  const refresh = useEffectEvent(async () => {
    const shownLive = merged.filter((item) => item.status === 'live').map((item) => String(item._id))
    try {
      const { fixtures: fresh } = await viewerApi.liveFixtures(shownLive)
      setState((previous) => {
        const updates = new Map(previous.updates)
        for (const item of fresh ?? []) updates.set(String(item._id), item)
        return { updates, at: new Date() }
      })
    } catch {
      // Keep the cards as they are; the next tick tries again.
    }
  })

  useEffect(() => {
    if (!enabled) return
    // The page itself was just loaded, which counts as the first refresh.
    let lastRefresh = Date.now()
    const tick = () => {
      if (document.visibilityState === 'hidden') return
      lastRefresh = Date.now()
      refresh()
    }
    // Coming back to a tab that missed a refresh while hidden: refresh straight away.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh >= REFRESH_MS) tick()
    }
    const timer = window.setInterval(tick, REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])

  return { fixtures: merged, refreshedAt: state.at }
}
