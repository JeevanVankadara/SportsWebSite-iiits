import { useEffect, useEffectEvent } from 'react'

// Short message pinned to the bottom of the screen, so it is seen wherever the page is scrolled to.
export default function Toast({ message, onClose }) {
  const close = useEffectEvent(onClose)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => close(), 6000)
    return () => clearTimeout(timer)
  }, [message])

  if (!message) return null
  return (
    <div className="toast" role="alert">
      <span>{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
