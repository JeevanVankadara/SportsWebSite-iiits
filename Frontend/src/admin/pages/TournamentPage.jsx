import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { tournamentsApi } from '../../api/endpoints.js'
import { useAuth } from '../../auth/authContext.js'
import PageLoader from '../../components/PageLoader.jsx'
import { adminPath } from '../../config.js'
import { CalendarIcon } from '../components/icons.jsx'
import Toast from '../../components/Toast.jsx'
import { Breadcrumbs, EmptyState, LoadError, StatusBadge } from '../components/ui.jsx'
import { canManageSport, isSuperAdmin } from '../permissions.js'
import { useTournament } from '../useTournament.js'
import { formatDateRange } from '../../utils/dates.js'

export default function TournamentPage() {
  const { id } = useParams()
  const { user: admin } = useAuth()
  const isSuper = isSuperAdmin(admin)
  const { tournament, setTournament, error, retry } = useTournament(id)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  async function changeStatus(status) {
    if (status === 'completed' && !window.confirm(`End "${tournament.tournament_name}"? It will move to past tournaments.`)) {
      return
    }
    setBusy(true)
    try {
      const { tournament: updated } = await tournamentsApi.update(id, { status })
      setTournament(updated)
    } catch (err) {
      setToast(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!tournament) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const { tournament_name, status, games, houses } = tournament
  const dates = formatDateRange(tournament.start_date, tournament.end_date)

  return (
    <>
      <Breadcrumbs items={[{ label: 'Dashboard', to: adminPath('dashboard') }, { label: tournament_name }]} />

      <div className="page-header">
        <div>
          <div className="tournament-meta">
            <StatusBadge status={status} />
            {dates && (
              <span className="t-card-dates">
                <CalendarIcon size={15} />
                {dates}
              </span>
            )}
          </div>
          <h1 className="page-title">{tournament_name}</h1>
        </div>
        {isSuper && (
        <div className="page-actions">
          {status === 'live' ? (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => changeStatus('completed')}>
              End tournament
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => changeStatus('live')}>
              Reopen tournament
            </button>
          )}
          <Link to={adminPath(`tournaments/${id}/edit`)} className="btn btn-ghost">
            Edit tournament
          </Link>
        </div>
        )}
      </div>

      <section className="dash-section" aria-labelledby="sports-heading">
        <h2 id="sports-heading" className="section-title">
          Sports <span className="count">{games.length}</span>
        </h2>
        {games.length > 0 ? (
          <div className="sport-grid">
            {games.map((game) =>
              canManageSport(admin, game.game_name) ? (
                <Link key={game._id} to={adminPath(`tournaments/${id}/sports/${game._id}`)} className="sport-tile">
                  <span className="sport-initial" aria-hidden="true">
                    {game.game_name.charAt(0)}
                  </span>
                  <span className="sport-name">{game.game_name}</span>
                  <span className="sport-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              ) : (
                // A sport this admin was not given: shown, but it does not open.
                <div key={game._id} className="sport-tile sport-tile-locked">
                  <span className="sport-initial" aria-hidden="true">
                    {game.game_name.charAt(0)}
                  </span>
                  <span className="sport-name">{game.game_name}</span>
                  <span className="sport-lock">No access</span>
                </div>
              ),
            )}
          </div>
        ) : (
          <EmptyState
            title="No sports picked yet"
            text={isSuper ? 'Edit the tournament to choose the sports it includes.' : 'The super admin picks the sports.'}
            action={
              isSuper && (
                <Link to={adminPath(`tournaments/${id}/edit`)} className="btn btn-primary">
                  Edit tournament
                </Link>
              )
            }
          />
        )}
      </section>

      <section className="dash-section" aria-labelledby="houses-heading">
        <h2 id="houses-heading" className="section-title">
          Houses <span className="count">{houses.length}</span>
        </h2>
        {houses.length > 0 ? (
          <ul className="chips house-summary">
            {houses.map((house) => (
              <li key={house._id} className="chip">
                {house.house_name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{isSuper ? 'No houses yet. Add them from Edit tournament.' : 'No houses yet.'}</p>
        )}
      </section>

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}
