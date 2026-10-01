import { Link, useSearchParams } from 'react-router'
import { PlusIcon } from '../../components/icons.jsx'
import { Breadcrumbs, PageHeader } from '../../components/ui.jsx'
import WinnersPanel from '../../components/WinnersPanel.jsx'
import { useVolleyball } from './volleyballContext.js'
import FixtureList from './FixtureList.jsx'
import StandingsTable from './StandingsTable.jsx'

const TABS = [
  { key: 'fixtures', label: 'Fixtures' },
  { key: 'table', label: 'Points table' },
]

export default function VolleyballHomePage() {
  const { tournament, sport, basePath, breadcrumbs } = useVolleyball()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'table' ? 'table' : 'fixtures'

  return (
    <>
      <Breadcrumbs items={breadcrumbs()} />
      <PageHeader
        title="Volleyball"
        description={tournament.tournament_name}
        action={
          <Link to={`${basePath}/fixtures/new`} className="btn btn-primary">
            <PlusIcon />
            Add match
          </Link>
        }
      />

      <WinnersPanel tournament={tournament} sport={sport} />

      <div className="tabs" role="tablist" aria-label="Volleyball sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === item.key}
            onClick={() => setSearchParams(item.key === 'fixtures' ? {} : { tab: item.key }, { replace: true })}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">{tab === 'fixtures' ? <FixtureList /> : <StandingsTable />}</div>
    </>
  )
}
