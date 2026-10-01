import { Link } from 'react-router'
import { friendliesApi } from '../../api/endpoints.js'
import PageLoader from '../../components/PageLoader.jsx'
import { adminPath } from '../../config.js'
import { useResource } from '../../hooks/useResource.js'
import { formatDateTime } from '../../utils/dates.js'
import { PlusIcon, TrophyIcon } from '../components/icons.jsx'
import { EmptyState, LoadError, PageHeader, StatusBadge } from '../components/ui.jsx'

const GROUPS = [
  { key: 'live', title: 'Live' },
  { key: 'scheduled', title: 'Upcoming' },
  { key: 'completed', title: 'Completed' },
]

// Super admin: every friendly match. Each opens on its sport's own fixture page.
export default function FriendliesPage() {
  const { data: friendlies, error, retry } = useResource('friendlies', () =>
    friendliesApi.list().then((data) => data.friendlies.filter((row) => row.fixture)),
  )

  const addButton = (
    <Link to={adminPath('friendlies/new')} className="btn btn-primary">
      <PlusIcon />
      Add friendly match
    </Link>
  )

  if (!friendlies) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const groupOf = (row) => (['live', 'scheduled'].includes(row.fixture.status) ? row.fixture.status : 'completed')

  return (
    <>
      <PageHeader
        title="Friendly matches"
        description="Single matches outside every tournament, between any two teams. They are not shown on the public site."
        action={addButton}
      />

      {friendlies.length === 0 ? (
        <EmptyState
          icon={<TrophyIcon size={24} />}
          title="No friendly matches yet"
          text="Add one to set up a match between any two teams."
          action={addButton}
        />
      ) : (
        GROUPS.map((group) => {
          const rows = friendlies.filter((row) => groupOf(row) === group.key)
          if (rows.length === 0) return null
          return (
            <section key={group.key} className="dash-section" aria-labelledby={`friendlies-${group.key}`}>
              <h2 id={`friendlies-${group.key}`} className="section-title">
                {group.title} <span className="count">{rows.length}</span>
              </h2>
              <ul className="fixture-list">
                {rows.map((row) => (
                  <FriendlyRow key={row.tournament._id} row={row} />
                ))}
              </ul>
            </section>
          )
        })
      )}
    </>
  )
}

function FriendlyRow({ row }) {
  const { tournament, fixture } = row
  const game = tournament.games[0]
  const teamName = (houseId) => tournament.houses.find((house) => house._id === houseId)?.house_name ?? 'Team'
  const referees = fixture.referees.map((referee) => referee.name).join(', ')
  const winner = ['team1', 'team2'].includes(fixture.result) ? fixture.result : null

  return (
    <li>
      <Link to={adminPath(`tournaments/${tournament._id}/sports/${game._id}/fixtures/${fixture._id}`)} className="fixture-row">
        <div className="fixture-teams">
          <span className={`fixture-team${winner === 'team1' ? ' is-winner' : ''}`}>{teamName(fixture.team1)}</span>
          <span className="fixture-score">vs</span>
          <span className={`fixture-team${winner === 'team2' ? ' is-winner' : ''}`}>{teamName(fixture.team2)}</span>
        </div>
        <div className="fixture-meta">
          <span className="chip">{game.game_name}</span>
          <StatusBadge status={fixture.status} />
          {fixture.scheduled_at && <span>{formatDateTime(fixture.scheduled_at)}</span>}
          <span>{referees ? `Referee: ${referees}` : 'No referee yet'}</span>
        </div>
      </Link>
    </li>
  )
}
