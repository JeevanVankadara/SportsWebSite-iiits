import { Link, useSearchParams } from 'react-router'
import { PlusIcon } from '../../components/icons.jsx'
import { Breadcrumbs, PageHeader } from '../../components/ui.jsx'
import WinnersPanel from '../../components/WinnersPanel.jsx'
import { useKabaddi } from './kabaddiContext.js'
import FixtureList from './FixtureList.jsx'
import StandingsTable from './StandingsTable.jsx'

const TABS = [
  { key: 'fixtures', label: 'Fixtures' },
  { key: 'table', label: 'Points table' },
  // Declaring the sport's overall winner is kept apart from the matches, so it is not mistaken for one.
  { key: 'winners', label: 'Winners' },
]

export default function KabaddiHomePage() {
  const { tournament, sport, basePath, breadcrumbs } = useKabaddi()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.find((item) => item.key === searchParams.get('tab'))?.key ?? 'fixtures'

  return (
    <>
      <Breadcrumbs items={breadcrumbs()} />
      <PageHeader
        title="Kabaddi"
        description={tournament.tournament_name}
        action={
          <Link to={`${basePath}/fixtures/new`} className="btn btn-primary">
            <PlusIcon />
            Add match
          </Link>
        }
      />

      <div className="tabs" role="tablist" aria-label="Kabaddi sections">
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

      <div role="tabpanel">
        {tab === 'fixtures' && <FixtureList />}
        {tab === 'table' && <StandingsTable />}
        {tab === 'winners' && <WinnersPanel tournament={tournament} sport={sport} />}
      </div>
    </>
  )
}
