import { Link } from 'react-router'
import { adminPath } from '../../config.js'
import { formatDateRange } from '../utils.js'
import { CalendarIcon } from './icons.jsx'
import { StatusBadge } from './ui.jsx'

// The whole card opens the tournament; the buttons at the bottom sit above that link.
export default function TournamentCard({ tournament, busy, onEnd, onDelete }) {
  const { _id, tournament_name, status, games, houses } = tournament
  const dates = formatDateRange(tournament.start_date, tournament.end_date)

  return (
    <article className={`t-card t-card-${status}`}>
      <div className="t-card-head">
        <StatusBadge status={status} />
        {dates && (
          <span className="t-card-dates">
            <CalendarIcon size={15} />
            {dates}
          </span>
        )}
      </div>

      <h3 className="t-card-title">
        <Link to={adminPath(`tournaments/${_id}`)} className="t-card-link">
          {tournament_name}
        </Link>
      </h3>

      <dl className="t-card-meta">
        <div>
          <dt>Sports</dt>
          <dd>
            <NameList items={games} field="game_name" empty="No sports picked yet" />
          </dd>
        </div>
        <div>
          <dt>Houses</dt>
          <dd>
            <NameList items={houses} field="house_name" empty="No houses added yet" />
          </dd>
        </div>
      </dl>

      <div className="t-card-actions">
        {status === 'live' && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onEnd}>
            End tournament
          </button>
        )}
        <Link to={adminPath(`tournaments/${_id}/edit`)} className="btn btn-ghost btn-sm">
          Edit
        </Link>
        <button type="button" className="btn btn-danger btn-sm t-card-delete" disabled={busy} onClick={onDelete}>
          Delete
        </button>
      </div>
    </article>
  )
}

function NameList({ items, field, empty }) {
  if (!items.length) return <span className="muted">{empty}</span>
  return (
    <ul className="chips">
      {items.map((item) => (
        <li key={item._id} className="chip">
          {item[field]}
        </li>
      ))}
    </ul>
  )
}
