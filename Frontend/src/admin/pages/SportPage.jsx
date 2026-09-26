import { Link, useParams } from 'react-router'
import PageLoader from '../../components/PageLoader.jsx'
import { adminPath } from '../../config.js'
import { TrophyIcon } from '../components/icons.jsx'
import { Breadcrumbs, EmptyState, LoadError } from '../components/ui.jsx'
import { useTournament } from '../useTournament.js'

// Placeholder for one sport inside a tournament. Matches and scores will be managed here later.
export default function SportPage() {
  const { id, gameId } = useParams()
  const { tournament, error, retry } = useTournament(id)

  if (!tournament) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const tournamentUrl = adminPath(`tournaments/${id}`)
  const sport = tournament.games.find((game) => game._id === gameId)
  const backButton = (
    <Link to={tournamentUrl} className="btn btn-secondary">
      Back to {tournament.tournament_name}
    </Link>
  )

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: adminPath('dashboard') },
          { label: tournament.tournament_name, to: tournamentUrl },
          { label: sport?.game_name ?? 'Sport' },
        ]}
      />

      {sport ? (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">{sport.game_name}</h1>
              <p className="page-description">{tournament.tournament_name}</p>
            </div>
          </div>
          <EmptyState
            icon={<TrophyIcon size={24} />}
            title="Coming soon"
            text={`Matches and live scores for ${sport.game_name} will be managed here.`}
            action={backButton}
          />
        </>
      ) : (
        <EmptyState
          title="Sport not found"
          text="This sport is not part of the tournament anymore."
          action={backButton}
        />
      )}
    </>
  )
}
