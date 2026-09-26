import { Link, useSearchParams } from 'react-router'
import { PlusIcon } from '../../components/icons.jsx'
import { Breadcrumbs, PageHeader } from '../../components/ui.jsx'
import { useBadminton } from './badmintonContext.js'
import FixtureList from './FixtureList.jsx'
import StandingsTable from './StandingsTable.jsx'

const TABS = [
  { key: 'fixtures', label: 'Fixtures' },
  { key: 'table', label: 'Points table' },
]

export default function BadmintonHomePage() {
  const { tournament, basePath, breadcrumbs } = useBadminton()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'table' ? 'table' : 'fixtures'

  return (
    <>
      <Breadcrumbs items={breadcrumbs()} />
      <PageHeader
        title="Badminton"
        description={tournament.tournament_name}
        action={
          <Link to={`${basePath}/fixtures/new`} className="btn btn-primary">
            <PlusIcon />
            Add fixture
          </Link>
        }
      />

      <div className="tabs" role="tablist" aria-label="Badminton sections">
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
