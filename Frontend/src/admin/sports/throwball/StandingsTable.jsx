import { throwballApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { EmptyState, LoadError } from '../../components/ui.jsx'
import { useThrowball } from './throwballContext.js'

const signed = (value) => (value > 0 ? `+${value}` : String(value))

const COLUMNS = [
  { key: 'played', label: 'P', title: 'Matches played' },
  { key: 'won', label: 'W', title: 'Won' },
  { key: 'drawn', label: 'D', title: 'Drawn (tied)' },
  { key: 'lost', label: 'L', title: 'Lost' },
  { key: 'sets_won', label: 'SW', title: 'Sets won' },
  { key: 'sets_lost', label: 'SL', title: 'Sets lost' },
  { key: 'point_diff', label: 'PD', title: 'Point difference', format: signed },
]

export default function StandingsTable() {
  const { tournament } = useThrowball()
  const { data, error, retry } = useResource(`throwball-standings-${tournament._id}`, () =>
    throwballApi.standings(tournament._id),
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
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" title={column.title}>
                  {column.label}
                </th>
              ))}
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
                {COLUMNS.map((column) => (
                  <td key={column.key}>{column.format ? column.format(row[column.key]) : row[column.key]}</td>
                ))}
                <td className="standings-points">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="standings-legend">
        Win 3 points, tie 1, loss 0. Houses level on points are separated by sets won–lost, then point difference (PD).
      </p>
    </section>
  )
}
