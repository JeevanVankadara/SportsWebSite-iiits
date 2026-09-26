import { badmintonApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import { EmptyState, LoadError } from '../../components/ui.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { useBadminton } from './badmintonContext.js'

const signed = (value) => (value > 0 ? `+${value}` : String(value))

// Worked out by the server from completed fixtures, so it always reflects the latest results.
export default function StandingsTable() {
  const { tournament } = useBadminton()
  const { data, error, retry } = useResource(`standings-${tournament._id}`, () =>
    badmintonApi.standings(tournament._id),
  )

  if (!data) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const { standings, table_points: points } = data
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
              <th scope="col" title="Fixtures played">
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
              <th scope="col" title="Match difference">
                MD
              </th>
              <th scope="col" title="Set difference">
                SD
              </th>
              <th scope="col" title="Points difference">
                PD
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
                <td>{signed(row.match_diff)}</td>
                <td>{signed(row.set_diff)}</td>
                <td>{signed(row.point_diff)}</td>
                <td className="standings-points">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="standings-legend">
        Win {points.win} points, draw {points.draw}, loss {points.loss}. Houses level on points are separated by
        their head-to-head result, then match difference (MD), set difference (SD) and points difference (PD).
      </p>
    </section>
  )
}
