import { cricketApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { nrrText, oversText } from '../../../sports/cricket/format.js'
import { EmptyState, LoadError } from '../../components/ui.jsx'
import { useCricket } from './cricketContext.js'

// Worked out by the server from completed fixtures, so it always reflects the latest results.
export default function StandingsTable() {
  const { tournament } = useCricket()
  const { data, error, retry } = useResource(`cricket-standings-${tournament._id}`, () =>
    cricketApi.standings(tournament._id),
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
              <th scope="col" title="Played">
                P
              </th>
              <th scope="col" title="Won">
                W
              </th>
              <th scope="col" title="Lost">
                L
              </th>
              <th scope="col" title="Tied">
                T
              </th>
              <th scope="col" title="No result">
                NR
              </th>
              <th scope="col" title="Net run rate">
                NRR
              </th>
              <th scope="col" title="Runs scored / overs faced">
                For
              </th>
              <th scope="col" title="Runs conceded / overs bowled">
                Against
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
                <td>{row.lost}</td>
                <td>{row.tied}</td>
                <td>{row.no_result}</td>
                <td>{nrrText(row.nrr)}</td>
                <td>
                  {row.runs_for}/{oversText(row.balls_for)}
                </td>
                <td>
                  {row.runs_against}/{oversText(row.balls_against)}
                </td>
                <td className="standings-points">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="standings-legend">
        Win {points.win} points, tie or no result {points.no_result}, loss {points.loss}. Houses level on points are
        separated by net run rate (NRR), then their head-to-head result. NRR = runs scored per over − runs conceded per
        over; a side bowled out counts its full quota of overs. Super overs and abandoned matches are not part of NRR.
      </p>
    </section>
  )
}
