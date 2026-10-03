import { instituteLogo, useAppearance } from '../hooks/useAppearance.js'
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
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  House,
  Search,
  Share2,
  SlidersHorizontal,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { API_URL, COORDINATOR_PATH } from '../config.js'
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
import { stageLabel } from '../sports/stages.js'
import { useLiveRefresh } from './useLiveRefresh.js'
import { useLiveStream } from './useLiveStream.js'
import { useViewerData } from './useViewerData.js'
import { FixtureContent, PointsTable } from './SportsContent.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import { LivePulse } from './animations.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { useViewerMotion } from './motion.js'
import { CricketLiveHeader } from './CricketLive.jsx'
import ClayIcon from './Clay.jsx'
import { advancePreview, advancePreviewFootball, useLiveFeed, usePreviewTicker, useScoreEvent } from './liveFeed.js'
import { SportCelebration } from './Fx.jsx'
import './viewer.css'
import './live.css'
import '@fontsource-variable/inter'

// Demo data is available only when explicitly requested with ?preview=1.
const withPreview = (path) => {
  if (new URLSearchParams(window.location.search).get('preview') !== '1') return path
  return `${path}${path.includes('?') ? '&' : '?'}preview=1`
}
function usePreview() {
  const { search } = useLocation()
  return new URLSearchParams(search).get('preview') === '1'
}

function shareToWhatsApp({ text, url }) {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
  const fullMessage = text ? `${text}\n${targetUrl}` : targetUrl
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage)}`
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
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
  if (status === 'completed') {
    return (
      <span className="st-status st-status-completed">
        <span className="st-completed-dot" aria-hidden="true" />
        <span>Completed</span>
      </span>
    )
  }
  return (
    <span className={`st-status st-status-${status}`}>
      Upcoming
    </span>
  )
}

function Shell({ children }) {
  const preview = usePreview()
  const { theme, changeTheme } = useAppearance()
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
              src={instituteLogo(theme)}
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
      {preview && (
        <div className="st-preview-banner">
          <span>Design preview · sample scores and players</span>
          <Link to="/">
            View published scores <ArrowRight size={13} />
          </Link>
        </div>
      )}
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
        <p className="st-retry-note">Check your connection or try loading this page again.</p>
        <button onClick={onRetry}>Try now</button>
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

function HouseBadge() {
  return null
}

function SportIcon({ sport }) {
  return <ClayIcon kind={sport} size={28} />
}

// A fixture's tag line (Semi final, Final, ...), if the admin set one.
function StageTag({ stage }) {
  const label = stageLabel(stage)
  return label ? <span className="st-stage-tag">{label}</span> : null
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
        <div className="st-match-top-info">
          <span className="st-sport-tag">{sportName(item.sport)}</span>
          <span className="st-match-tourney">
            {tournament?.tournament_name}
          </span>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="st-match-meta">
        <StageTag stage={item.stage} />
        {item.sport === 'cricket' && item.overs ? `${item.overs} overs · ` : ''}
        {item.scheduled_at
          ? formatDate(item.scheduled_at)
          : 'Time not announced'}
      </div>
      <div className="st-team-row">
        <strong>{first}</strong>
        <b>{score(item, 'team1')}</b>
      </div>
      <div className="st-team-row">
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
  )
  // Only the home page refreshes, once a minute, and only its live cards.
  const live = useLiveRefresh(data?.fixtures ?? [], view === 'home' && !preview && Boolean(data))
  const lastUpdate = live.refreshedAt ?? updated
  const [statusFilter, setStatusFilter] = useState('all')
  const [sportFilter, setSportFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const rail = useRef(null)
  const searchInputRef = useRef(null)
  const tournaments = data?.tournaments ?? []
  const fixtures = sortFixtures(live.fixtures)

  const findTournament = (item) =>
    tournaments.find((row) => idOf(row) === item.tournamentId)

  const matchesSearch = (item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    const t = findTournament(item)
    const t1 = houseName(t, item.team1).toLowerCase()
    const t2 = houseName(t, item.team2).toLowerCase()
    const rawT1 = String(item.team1 ?? '').toLowerCase()
    const rawT2 = String(item.team2 ?? '').toLowerCase()
    const sp = (item.sport ?? '').toLowerCase()
    const spLabel = sportName(item.sport).toLowerCase()
    const tourName = (t?.tournament_name ?? '').toLowerCase()
    const stage = (stageLabel(item.stage) ?? '').toLowerCase()
    return (
      t1.includes(q) ||
      t2.includes(q) ||
      rawT1.includes(q) ||
      rawT2.includes(q) ||
      sp.includes(q) ||
      spLabel.includes(q) ||
      tourName.includes(q) ||
      stage.includes(q)
    )
  }

  // Live matches ordered by latest scheduled / started
  const liveMatches = [...fixtures.filter((item) => item.status === 'live')].sort(
    (a, b) => new Date(b.scheduled_at ?? 0) - new Date(a.scheduled_at ?? 0),
  )

  // On Home: show only latest 3 matches. If live ones exist, latest 3 live; if not, latest 3 matches.
  const homeMatches =
    liveMatches.length > 0
      ? liveMatches.slice(0, 3)
      : fixtures.slice(0, 3)

  const fixturesMatches = fixtures.filter((item) => {
    const statusMatch =
      statusFilter === 'all' || item.status === statusFilter
    const sportMatch =
      sportFilter === 'all' || item.sport === sportFilter
    return statusMatch && sportMatch && matchesSearch(item)
  })

  const shown = view === 'home' ? homeMatches : fixturesMatches

  const liveCount = fixtures.filter((item) => item.status === 'live').length
  const hasActiveFilters =
    statusFilter !== 'all' || sportFilter !== 'all' || Boolean(searchQuery.trim())

  const resetAllFilters = () => {
    setStatusFilter('all')
    setSportFilter('all')
    setSearchQuery('')
    setFilterOpen(false)
  }

  const handleShareFixturesWhatsApp = () => {
    shareToWhatsApp({
      text: 'Catch the latest scores and fixtures on IIITS Sports!',
    })
  }

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
                <span className="st-count">{view === 'home' ? shown.length : fixtures.length}</span>
              </h1>
            </div>
            <div className="st-score-title-actions">
              {view === 'fixtures' && (
                <button
                  type="button"
                  className="st-share-icon-btn"
                  onClick={handleShareFixturesWhatsApp}
                  title="Share on WhatsApp"
                  aria-label="Share on WhatsApp"
                >
                  <Share2 size={15} />
                </button>
              )}
              {view === 'home' && fixtures.length > 3 && (
                <Link className="st-text-link" to={withPreview('/fixtures')}>
                  View all <ArrowRight size={16} />
                </Link>
              )}
              {lastUpdate && !preview && (
                <span className="st-updated">
                  {`Updated ${new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(lastUpdate)}`}
                </span>
              )}
            </div>
          </div>

          {/* Search & Filter Toolbar only in fixtures view */}
          {view === 'fixtures' && (
            <div className="st-fixtures-toolbar">
              {/* Row 1: Unified Search Bar & Sport Filter side-by-side */}
              <div className="st-fixtures-search-row">
                <div
                  className="st-fixtures-search-box"
                  onClick={() => searchInputRef.current?.focus()}
                >
                  <Search size={16} className="st-search-box-icon" aria-hidden="true" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="st-fixtures-search-input"
                    placeholder="Search matches, teams (e.g. UG1)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search fixtures by team or sport"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="st-search-clear-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSearchQuery('')
                        searchInputRef.current?.focus()
                      }}
                      aria-label="Clear search"
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className={`st-filter-toggle-btn ${sportFilter !== 'all' ? 'is-active' : ''} ${filterOpen ? 'is-open' : ''}`}
                  onClick={() => setFilterOpen((v) => !v)}
                  aria-expanded={filterOpen}
                  aria-label="Filter by sport"
                >
                  <SlidersHorizontal size={15} />
                  <span className="st-filter-toggle-text">
                    {sportFilter === 'all' ? 'Sports' : sportName(sportFilter)}
                  </span>
                  {sportFilter !== 'all' && <span className="st-filter-badge">1</span>}
                  <ChevronDown size={13} className={`st-dropdown-arrow ${filterOpen ? 'is-open' : ''}`} />
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="st-filter-reset-btn"
                    onClick={resetAllFilters}
                    title="Reset all filters"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Expandable Sport Filter Drawer */}
              {filterOpen && (
                <div className="st-sport-filter-drawer" role="region" aria-label="Filter by sport options">
                  <div className="st-sport-drawer-header">
                    <span>Filter by Sport:</span>
                    {sportFilter !== 'all' && (
                      <button
                        type="button"
                        className="st-sport-drawer-clear"
                        onClick={() => setSportFilter('all')}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="st-sport-filter-pills">
                    <button
                      type="button"
                      className={`st-sport-pill ${sportFilter === 'all' ? 'active' : ''}`}
                      onClick={() => {
                        setSportFilter('all')
                        setFilterOpen(false)
                      }}
                    >
                      All Sports
                    </button>
                    {sports.map((sport) => (
                      <button
                        key={sport}
                        type="button"
                        className={`st-sport-pill ${sportFilter === sport ? 'active' : ''}`}
                        onClick={() => {
                          setSportFilter(sport)
                          setFilterOpen(false)
                        }}
                      >
                        {sportName(sport)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 2: Apple-style Segmented Status Control */}
              <div
                className="st-segmented-control"
                role="tablist"
                aria-label="Filter fixtures by status"
              >
                {[
                  ['all', 'All'],
                  ['live', 'Live', liveCount],
                  ['scheduled', 'Upcoming'],
                  ['completed', 'Finished'],
                ].map(([key, label, count]) => (
                  <button
                    key={key}
                    role="tab"
                    className={`st-segmented-tab ${statusFilter === key ? 'active' : ''}`}
                    aria-selected={statusFilter === key}
                    onClick={() => setStatusFilter(key)}
                  >
                    {key === 'live' && count > 0 && <span className="st-live-dot" aria-hidden="true" />}
                    <span>{label}</span>
                    {key === 'live' && count > 0 && (
                      <span className="st-segmented-count">{count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                {shown.some((item) => item.status === 'live') && (
                  <p className="st-panel-note">
                    {view === 'home'
                      ? 'Live scores on this page refresh every minute. Open a match to follow it in real time.'
                      : 'Live scores on this page don’t update on their own. Open a match to follow it in real time.'}
                  </p>
                )}
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
              <div className="st-fixtures-empty-search">
                <p>
                  No fixtures found
                  {searchQuery.trim() ? (
                    <> matching <strong>"{searchQuery}"</strong></>
                  ) : null}
                  {sportFilter !== 'all' ? (
                    <> in <strong>{sportName(sportFilter)}</strong></>
                  ) : null}
                  {statusFilter !== 'all' ? (
                    <> with status <strong>{statusFilter}</strong></>
                  ) : null}.
                </p>
                <button
                  type="button"
                  className="st-fixtures-clear-btn"
                  onClick={resetAllFilters}
                >
                  Clear all filters
                </button>
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
                      {error ? 'Tournaments will return when the scoreboard reconnects.' : 'Published campus tournaments will appear here.'}
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
                      {error ? 'Upcoming fixtures are temporarily unavailable.' : 'No upcoming fixtures announced.'}
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
      <nav className="st-crumbs" aria-label="Breadcrumb">
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

// The winner and runner-up the admin declared for this sport, once its matches are over.
function WinnersBanner({ tournament, sport }) {
  const game = tournament?.games?.find((row) => row.game_name?.toLowerCase() === sport)
  const result = game && tournament.winners?.find((row) => idOf(row.game) === idOf(game))
  if (!result?.winner) return null
  return (
    <section className="st-winners" aria-label={`${sportName(sport)} winners`}>
      <Trophy size={28} aria-hidden="true" />
      <div>
        <span className="st-eyebrow">Winner</span>
        <strong>{houseName(tournament, result.winner)}</strong>
      </div>
      {result.runner_up && (
        <div>
          <span className="st-eyebrow">Runner-up</span>
          <strong>{houseName(tournament, result.runner_up)}</strong>
        </div>
      )}
    </section>
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
      <WinnersBanner tournament={data?.tournament} sport={sport} />
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
                <>
                  <PointsTable data={data.table} sport={sport} />
                  <p className="st-panel-note">
                    The table doesn’t update on its own. To see the latest
                    values, refresh the page.
                  </p>
                </>
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
              { q: event.target.value },
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
              { q: event.target.value },
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
  const { data: baseData, error, retry, updated } = useLiveStream({
    key: `${tournamentId}-${sport}-${fixtureId}-${preview}`,
    load: () =>
      preview
        ? Promise.resolve(previewFixture(sport, fixtureId))
        : loadFixture(tournamentId, sport, fixtureId),
    // Live scores arrive over SSE; polling is only the fallback (and preview mode's loader).
    streamUrl: preview
      ? null
      : `${API_URL}/api/${sport}/fixtures/${encodeURIComponent(fixtureId)}/stream`,
    // Reshape each streamed frame exactly like loadFixture does, so rendering is identical.
    map: (payload) => {
      if (idOf(payload.fixture?.tournament) !== tournamentId)
        throw new Error('This fixture does not belong to this tournament.')
      return {
        tournament: payload.tournament,
        detail: payload,
        fixture: { ...payload.fixture, sport, tournamentId },
      }
    },
  })
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

  const handleShareWhatsApp = () => {
    const catchyLine =
      f?.status === 'live'
        ? `Watch ${first} vs ${second} live on IIITS Sports!`
        : f?.status === 'completed'
        ? `Check ${first} vs ${second} match result on IIITS Sports!`
        : `Upcoming match: ${first} vs ${second} on IIITS Sports!`
    shareToWhatsApp({ text: catchyLine })
  }

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
              <button
                type="button"
                className="st-share-icon-btn st-hero-share-btn"
                onClick={handleShareWhatsApp}
                title="Share on WhatsApp"
                aria-label="Share on WhatsApp"
              >
                <Share2 size={15} />
              </button>
              {sport !== 'cricket' && <SportCelebration event={scoreEvent} sport={sport} />}
              {sport === 'cricket' && f.status !== 'live' && <SportCelebration event={liveFeed.event} sport="cricket" />}
              <h1 className="st-sr-only">
                {first} vs {second}
              </h1>
              <div className="st-fixture-eyebrow">
                <div className="st-fixture-eyebrow-left">
                  <span>
                    {sportName(sport)} · {data.tournament.tournament_name}
                    <StageTag stage={f.stage} />
                  </span>
                  <StatusBadge status={f.status} />
                </div>
              </div>
              {sport === 'cricket' && f.status === 'live' ? <CricketLiveHeader data={data} live={liveFeed} /> : <>
              <div className="st-fixture-score">
                <div>
                  <i
                    className={`st-house-dot st-house-${first.toLowerCase().split(' ')[0]}`}
                  />
                  <strong>{first}</strong>
                  <b>{score(data, 'team1')}</b>
                </div>
                <span className="st-versus">VS</span>
                <div>
                  <i
                    className={`st-house-dot st-house-${second.toLowerCase().split(' ')[0]}`}
                  />
                  <strong>{second}</strong>
                  <b>{score(data, 'team2')}</b>
                </div>
              </div>
              <p>{resultLine(data, data.tournament)}</p>
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
            {(() => {
              const tabItems =
              sport === 'volleyball'
                ? [
                    ['summary', 'Sets'],
                    ['squads', 'Squads'],
                  ]
                : sport === 'kabaddi'
                  ? [
                      ['summary', f.status === 'live' ? 'Live' : 'Match info'],
                      ['scorecard', 'Scorecard'],
                      ...(f.status === 'completed'
                        ? [
                            ['timeline', 'Timeline'],
                          ]
                        : []),
                      ['squads', 'Squads'],
                    ]
                  : [
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
                    ]
            const activeTab = tabItems.some(([name]) => name === tab) ? tab : tabItems[0][0]

            return (
              <>
                <ContentTabs
                  id="fixture-tabs"
                  value={activeTab}
                  onChange={setTab}
                  items={tabItems}
                />
                <div
                  id="fixture-tabs-panel"
                  role="tabpanel"
                  aria-labelledby={`fixture-tabs-${activeTab}`}
                  tabIndex={0}
                >
                  <FixtureContent tab={activeTab} data={data} />
                </div>
              </>
            )
          })()}
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
        : sport === 'kabaddi'
          ? [
              ['Played', 'played'],
              ['Won', 'won'],
              ['Raid points', 'raidPoints'],
              ['Tackle points', 'tacklePoints'],
            ]
        : [
            ['Matches', 'matches'],
            ['Wins', 'wins'],
            ['Sets won', 'setsWon'],
            ['Points won', 'points'],
          ]
  return (
    <section className="st-detail-panel st-player-stats-panel">
      <h2>{sportName(sport)}</h2>
      {stats ? (
        <div
          className={`st-player-metrics ${fields.length > 4 ? 'st-player-metrics--many' : ''}`}
          style={{ '--metric-cols': fields.length }}
        >
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
