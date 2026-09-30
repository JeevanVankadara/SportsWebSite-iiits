import { footballApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { EmptyState, LoadError } from '../../components/ui.jsx'
import { useFootball } from './footballContext.js'

const signed = (value) => (value > 0 ? `+${value}` : String(value))

export default function StandingsTable() {
  const { tournament } = useFootball()
  const { data, error, retry } = useResource(`football-standings-${tournament._id}`, () =>
    footballApi.standings(tournament._id),
  )

  if (!data) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const { standings } = data
  if (standings.length === 0) {
    return <EmptyState title="No houses yet" text="Add houses to the tournament to see the points table." />
  }

  return (
    <section className="panel standings-panel">
      <div className="table-scroll">
        <table className="standings">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col" className="standings-house">
                House
              </th>
              <th scope="col" title="Matches played">
                P
              </th>
              <th scope="col" title="Won">
                W
              </th>
              <th scope="col" title="Drawn">
                D
              </th>
              <th scope="col" title="Lost">
                L
              </th>
              <th scope="col" title="Goals For">
                GF
              </th>
              <th scope="col" title="Goals Against">
                GA
              </th>
              <th scope="col" title="Goal Difference">
                GD
              </th>
              <th scope="col" title="Table points">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.house_id}>
                <td>{row.position}</td>
                <th scope="row" className="standings-house">
                  {row.house_name}
                </th>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>{row.goals_for}</td>
                <td>{row.goals_against}</td>
                <td>{signed(row.goal_diff)}</td>
                <td className="standings-points">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="standings-legend">
        Win 3 points, draw 1, loss 0. Houses level on points are separated by their head-to-head result, then goal difference (GD), and goals for (GF).
      </p>
    </section>
  )
}
