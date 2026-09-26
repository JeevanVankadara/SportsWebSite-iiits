import { Link } from 'react-router'
import { coordinatorPath } from '../../config.js'

const STATUS_LABELS = {
  scheduled: 'Upcoming',
  live: 'Live',
  completed: 'Completed',
  pending: 'Pending',
  not_played: 'Not played',
  abandoned: 'Abandoned',
}

// Small uppercase label above a heading, e.g. "§ 01 — Assigned games".
export function Eyebrow({ children }) {
  return <p className="co-eyebrow">{children}</p>
}

export function StatusPill({ status }) {
  return (
    <span className={`co-pill co-pill-${status}`}>
      {status === 'live' && <span className="co-live-dot" aria-hidden="true" />}
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function CoEmpty({ title, text, action }) {
  return (
    <div className="co-empty">
      <p className="co-empty-title">{title}</p>
      {text && <p className="co-empty-text">{text}</p>}
      {action}
    </div>
  )
}

export function CoError({ message, onRetry }) {
  return (
    <CoEmpty
      title="Could not load this page"
      text={message}
      action={
        <button type="button" className="co-btn co-btn-ghost" onClick={onRetry}>
          Try again
        </button>
      }
    />
  )
}

export function CoNotFound() {
  return (
    <main className="co-main">
      <CoEmpty
        title="Page not found"
        text="This page does not exist."
        action={
          <Link to={coordinatorPath('games')} className="co-btn co-btn-primary">
            Go to my games
          </Link>
        }
      />
    </main>
  )
}
