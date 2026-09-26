import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { tournamentsApi } from '../../api/endpoints.js'
import PageLoader from '../../components/PageLoader.jsx'
import { adminPath } from '../../config.js'
import { PlusIcon, TrophyIcon } from '../components/icons.jsx'
import Toast from '../../components/Toast.jsx'
import TournamentCard from '../components/TournamentCard.jsx'
import { EmptyState, LoadError, PageHeader } from '../components/ui.jsx'

export default function DashboardPage() {
  const [tournaments, setTournaments] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let ignore = false
    tournamentsApi.list().then(
      (data) => {
        if (!ignore) setTournaments(data.tournaments)
      },
      (err) => {
        if (!ignore) setLoadError(err.message)
      },
    )
    return () => {
      ignore = true
    }
  }, [attempt])

  function retry() {
    setLoadError('')
    setAttempt((count) => count + 1)
  }

  async function runAction(tournament, action) {
    setBusyId(tournament._id)
    try {
      await action()
    } catch (err) {
      setToast(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function endTournament(tournament) {
    if (!window.confirm(`End "${tournament.tournament_name}"? It will move to past tournaments.`)) return
    runAction(tournament, async () => {
      const { tournament: updated } = await tournamentsApi.update(tournament._id, { status: 'completed' })
      setTournaments((list) => list.map((item) => (item._id === updated._id ? updated : item)))
    })
  }

  function deleteTournament(tournament) {
    if (!window.confirm(`Delete "${tournament.tournament_name}"? This cannot be undone.`)) return
    runAction(tournament, async () => {
      await tournamentsApi.remove(tournament._id)
      setTournaments((list) => list.filter((item) => item._id !== tournament._id))
    })
  }

  if (!tournaments) return loadError ? <LoadError message={loadError} onRetry={retry} /> : <PageLoader />

  const ongoing = tournaments.filter((tournament) => tournament.status === 'live')
  const past = tournaments.filter((tournament) => tournament.status === 'completed')

  const renderCards = (list) => (
    <div className="card-grid">
      {list.map((tournament) => (
        <TournamentCard
          key={tournament._id}
          tournament={tournament}
          busy={busyId === tournament._id}
          onEnd={() => endTournament(tournament)}
          onDelete={() => deleteTournament(tournament)}
        />
      ))}
    </div>
  )

  return (
    <>
      <PageHeader title="Dashboard" description="Open a tournament to see its sports and houses." />

      <section className="dash-section" aria-labelledby="ongoing-heading">
        <h2 id="ongoing-heading" className="section-title">
          Ongoing tournaments <span className="count">{ongoing.length}</span>
        </h2>
        {ongoing.length > 0 ? (
          renderCards(ongoing)
        ) : (
          <EmptyState
            icon={<TrophyIcon size={24} />}
            title="Nothing is going on right now"
            text="Add a tournament to get started."
            action={
              <Link to={adminPath('tournaments/new')} className="btn btn-primary">
                <PlusIcon />
                Add tournament
              </Link>
            }
          />
        )}
      </section>

      <section className="dash-section" aria-labelledby="past-heading">
        <h2 id="past-heading" className="section-title">
          Past tournaments <span className="count">{past.length}</span>
        </h2>
        {past.length > 0 ? renderCards(past) : <p className="muted">Finished tournaments will show up here.</p>}
      </section>

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}
