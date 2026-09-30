import { useEffect, useRef, useState } from 'react'
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Clock3,
  House,
  Search,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { COORDINATOR_PATH } from '../config.js'
import {
  fixturePath,
  firstSportPath,
  formatDate,
  houseName,
  idOf,
  loadFixture,
  loadOverview,
  loadPlayers,
  loadSport,
  previewFixture,
  previewOverview,
  previewPlayers,
  previewSport,
  resultLine,
  score,
  sportName,
  sportPath,
  sports,
} from './data.js'
import { useViewerData } from './useViewerData.js'
import { FixtureContent, PointsTable } from './SportsContent.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import { LivePulse } from './animations.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { useViewerMotion } from './motion.js'
import { CricketLiveHeader } from './CricketLive.jsx'
import { TeamLogo } from './Cartoon.jsx'
import ClayIcon from './Clay.jsx'
import { advancePreview, advancePreviewFootball, useLiveFeed, usePreviewTicker, useScoreEvent } from './liveFeed.js'
import { SportCelebration } from './Fx.jsx'
import './viewer.css'
import './live.css'
import '@fontsource-variable/inter'

const isPreview = () =>
  new URLSearchParams(window.location.search).get('preview') === '1'
const withPreview = (path) =>
  `${path}${isPreview() ? `${path.includes('?') ? '&' : '?'}preview=1` : ''}`
function usePreview() {
  const { search } = useLocation()
  return new URLSearchParams(search).get('preview') === '1'
}

function LiveBadge({ compact = false }) {
  return (
    <span className={`st-live-badge ${compact ? 'st-live-badge-small' : ''}`}>
      <LivePulse /> Live
    </span>
  )
}

function StatusBadge({ status }) {
  if (status === 'live') return <LiveBadge compact />
  return (
    <span className={`st-status st-status-${status}`}>
      {status === 'completed' ? 'Result' : 'Upcoming'}
    </span>
  )
}

function Shell({ children }) {
  // The theme follows the device (and its live changes) until the user picks the other one; picking the device's own theme clears the override.
  const [stored, setStored] = useState(() => {
    try {
      const saved = localStorage.getItem('iiits-viewer-theme-choice')
      return saved === 'dark' || saved === 'light' ? saved : null
    } catch {
      return null
    }
  })
  const [system, setSystem] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const change = (event) => setSystem(event.matches ? 'dark' : 'light')
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  const theme = stored ?? system
  useEffect(() => {
    const root = document.documentElement
    root.style.backgroundColor = theme === 'dark' ? '#000' : '#f5f5f7'
    root.style.colorScheme = theme
    return () => { root.style.backgroundColor = ''; root.style.colorScheme = '' }
  }, [theme])
  const changeTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    const override = next === system ? null : next
    setStored(override)
    try {
      if (override) localStorage.setItem('iiits-viewer-theme-choice', override)
      else localStorage.removeItem('iiits-viewer-theme-choice')
    } catch { /* Session appearance */ }
  }
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchButton = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const motionRoot = useRef(null)
  useViewerMotion(motionRoot, location.pathname)
  const submit = (event) => {
    event.preventDefault()
    setSearchOpen(false)
    navigate(withPreview(`/search?q=${encodeURIComponent(query.trim())}`))
  }
  return (
    <div ref={motionRoot} className="st-app" data-theme={theme}>
      <div className="st-ambient" aria-hidden="true"><span /><span /></div>
      <a className="st-skip-link" href="#viewer-content">
        Skip to content
      </a>
      <header className="st-header">
        <div className="st-header-inner">
          <Link
            className="st-brand"
            to={withPreview('/')}
            aria-label="IIITS Sports home"
          >
            <img
              src="/iiits-logo.jpg"
              alt="IIIT Sri City"
              width="44"
              height="48"
              className="st-institute-logo"
            />
            <span className="st-brand-type">
              <strong>IIITS Sports</strong>
              <span>IIIT Sri City</span>
            </span>
          </Link>
          <nav
            id="viewer-navigation"
            className="st-nav"
            aria-label="Main navigation"
          >
            <NavLink
              end
              to={withPreview('/')}
            >
              Home
            </NavLink>
            <NavLink
              to={withPreview('/fixtures')}
            >
              Fixtures
            </NavLink>
            <NavLink
              to={withPreview('/tournaments')}
            >
              Tournaments
            </NavLink>
            <NavLink
              to={withPreview('/players')}
            >
              Players
            </NavLink>
          </nav>
          <div className="st-header-actions">
            <ThemeToggle theme={theme} onChange={changeTheme} />
            <button
              ref={searchButton}
              className="st-icon-button st-search-button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search players and matches"
            >
              <Search size={18} />
              <span>Search</span>
            </button>
            <Link className="st-register" to="/register">
              Register <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>
      {searchOpen && (
        <SearchDialog
          onClose={() => setSearchOpen(false)}
          returnFocus={searchButton}
        >
          <form onSubmit={submit}>
            <Search size={22} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search players, houses, sports..."
              aria-label="Search"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
            >
              <X size={20} />
            </button>
          </form>
          <div className="st-search-hint">
            Find matches and players by name, house or sport. Press Enter to
            search.
          </div>
        </SearchDialog>
      )}
      {isPreview() && (
        <div className="st-preview-banner">
          Design preview · illustrative scores and players{' '}
          <Link to={location.pathname}>
            View live data <ArrowRight size={14} />
          </Link>
        </div>
      )}
      {children}
      <nav className="st-tabbar" aria-label="Primary">
        {[['/', 'Home', House, true], ['/fixtures', 'Fixtures', CalendarDays], ['/tournaments', 'Tournaments', Trophy], ['/players', 'Players', Users]].map(([to, label, Icon, end]) => (
          <NavLink key={to} to={withPreview(to)} end={end}>
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <footer className="st-footer">
        <div className="st-container st-footer-inner">
          <div>
            <strong>IIITS Sports</strong>
            <p>Scores, fixtures and players at IIIT Sri City.</p>
          </div>
          <div className="st-footer-links">
            <Link to={withPreview('/players')}>Players</Link>
            <Link to={withPreview('/tournaments')}>Tournaments</Link>
            <Link to="/register">Register</Link>
            <Link to={COORDINATOR_PATH}>Co-ordinator sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SearchDialog({ children, onClose, returnFocus }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const trigger = returnFocus.current
    element.showModal()
    return () => {
      element.close()
      trigger?.focus()
    }
  }, [returnFocus])
  return (
    <dialog
      ref={dialog}
      className="st-search-dialog"
      aria-label="Search IIITS Sports"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </dialog>
  )
}

function DataState({
  loading,
  error,
  onRetry,
  empty,
  children,
  stale = false,
}) {
  if (loading)
    return (
      <div className="st-skeleton-grid" aria-label="Loading scores">
        {[1, 2, 3].map((item) => (
          <div className="st-skeleton-card" key={item}>
            <i />
            <i />
            <i />
            <i />
          </div>
        ))}
      </div>
    )
  if (error && !stale)
    return (
      <div className="st-message" role="alert">
        <CircleHelp size={28} />
        <h3>Couldn’t load the scores.</h3>
        <p>{error}</p>
        <p className="st-retry-note"><span className="st-spinner" aria-hidden="true" /> Trying again automatically…</p>
        <button onClick={onRetry}>Try now</button>
        <Link to="/?preview=1">Explore design preview</Link>
      </div>
    )
  if (empty)
    return (
      <div className="st-message">
        <Activity size={28} />
        <h3>Nothing on the board yet.</h3>
        <p>Scores will appear here when campus fixtures are announced.</p>
      </div>
    )
  return (
    <>
      {error && (
        <div className="st-inline-alert" role="status">
          Showing the last published scores. {error}{' '}
          <button onClick={onRetry}>Try again</button>
        </div>
      )}
      {children}
    </>
  )
}

function ContentTabs({ id, items, value, onChange }) {
  const buttons = useRef([])
  return (
    <div
      className="st-content-tabs"
      role="tablist"
      aria-label="Match information"
    >
      {items.map(([name, label], index) => (
        <button
          key={name}
          ref={(element) => {
            buttons.current[index] = element
          }}
          id={`${id}-${name}`}
          role="tab"
          aria-selected={value === name}
          aria-controls={`${id}-panel`}
          tabIndex={value === name ? 0 : -1}
          className={value === name ? 'active' : ''}
          onClick={() => onChange(name)}
          onKeyDown={(event) => {
            const next =
              event.key === 'ArrowRight'
                ? (index + 1) % items.length
                : event.key === 'ArrowLeft'
                  ? (index + items.length - 1) % items.length
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? items.length - 1
                      : null
            if (next === null) return
            event.preventDefault()
            onChange(items[next][0])
            buttons.current[next]?.focus()
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function SectionTitle({ eyebrow, title, detail, action, as: Heading = 'h2' }) {
  return (
    <div className="st-section-heading">
      <div>
        {eyebrow && <span className="st-eyebrow">{eyebrow}</span>}
        <Heading>{title}</Heading>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  )
}

function HouseBadge({ name }) {
  return (
    <span className="st-house-badge" aria-hidden="true">
      <TeamLogo name={name} size={32} />
    </span>
  )
}

function SportIcon({ sport }) {
  return <ClayIcon kind={sport} size={28} />
}

function MatchCard({ item, tournament, variant = '' }) {
  const first = houseName(tournament, item.team1)
  const second = houseName(tournament, item.team2)
  return (
    <Link
      to={withPreview(fixturePath(item))}
      className={`st-match-card ${variant}`}
    >
      <div className="st-match-top">
        <div>
          <span className="st-sport-tag">{sportName(item.sport)}</span>
          <span className="st-match-tourney">
            {tournament?.tournament_name}
          </span>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="st-match-meta">
        {item.sport === 'cricket' && item.overs ? `${item.overs} overs · ` : ''}
        {item.scheduled_at
          ? formatDate(item.scheduled_at)
          : 'Time not announced'}
      </div>
      <div className="st-team-row">
        <HouseBadge name={first} />
        <strong>{first}</strong>
        <b>{score(item, 'team1')}</b>
      </div>
      <div className="st-team-row">
        <HouseBadge name={second} />
        <strong>{second}</strong>
        <b>{score(item, 'team2')}</b>
      </div>
      <div
        className={`st-match-bottom ${item.status === 'completed' ? 'st-result-line' : ''}`}
      >
        <span>{resultLine(item, tournament)}</span>
        <ChevronRight size={18} />
      </div>
    </Link>
  )
}

function sortFixtures(fixtures) {
  const priority = { live: 0, completed: 1, scheduled: 2 }
  return [...fixtures].sort(
    (a, b) =>
      (priority[a.status] ?? 3) - (priority[b.status] ?? 3) ||
      (a.status === 'completed'
        ? new Date(b.completed_at ?? b.scheduled_at) -
          new Date(a.completed_at ?? a.scheduled_at)
        : new Date(a.scheduled_at ?? 0) - new Date(b.scheduled_at ?? 0)),
  )
}

function Home({ view = 'home' }) {
  const preview = usePreview()
  const { data, error, retry, updated } = useViewerData(
    `overview-${preview}`,
    () => (preview ? Promise.resolve(previewOverview) : loadOverview()),
    !preview,
  )
  const [filter, setFilter] = useState('all')
  const rail = useRef(null)
  const tournaments = data?.tournaments ?? []
  const fixtures = sortFixtures(data?.fixtures ?? [])
  const shown = fixtures.filter(
    (item) =>
      filter === 'all' || item.status === filter || item.sport === filter,
  )
  const findTournament = (item) =>
    tournaments.find((row) => idOf(row) === item.tournamentId)
  const liveCount = fixtures.filter((item) => item.status === 'live').length
  return (
    <main id="viewer-content">
      <div className="st-container st-main-content">
        <div id="scores" className="st-score-section">
          <div className="st-score-title">
            <div>
              <span className="st-eyebrow">IIIT Sri City</span>
              <h1>
                {view === 'fixtures'
                  ? 'Fixtures & results'
                  : 'Live scores & fixtures'}{' '}
                <span className="st-count">{fixtures.length}</span>
              </h1>
            </div>
            {updated && !preview && (
              <span className="st-updated">
                {`Updated ${new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(updated)}`}
              </span>
            )}
          </div>
          <div
            className="st-filter-bar"
            role="group"
            aria-label="Filter fixtures"
          >
            {[
              ['all', 'All matches'],
              ['live', `Live ${liveCount ? `(${liveCount})` : ''}`],
              ['scheduled', 'Upcoming'],
              ['completed', 'Finished'],
              ...sports.map((sport) => [sport, sportName(sport)]),
            ].map(([key, label]) => (
              <button
                className={filter === key ? 'active' : ''}
                aria-pressed={filter === key}
                key={key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {data?.incomplete && (
            <div className="st-inline-alert" role="status">
              Some sport scores are unavailable.{' '}
              <button onClick={retry}>Try again</button>
            </div>
          )}
          <DataState
            loading={!data && !error}
            error={error}
            stale={Boolean(data)}
            onRetry={retry}
            empty={!fixtures.length}
          >
            {shown.length ? (
              <>
                <div
                  ref={rail}
                  className={
                    view === 'home' ? 'st-match-rail' : 'st-match-grid'
                  }
                >
                  {shown.map((item) => (
                    <MatchCard
                      key={item._id}
                      item={item}
                      tournament={findTournament(item)}
                    />
                  ))}
                </div>
                {view === 'home' && (
                  <div className="st-rail-footer">
                    <span>All times shown in your local time</span>
                    <div>
                      <button
                        aria-label="Previous matches"
                        onClick={() =>
                          rail.current?.scrollBy({
                            left: -352,
                            behavior: 'auto',
                          })
                        }
                      >
                        <ChevronRight className="st-previous" size={18} />
                      </button>
                      <button
                        aria-label="Next matches"
                        onClick={() =>
                          rail.current?.scrollBy({
                            left: 352,
                            behavior: 'auto',
                          })
                        }
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="st-message st-message-small">
                No matches in this view yet.
              </div>
            )}
          </DataState>
        </div>
        {view === 'home' && (
          <div className="st-home-split">
            <div className="st-home-main">
              <section className="st-home-panel">
                <SectionTitle
                  title="Tournaments"
                  action={
                    <Link
                      className="st-text-link"
                      to={withPreview('/tournaments')}
                    >
                      View all <ArrowRight size={16} />
                    </Link>
                  }
                />
                <div className="st-tournament-list">
                  {tournaments.slice(0, 3).map((tournament) => (
                    <TournamentCard
                      key={tournament._id}
                      tournament={tournament}
                    />
                  ))}
                  {!tournaments.length && (
                    <p className="st-panel-note">
                      Published campus tournaments will appear here.
                    </p>
                  )}
                </div>
                <div className="st-quick-sports">
                  {sports.map((sport) => (
                    <Link
                      key={sport}
                      to={withPreview(firstSportPath(tournaments, sport))}
                    >
                      <SportIcon sport={sport} />
                      {sportName(sport)}
                      <ChevronRight size={16} />
                    </Link>
                  ))}
                </div>
              </section>
              <section className="st-home-panel">
                <SectionTitle
                  title="Upcoming fixtures"
                  action={
                    <Link
                      className="st-text-link"
                      to={withPreview('/fixtures')}
                    >
                      All fixtures <ArrowRight size={16} />
                    </Link>
                  }
                />
                <div className="st-schedule-list">
                  {fixtures
                    .filter((item) => item.status === 'scheduled')
                    .slice(0, 3)
                    .map((item) => (
                      <Link
                        key={item._id}
                        className="st-schedule-row"
                        to={withPreview(fixturePath(item))}
                      >
                        <span className="st-schedule-icon">
                          <SportIcon sport={item.sport} />
                        </span>
                        <span>
                          <strong>
                            {houseName(findTournament(item), item.team1)}{' '}
                            <span>vs</span>{' '}
                            {houseName(findTournament(item), item.team2)}
                          </strong>
                          <small>
                            {sportName(item.sport)} ·{' '}
                            {findTournament(item)?.tournament_name}
                          </small>
                        </span>
                        <time>{formatDate(item.scheduled_at)}</time>
                        <ChevronRight size={16} />
                      </Link>
                    ))}
                  {!fixtures.some((item) => item.status === 'scheduled') && (
                    <p className="st-panel-note">
                      No upcoming fixtures announced.
                    </p>
                  )}
                </div>
              </section>
            </div>
            <HomeRoster overview={data} />
          </div>
        )}
      </div>
    </main>
  )
}

function HomeRoster({ overview }) {
  const preview = usePreview()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { data, error, retry } = useViewerData(
    `home-roster-${preview}`,
    () =>
      preview
        ? Promise.resolve({ players: previewPlayers })
        : loadPlayers(overview),
    false,
    Boolean(overview),
  )
  return (
    <section className="st-home-panel st-home-roster">
      <SectionTitle
        title="Campus players"
        action={
          <Link className="st-text-link" to={withPreview('/players')}>
            View all <ArrowRight size={16} />
          </Link>
        }
      />
      <form
        className="st-roster-search"
        onSubmit={(event) => {
          event.preventDefault()
          navigate(
            withPreview(`/players?q=${encodeURIComponent(query.trim())}`),
          )
        }}
      >
        <Search size={18} />
        <input
          aria-label="Find a campus player"
          placeholder="Search players"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button aria-label="Find player">
          <ArrowRight size={18} />
        </button>
      </form>
      <p className="st-panel-note">
        Player profiles, statistics and match participation.
      </p>
      {overview ? (
        <DataState
          loading={!data && !error}
          error={error}
          onRetry={retry}
          empty={data && !data.players.length}
        >
          <div className="st-home-player-list">
            {data?.players.slice(0, 4).map((player) => (
              <Link
                key={player._id}
                to={withPreview(`/players/${player._id}`)}
                className="st-home-player"
              >
                <PlayerAvatar id={player._id} />
                <span>
                  <strong>{player.name}</strong>
                  <small>{player.houses.join(' · ')}</small>
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        </DataState>
      ) : (
        <Link to={withPreview('/players')} className="st-roster-empty">
          <ClayIcon kind="users" size={28} />
          Open player directory
          <ChevronRight size={16} />
        </Link>
      )}
      <div className="st-roster-footnote">
        Names and statistics from published fixtures. Portraits are fictional illustrations.
      </div>
    </section>
  )
}

function TournamentCard({ tournament }) {
  return (
    <Link
      to={withPreview(`/t/${tournament._id}`)}
      className="st-tournament-card"
    >
      <div className="st-tournament-icon">
        <ClayIcon kind="trophy" size={44} />
      </div>
      <div className="st-tournament-info">
        <strong>{tournament.tournament_name}</strong>
        <span>
          <CalendarDays size={14} />{' '}
          {tournament.start_date
            ? new Intl.DateTimeFormat('en-IN', {
                day: 'numeric',
                month: 'short',
              }).format(new Date(tournament.start_date))
            : 'TBA'}{' '}
          –{' '}
          {tournament.end_date
            ? new Intl.DateTimeFormat('en-IN', {
                day: 'numeric',
                month: 'short',
              }).format(new Date(tournament.end_date))
            : 'TBA'}{' '}
          · {tournament.houses?.length ?? 0} houses
        </span>
        <div className="st-chip-row">
          {tournament.games?.map((game) => (
            <span key={idOf(game)}>{game.game_name}</span>
          ))}
        </div>
      </div>
      <span
        className={`st-tournament-status ${tournament.status === 'live' ? 'active' : ''}`}
      >
        {tournament.status}
      </span>
      <ChevronRight className="st-tournament-arrow" size={18} />
    </Link>
  )
}

function TournamentList() {
  const preview = usePreview()
  const { data, error, retry } = useViewerData(`overview-${preview}`, () =>
    preview ? Promise.resolve(previewOverview) : loadOverview(),
  )
  return (
    <main id="viewer-content" className="st-container st-inner-page">
      <Breadcrumb items={['Tournaments']} />
      <SectionTitle
        eyebrow="THE COMPETITIONS"
        title="Tournaments"
        as="h1"
        detail="Every campus tournament, one place to follow the action."
      />
      <DataState
        loading={!data && !error}
        error={error}
        onRetry={retry}
        empty={!data?.tournaments?.length}
      >
        <div className="st-tournament-list st-wide-list">
          {data?.tournaments.map((t) => (
            <TournamentCard key={t._id} tournament={t} />
          ))}
        </div>
      </DataState>
    </main>
  )
}

function Breadcrumb({ items }) {
  const parent = [...items].reverse().find(item => typeof item !== 'string')?.to ?? '/'
  return (
    <div className="st-crumbbar">
      <Link className="st-back" to={withPreview(parent)}><ArrowLeft size={18} /> Back</Link>
      <nav className="st-crumbs" aria-label="Breadcrumb" ref={(node) => { if (node) node.scrollLeft = node.scrollWidth }}>
        <Link to={withPreview('/')}>Home</Link>
        {items.map((item, index) => typeof item === 'string'
          ? <span key={`${item}-${index}`} aria-current="page">{item}</span>
          : <Link key={`${item.to}-${index}`} to={withPreview(item.to)}>{item.label}</Link>)}
      </nav>
    </div>
  )
}

function TournamentPage() {
  const { tournamentId } = useParams()
  const preview = usePreview()
  const { data, error, retry } = useViewerData(`overview-${preview}`, () =>
    preview ? Promise.resolve(previewOverview) : loadOverview(),
  )
  const tournament = data?.tournaments.find((row) => idOf(row) === tournamentId)
  const fixtures =
    data?.fixtures.filter((item) => item.tournamentId === tournamentId) ?? []
  return (
    <main id="viewer-content" className="st-container st-inner-page">
      <Breadcrumb
        items={[
          { label: 'Tournaments', to: '/tournaments' },
          tournament?.tournament_name ?? 'Tournament',
        ]}
      />
      <DataState
        loading={!data && !error}
        error={error}
        onRetry={retry}
        empty={data && !tournament}
      >
        {tournament && (
          <>
            <div className="st-page-banner">
              <span className="st-eyebrow">
                {tournament.status.toUpperCase()} TOURNAMENT
              </span>
              <h1>{tournament.tournament_name}</h1>
              <p>
                {tournament.houses.length} houses · {tournament.games.length}{' '}
                sports · {fixtures.length} fixtures
              </p>
            </div>
            <SectionTitle eyebrow="FOLLOW THE ACTION" title="Sports" />
            <div className="st-sport-grid">
              {tournament.games.map((game, index) => {
                const sport = game.game_name.toLowerCase()
                return (
                  <Link
                    key={idOf(game)}
                    to={withPreview(sportPath(tournamentId, sport))}
                    className={`st-sport-tile st-sport-tile-${sport}`}
                  >
                    <span>
                      0{index + 1} /{' '}
                      {
                        fixtures.filter(
                          (item) =>
                            item.sport === sport && item.status === 'live',
                        ).length
                      }{' '}
                      LIVE
                    </span>
                    <strong>{game.game_name}</strong>
                    <ArrowRight size={20} />
                  </Link>
                )
              })}
            </div>
            <SectionTitle eyebrow="THE TEAMS" title="Houses" />
            <div className="st-houses">
              {tournament.houses.map((house) => (
                <span key={idOf(house)}>
                  <i
                    className={`st-house-dot st-house-${house.house_name.toLowerCase().split(' ')[0]}`}
                  />
                  {house.house_name}
                </span>
              ))}
            </div>
            <SectionTitle eyebrow="MATCH CENTRE" title="Latest fixtures" />
            <div className="st-match-grid">
              {sortFixtures(fixtures)
                .slice(0, 6)
                .map((item) => (
                  <MatchCard
                    key={item._id}
                    item={item}
                    tournament={tournament}
                  />
                ))}
            </div>
          </>
        )}
      </DataState>
    </main>
  )
}

function SportPage() {
  const { tournamentId, sport } = useParams()
  const [params, setParams] = useSearchParams()
  const preview = usePreview()
  const { data, error, retry } = useViewerData(
    `${tournamentId}-${sport}-${preview}`,
    () =>
      preview
        ? Promise.resolve(previewSport(sport))
        : loadSport(tournamentId, sport),
    !preview,
  )
  const tab = params.get('tab') === 'table' ? 'table' : 'fixtures'
  return (
    <main id="viewer-content" className="st-container st-inner-page">
      <Breadcrumb
        items={[
          { label: 'Tournaments', to: '/tournaments' },
          {
            label: data?.tournament?.tournament_name ?? 'Tournament',
            to: `/t/${tournamentId}`,
          },
          sportName(sport),
        ]}
      />
      <div className="st-page-banner">
        <span className="st-eyebrow">
          {data?.tournament?.tournament_name ?? 'IIITS SPORTS'}
        </span>
        <h1>{sportName(sport)}</h1>
        <p>Fixtures, results and standings from the campus arena.</p>
      </div>
      <ContentTabs
        id="sport-tabs"
        value={tab}
        items={[
          ['fixtures', 'Fixtures'],
          ['table', 'Points table'],
        ]}
        onChange={(name) =>
          setParams({
            ...(name === 'table' ? { tab: 'table' } : {}),
            ...(preview ? { preview: '1' } : {}),
          })
        }
      />
      <div
        id="sport-tabs-panel"
        role="tabpanel"
        aria-labelledby={`sport-tabs-${tab}`}
        tabIndex={0}
      >
        <DataState
          loading={!data && !error}
          error={error}
          stale={Boolean(data)}
          onRetry={retry}
          empty={false}
        >
          {data &&
            (tab === 'table' ? (
              data.tableError ? (
                <div className="st-message" role="alert">
                  <p>{data.tableError}</p>
                  <button onClick={retry}>Try again</button>
                </div>
              ) : (
                <PointsTable data={data.table} sport={sport} />
              )
            ) : (
              <div className="st-fixture-groups">
                {[
                  ['live', 'Live now'],
                  ['completed', 'Results'],
                  ['scheduled', 'Upcoming'],
                ].map(([status, title]) => {
                  const items = sortFixtures(
                    data.fixtures.filter((item) => item.status === status),
                  )
                  return (
                    <section key={status}>
                      <SectionTitle
                        eyebrow={status.toUpperCase()}
                        title={`${title} (${items.length})`}
                      />
                      {items.length ? (
                        <div className="st-match-grid">
                          {items.map((item) => (
                            <MatchCard
                              item={item}
                              tournament={data.tournament}
                              key={item._id}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="st-empty-group">
                          No {title.toLowerCase()} fixtures.
                        </p>
                      )}
                    </section>
                  )
                })}
              </div>
            ))}
        </DataState>
      </div>
    </main>
  )
}

function PlayerCard({ player }) {
  return (
    <Link to={withPreview(`/players/${player._id}`)} className="st-player-card">
      <PlayerAvatar id={player._id} />
      <div className="st-player-main">
        <strong>{player.name}</strong>
        <span>{player.houses.join(' · ')}</span>
        <div className="st-chip-row">
          {player.sports.map((sport) => (
            <span key={sport}>{sportName(sport)}</span>
          ))}
        </div>
      </div>
      <span
        className={`st-player-state ${['Playing now', 'In live squad'].includes(player.status) ? 'live' : ''}`}
      >
        {player.status}
      </span>
      <ChevronRight size={18} />
    </Link>
  )
}

function usePlayers() {
  const preview = usePreview()
  const overview = useViewerData(`player-overview-${preview}`, () =>
    preview ? Promise.resolve(previewOverview) : loadOverview(),
  )
  const fingerprint =
    overview.data?.fixtures
      .map((item) => `${item._id}-${item.updated_at ?? item.status}`)
      .join('|') ?? 'loading'
  const resource = useViewerData(
    `people-${preview}-${fingerprint}`,
    () =>
      preview
        ? Promise.resolve({ players: previewPlayers })
        : loadPlayers(overview.data),
    false,
    Boolean(overview.data),
  )
  const people = {
    ...resource,
    data: resource.data?.players ?? null,
    incomplete: resource.data?.incomplete,
  }
  return { overview, people }
}

function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const { overview, people } = usePlayers()
  const text = query.trim().toLowerCase()
  const matches = (overview.data?.fixtures ?? []).filter((item) => {
    const tournament = overview.data.tournaments.find(
      (row) => idOf(row) === item.tournamentId,
    )
    return `${houseName(tournament, item.team1)} ${houseName(tournament, item.team2)} ${item.sport} ${tournament?.tournament_name}`
      .toLowerCase()
      .includes(text)
  })
  const players = (people.data ?? []).filter((player) =>
    `${player.name} ${player.houses.join(' ')} ${player.sports.join(' ')}`
      .toLowerCase()
      .includes(text),
  )
  return (
    <main id="viewer-content" className="st-container st-inner-page">
      <Breadcrumb items={['Search']} />
      <SectionTitle
        eyebrow="FIND YOUR GAME"
        title="Search IIITS Sports"
        as="h1"
      />
      <div className="st-player-search">
        <Search size={20} />
        <input
          aria-label="Search matches and players"
          value={query}
          onChange={(event) =>
            setParams(
              isPreview()
                ? { preview: '1', q: event.target.value }
                : { q: event.target.value },
              { replace: true },
            )
          }
          placeholder="Search a player, house or sport"
        />
      </div>
      <DataState
        loading={!overview.data && !overview.error}
        error={overview.error}
        onRetry={overview.retry}
        empty={false}
      >
        {overview.data && (
          <>
            <SectionTitle
              eyebrow="MATCH CENTRE"
              title={`Matches (${matches.length})`}
            />
            <div className="st-match-grid">
              {sortFixtures(matches).map((item) => (
                <MatchCard
                  item={item}
                  tournament={overview.data.tournaments.find(
                    (row) => idOf(row) === item.tournamentId,
                  )}
                  key={item._id}
                />
              ))}
            </div>
            {!matches.length && (
              <div className="st-message st-message-small">
                No matches found for “{query}”.
              </div>
            )}
            <SectionTitle
              eyebrow="CAMPUS ROSTER"
              title={`Players (${players.length})`}
            />
            <DataState
              loading={!people.data && !people.error}
              error={people.error}
              onRetry={people.retry}
              empty={false}
            >
              <div className="st-player-grid">
                {players.map((player) => (
                  <PlayerCard player={player} key={player._id} />
                ))}
              </div>
              {people.data && !players.length && (
                <div className="st-message st-message-small">
                  No players found for “{query}”. Try a name or house.
                </div>
              )}
            </DataState>
            {people.incomplete && (
              <p className="st-inline-alert">
                Some player records are unavailable.{' '}
                <button onClick={people.retry}>Try again</button>
              </p>
            )}
          </>
        )}
      </DataState>
    </main>
  )
}

function PlayersPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const { overview, people } = usePlayers()
  const [sportFilter, setSportFilter] = useState('all')
  const players = people.data ?? []
  const filtered = players.filter(
    (player) =>
      (sportFilter === 'all' || player.sports.includes(sportFilter)) &&
      `${player.name} ${player.houses.join(' ')} ${player.sports.join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  return (
    <main id="viewer-content" className="st-container st-inner-page">
      <Breadcrumb items={['Players']} />
      <div className="st-page-banner st-player-banner">
        <span className="st-eyebrow">CAMPUS ROSTER</span>
        <h1>Our players.</h1>
        <p>
          Discover the students behind the scores and see where they are in
          action.
        </p>
      </div>
      <div className="st-player-search">
        <Search size={20} />
        <input
          aria-label="Search players"
          value={query}
          onChange={(event) =>
            setParams(
              isPreview()
                ? { preview: '1', q: event.target.value }
                : { q: event.target.value },
              { replace: true },
            )
          }
          placeholder="Search a player, house or sport"
        />
        <span>{filtered.length} players</span>
      </div>
      <div
        className="st-filter-bar"
        role="group"
        aria-label="Filter players by sport"
      >
        {['all', ...sports].map((sport) => (
          <button
            key={sport}
            aria-pressed={sportFilter === sport}
            className={sportFilter === sport ? 'active' : ''}
            onClick={() => setSportFilter(sport)}
          >
            {sport === 'all' ? 'All players' : sportName(sport)}
          </button>
        ))}
      </div>
      <DataState
        loading={
          (!overview.data && !overview.error) ||
          (Boolean(overview.data) && !people.data && !people.error)
        }
        error={overview.error || people.error}
        onRetry={() => {
          overview.retry()
          people.retry()
        }}
        empty={!players.length}
      >
        <div className="st-player-grid">
          {filtered.map((player) => (
            <PlayerCard key={player._id} player={player} />
          ))}
          {!filtered.length && (
            <div className="st-message st-message-small">
              No players match “{query}”. Try a name, house or sport.
            </div>
          )}
        </div>
      </DataState>
      {people.incomplete && (
        <p className="st-inline-alert">
          Some player records are unavailable.{' '}
          <button onClick={people.retry}>Try again</button>
        </p>
      )}
      <p className="st-privacy-note">
        Roster entries appear when a student is named on a public fixture. Only
        names and match participation are shown.
      </p>
    </main>
  )
}

function PlayerPage() {
  const { playerId } = useParams()
  const { overview, people } = usePlayers()
  const player = people.data?.find((row) => row._id === playerId)
  return (
    <main id="viewer-content" className="st-container st-inner-page">
      <Breadcrumb
        items={[{ label: 'Players', to: '/players' }, player?.name ?? 'Player']}
      />
      <DataState
        loading={
          (!overview.data && !overview.error) ||
          (Boolean(overview.data) && !people.data && !people.error)
        }
        error={overview.error || people.error}
        onRetry={() => {
          overview.retry()
          people.retry()
        }}
        empty={people.data && !player}
      >
        {player && (
          <>
            <div className="st-profile-head">
              <PlayerAvatar id={player._id} animated className="st-profile-avatar" />
              <div>
                <span className="st-eyebrow">IIITS PLAYER PROFILE</span>
                <h1>{player.name}</h1>
                <p>{player.houses.join(' · ')}</p>
              </div>
              <span
                className={`st-player-state ${['Playing now', 'In live squad'].includes(player.status) ? 'live' : ''}`}
              >
                {player.status}
              </span>
            </div>
            <div className="st-profile-stats">
              <div>
                <strong>{player.sports.length}</strong>
                <span>Sports</span>
              </div>
              <div>
                <strong>{player.fixtures.length}</strong>
                <span>Squad fixtures</span>
              </div>
              <div>
                <strong>{player.houses.length}</strong>
                <span>Houses</span>
              </div>
            </div>
            <SectionTitle
              eyebrow="BY THE NUMBERS"
              title="Player statistics"
              detail="Totals from published campus fixture scorecards."
            />
            <div className="st-detail-grid">
              {player.sports.map((sport) => (
                <PlayerStatistics
                  key={sport}
                  sport={sport}
                  stats={player.stats?.[sport]}
                />
              ))}
            </div>
            <SectionTitle eyebrow="ON THE FIELD" title="Sports played" />
            <div className="st-chip-row st-large-chips">
              {player.sports.map((sport) => (
                <span key={sport}>{sportName(sport)}</span>
              ))}
            </div>
            <SectionTitle eyebrow="MATCH HISTORY" title="Fixtures" />
            <div className="st-match-grid">
              {player.fixtures.map((item) => (
                <MatchCard
                  key={item._id}
                  item={item}
                  tournament={overview.data?.tournaments.find(
                    (row) => idOf(row) === item.tournamentId,
                  )}
                />
              ))}
            </div>
          </>
        )}
      </DataState>
    </main>
  )
}

function FixturePage() {
  const { tournamentId, sport, fixtureId } = useParams()
  const [tab, setTab] = useState('summary')
  const preview = usePreview()
  const { data: baseData, error, retry, updated } = useViewerData(
    `${tournamentId}-${sport}-${fixtureId}-${preview}`,
    () =>
      preview
        ? Promise.resolve(previewFixture(sport, fixtureId))
        : loadFixture(tournamentId, sport, fixtureId),
    !preview,
  )
  const ticked = usePreviewTicker(baseData, preview && (sport === 'cricket' || sport === 'football'), sport === 'football' ? advancePreviewFootball : advancePreview, sport === 'football' ? 7000 : 4200)
  const scoreEvent0 = useScoreEvent(ticked, sport)
  const liveFeed0 = useLiveFeed(ticked)
  const [demo, setDemo] = useState(null)
  const scoreEvent = demo && demo.at >= (scoreEvent0?.at ?? 0) ? demo : scoreEvent0
  const liveFeed = demo && demo.at >= (liveFeed0.event?.at ?? 0) ? { ...liveFeed0, event: demo } : liveFeed0
  const data = ticked && { ...ticked, live: liveFeed }
  const f = data?.fixture
  const first = data && houseName(data.tournament, f.team1)
  const second = data && houseName(data.tournament, f.team2)
  return (
    <main id="viewer-content" className="st-container st-inner-page">
      <Breadcrumb
        items={[
          { label: 'Tournaments', to: '/tournaments' },
          {
            label: data?.tournament?.tournament_name ?? 'Tournament',
            to: `/t/${tournamentId}`,
          },
          { label: sportName(sport), to: sportPath(tournamentId, sport) },
          'Match',
        ]}
      />
      <DataState
        loading={!data && !error}
        error={error}
        stale={Boolean(data)}
        onRetry={retry}
        empty={data === null && !error ? false : !data}
      >
        {f && (
          <>
            <div className="st-fixture-hero">
              {sport !== 'cricket' && <SportCelebration event={scoreEvent} />}
              <h1 className="st-sr-only">
                {first} vs {second}
              </h1>
              <div className="st-fixture-eyebrow">
                <span>
                  {sportName(sport)} · {data.tournament.tournament_name}
                </span>
                <StatusBadge status={f.status} />
              </div>
              {sport === 'cricket' && f.status === 'live' ? <CricketLiveHeader data={data} live={liveFeed} /> : <>
              <div className="st-fixture-score">
                <div>
                  <i
                    className={`st-house-dot st-house-${first.toLowerCase().split(' ')[0]}`}
                  />
                  <strong>{first}</strong>
                  <b>{score(f, 'team1')}</b>
                </div>
                <span className="st-versus">VS</span>
                <div>
                  <i
                    className={`st-house-dot st-house-${second.toLowerCase().split(' ')[0]}`}
                  />
                  <strong>{second}</strong>
                  <b>{score(f, 'team2')}</b>
                </div>
              </div>
              <p>{resultLine(f, data.tournament)}</p>
              </>}
              <div className="st-fixture-extra">
                <span>
                  <Clock3 size={16} /> {formatDate(f.scheduled_at)}
                </span>
                {updated && (
                  <span>
                    Updated{' '}
                    {new Intl.DateTimeFormat('en-IN', {
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(updated)}
                  </span>
                )}
              </div>
            </div>
            {preview && (
              <div className="st-demo-actions" aria-label="Preview animations">
                <span>Preview animation</span>
                {(sport === 'cricket' ? [['four', 'FOUR!', 'Four'], ['six', 'SIX!', 'Six'], ['wicket', 'OUT!', 'Out'], ['milestone', 'FIFTY!', 'Fifty'], ['wide', 'WIDE', 'Wide']] : sport === 'football' ? [['goal', 'GOAL!', 'Goal']] : [['point', 'SMASH!', 'Smash']]).map(([kind, word, label]) => (
                  <button key={kind} type="button" onClick={() => setDemo({ kind, word, uid: `demo-${Date.now()}`, at: Date.now() })}>{label}</button>
                ))}
              </div>
            )}
            {f.result_type === 'abandoned' && (
              <div className="st-abandoned">
                Abandoned:{' '}
                {f.decision_note ??
                  f.note ??
                  'A referee decision ended this fixture.'}
              </div>
            )}
            <ContentTabs
              id="fixture-tabs"
              value={tab}
              onChange={setTab}
              items={[
                ['summary', f.status === 'live' ? 'Live' : 'Match info'],
                [
                  'scorecard',
                  sport === 'football'
                    ? 'Timeline'
                    : sport === 'badminton'
                      ? 'Matches'
                      : 'Scorecard',
                ],
                ['squads', 'Squads'],
              ]}
            />
            <div
              id="fixture-tabs-panel"
              role="tabpanel"
              aria-labelledby={`fixture-tabs-${tab}`}
              tabIndex={0}
            >
              <FixtureContent tab={tab} data={data} />
            </div>
          </>
        )}
      </DataState>
    </main>
  )
}

function NotFound() {
  return (
    <main id="viewer-content" className="st-container st-inner-page">
      <div className="st-message">
        <CircleHelp size={32} />
        <h1>That page isn’t on the board.</h1>
        <Link to={withPreview('/')}>
          Back to home <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  )
}

function SportGate({ children }) {
  const { sport } = useParams()
  return sports.includes(sport) ? children : <NotFound />
}

function PlayerStatistics({ sport, stats }) {
  const fields =
    sport === 'cricket'
      ? [
          ['Runs', 'runs'],
          ['Balls faced', 'balls'],
          ['Wickets', 'wickets'],
          ['4s', 'fours'],
          ['6s', 'sixes'],
        ]
      : sport === 'football'
        ? [
            ['Goals', 'goals'],
            ['Assists', 'assists'],
            ['Yellow cards', 'yellowCards'],
            ['Red cards', 'redCards'],
          ]
        : [
            ['Matches', 'matches'],
            ['Wins', 'wins'],
            ['Sets won', 'setsWon'],
            ['Points won', 'points'],
          ]
  return (
    <section className="st-detail-panel">
      <h2>{sportName(sport)}</h2>
      {stats ? (
        <div className="st-player-metrics">
          {fields.map(([label, key]) => (
            <div key={key}>
              <strong>{stats[key] ?? 0}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p>Statistics appear once a public scorecard is available.</p>
      )}
    </section>
  )
}

export default function ViewerApp() {
  const preview = usePreview()
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, preview])
  return (
    <Shell>
      <Routes key={preview ? 'preview' : 'published'}>
        <Route index element={<Home />} />
        <Route path="fixtures" element={<Home view="fixtures" />} />
        <Route path="tournaments" element={<TournamentList />} />
        <Route path="t/:tournamentId" element={<TournamentPage />} />
        <Route
          path="t/:tournamentId/:sport"
          element={
            <SportGate>
              <SportPage />
            </SportGate>
          }
        />
        <Route
          path="t/:tournamentId/:sport/:fixtureId"
          element={
            <SportGate>
              <FixturePage />
            </SportGate>
          }
        />
        <Route path="players" element={<PlayersPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="players/:playerId" element={<PlayerPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  )
}
