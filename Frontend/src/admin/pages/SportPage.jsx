import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/authContext.js'
import PageLoader from '../../components/PageLoader.jsx'
import { adminPath } from '../../config.js'
import { TrophyIcon } from '../components/icons.jsx'
import { Breadcrumbs, EmptyState, LoadError } from '../components/ui.jsx'
import BadmintonRoutes from '../sports/badminton/BadmintonRoutes.jsx'
import FootballRoutes from '../sports/football/FootballRoutes.jsx'
import CricketRoutes from '../sports/cricket/CricketRoutes.jsx'
import KabaddiRoutes from '../sports/kabaddi/KabaddiRoutes.jsx'
import VolleyballRoutes from '../sports/volleyball/VolleyballRoutes.jsx'
import { canManageSport } from '../permissions.js'
import { useTournament } from '../useTournament.js'

// Each sport has its own section under src/admin/sports/. Sports without one show a placeholder.
export default function SportPage() {
  const { id, gameId } = useParams()
  const { user: admin } = useAuth()
  const { tournament, error, retry } = useTournament(id)

  if (!tournament) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const tournamentUrl = adminPath(`tournaments/${id}`)
  const sport = tournament.games.find((game) => game._id === gameId)
  const allowed = Boolean(sport) && canManageSport(admin, sport.game_name)
  const sportName = allowed ? sport.game_name.toLowerCase() : ''
  if (sportName === 'badminton') {
    return <BadmintonRoutes tournament={tournament} sport={sport} />
  }
  if (sportName === 'football') {
    return <FootballRoutes tournament={tournament} sport={sport} />
  }
  if (sportName === 'cricket') {
    return <CricketRoutes tournament={tournament} sport={sport} />
  }
  if (sportName === 'kabaddi') {
    return <KabaddiRoutes tournament={tournament} sport={sport} />
  }
  if (sportName === 'volleyball') {
    return <VolleyballRoutes tournament={tournament} sport={sport} />
  }

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

      {sport && !allowed ? (
        <EmptyState
          title={`You do not manage ${sport.game_name}`}
          text="Ask the super admin to give you this sport."
          action={backButton}
        />
      ) : sport ? (
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
        <EmptyState title="Sport not found" text="This sport is not part of the tournament anymore." action={backButton} />
      )}
    </>
  )
}
