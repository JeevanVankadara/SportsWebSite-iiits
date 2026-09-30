import { retainObservedOvers } from './cricketLiveData.js'
import { useEffect, useEffectEvent, useState } from 'react'

export function useViewerData(key, load, live = false, enabled = true) {
  const [state, setState] = useState({
    key: null,
    data: null,
    error: '',
    updated: null,
  })
  const [attempt, setAttempt] = useState(0)
  const runLoad = useEffectEvent(load)
  const hasLiveData = useEffectEvent(() => {
    const data = state.data
    return (
      !data ||
      data?.fixture?.status === 'live' ||
      data?.fixtures?.some((fixture) => fixture.status === 'live')
    )
  })

  useEffect(() => {
    if (!enabled) return
    let active = true
    let pending = false
    const refresh = () => {
      if (document.visibilityState === 'hidden' || pending) return
      pending = true
      Promise.resolve()
        .then(() => runLoad())
        .then(
          (data) => {
            if (active) setState(previous => ({ key, data: retainObservedOvers(previous.key === key ? previous.data : null, data), error: '', updated: new Date() }))
          },
          (error) => {
            if (active)
              setState((current) => ({
                ...current,
                key,
                data: current.key === key ? current.data : null,
                error: error.message,
              }))
          },
        )
        .finally(() => {
          pending = false
        })
    }
    refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && hasLiveData()) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = live
      ? window.setInterval(() => {
          if (hasLiveData()) refresh()
        }, 10000)
      : null
    return () => {
      active = false
      if (timer) window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [key, attempt, live, enabled])

  const current = state.key === key
  return {
    data: current ? state.data : null,
    error: current ? state.error : '',
    updated: current ? state.updated : null,
    retry: () => setAttempt((n) => n + 1),
  }
}
