import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { kabaddiApi, playersApi } from '../../../api/endpoints.js'
import PageLoader from '../../../components/PageLoader.jsx'
import Toast from '../../../components/Toast.jsx'
import { useResource } from '../../../hooks/useResource.js'
import { configOf, fixtureResultText } from '../../../sports/kabaddi/format.js'
import LineupEditor from '../../../sports/kabaddi/LineupEditor.jsx'
import MatchConsole from '../../../sports/kabaddi/MatchConsole.jsx'
import RulesForm from '../../../sports/kabaddi/RulesForm.jsx'
import { formatDateTime } from '../../../utils/dates.js'
import { Breadcrumbs, LoadError, StatusBadge } from '../../components/ui.jsx'
import { useKabaddi } from './kabaddiContext.js'
import FixtureDecision from './FixtureDecision.jsx'

const TABS = [
  { key: 'match', label: 'Match' },
  { key: 'lineups', label: 'Lineups' },
  { key: 'rules', label: 'Rules' },
]

// One kabaddi fixture for the admin. The admin can run the whole match like a referee (rules, lineups,
// clock, raids), and can also correct the score and delete any event, even after the match is over.
export default function FixturePage() {
  const { fixtureId } = useParams()
  const { basePath, breadcrumbs, houseName } = useKabaddi()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, setData, error, retry } = useResource(fixtureId, () => kabaddiApi.fixture(fixtureId))
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  if (!data) return error ? <LoadError message={error} onRetry={retry} /> : <PageLoader />

  const { fixture } = data
  const names = { team1: houseName(fixture.team1), team2: houseName(fixture.team2) }
  const config = configOf(fixture)
  const defaultTab = fixture.lineup_locked_at ? 'match' : 'lineups'
  const tab = TABS.some((item) => item.key === searchParams.get('tab')) ? searchParams.get('tab') : defaultTab

  // Runs one action; the server answers with the whole fixture, which replaces what is shown.
  // Resolves to true when it worked.
  async function run(action) {
    setBusy(true)
    try {
      setData(await action())
      return true
    } catch (err) {
      setToast(err.message)
      if (err.status === 409) kabaddiApi.fixture(fixtureId).then(setData, () => {})
      return false
    } finally {
      setBusy(false)
    }
  }

  async function deleteFixture() {
    if (!window.confirm(`Delete ${names.team1} vs ${names.team2} with all its events? This cannot be undone.`)) return
    try {
      await kabaddiApi.deleteFixture(fixture._id)
      navigate(basePath)
    } catch (err) {
      setToast(err.message)
    }
  }

  const panel = { fixture, names, api: kabaddiApi, busy, run }

  return (
    <>
      <Breadcrumbs items={breadcrumbs({ label: `${names.team1} vs ${names.team2}` })} />

      <section className="panel kb-admin-head">
        <div className="kb-admin-title">
          <h1>
            {names.team1} <span className="muted">vs</span> {names.team2}
          </h1>
          <div className="page-actions">
            <Link to={`${basePath}/fixtures/${fixture._id}/edit`} className="btn btn-ghost btn-sm">
              Edit fixture
            </Link>
            <button type="button" className="btn btn-danger btn-sm" onClick={deleteFixture}>
              Delete
            </button>
          </div>
        </div>
        <div className="kb-admin-meta">
          <StatusBadge status={fixture.status} />
          {fixture.result_type === 'abandoned' && <StatusBadge status="abandoned" />}
          <span>{fixtureResultText(fixture, names.team1, names.team2)}</span>
          {fixture.scheduled_at && <span>{formatDateTime(fixture.scheduled_at)}</span>}
          <span>
            {config.players_on_court} a side · {config.half_duration_minutes} min halves
          </span>
          <span>
            {fixture.referees.length > 0
              ? `Referee: ${fixture.referees.map((referee) => referee.name).join(', ')}`
              : 'No referee yet'}
          </span>
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Fixture sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === item.key}
            onClick={() => setSearchParams(item.key === defaultTab ? {} : { tab: item.key }, { replace: true })}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="kb-admin-panel">
        {tab === 'match' && <MatchConsole detail={data} {...panel} isAdmin />}
        {tab === 'lineups' && (
          <section className="panel">
            <LineupEditor key={fixture.updated_at} {...panel} searchPlayers={playersApi.search} />
          </section>
        )}
        {tab === 'rules' && (
          <section className="panel">
            <RulesForm key={fixture.updated_at} {...panel} />
          </section>
        )}
      </div>

      <div className="dash-section">
        <FixtureDecision
          key={`${fixture.result_type}-${fixture.updated_at}`}
          fixture={fixture}
          team1={names.team1}
          team2={names.team2}
          onSaved={setData}
          onError={setToast}
        />
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}
