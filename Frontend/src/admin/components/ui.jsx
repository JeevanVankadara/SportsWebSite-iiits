import { Link } from 'react-router'

const STATUS_LABELS = { live: 'Live', completed: 'Completed' }

// items: [{ label, to }]; the last item is the current page and is not a link.
export function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) =>
          index < items.length - 1 ? (
            <li key={item.to}>
              <Link to={item.to}>{item.label}</Link>
            </li>
          ) : (
            <li key="current" aria-current="page">
              {item.label}
            </li>
          ),
        )}
      </ol>
    </nav>
  )
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {status === 'live' && <span className="live-dot" aria-hidden="true" />}
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function Alert({ children }) {
  return (
    <div className="alert" role="alert">
      {children}
    </div>
  )
}

export function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <p className="empty-state-title">{title}</p>
      {text && <p className="empty-state-text">{text}</p>}
      {action}
    </div>
  )
}

export function LoadError({ message, onRetry }) {
  return (
    <EmptyState
      title="Could not load this page"
      text={message}
      action={
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      }
    />
  )
}
