import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { footballApi, tournamentsApi } from '../api/endpoints.js';
import PageLoader from '../components/PageLoader.jsx';
import { ADMIN_PATH, COORDINATOR_PATH } from '../config.js';
import { calculateCurrentSeconds, formatTime, houseName, PERIOD_LABELS } from '../sports/football/format.js';
import { formatDateTime } from '../utils/dates.js';
import './home.css';

export default function HomePage() {
  const [tournaments, setTournaments] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('matches'); // 'matches' | 'standings' | 'portal'
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update timer every second for live clock display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let ignore = false;

    tournamentsApi
      .list()
      .then(async (res) => {
        if (ignore) return;
        const list = res.tournaments || [];
        setTournaments(list);

        const ongoing = list.find((t) => t.status === 'live') || list[0];
        if (ongoing) {
          setSelectedTournament(ongoing);
          const [fixRes, standRes] = await Promise.all([
            footballApi.fixtures(ongoing._id).catch(() => ({ fixtures: [] })),
            footballApi.standings(ongoing._id).catch(() => ({ standings: [] })),
          ]);
          if (!ignore) {
            setFixtures(fixRes.fixtures || []);
            setStandings(standRes.standings || []);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function loadTournamentData(tournamentId) {
    if (!tournamentId) return;
    try {
      const [fixRes, standRes] = await Promise.all([
        footballApi.fixtures(tournamentId).catch(() => ({ fixtures: [] })),
        footballApi.standings(tournamentId).catch(() => ({ standings: [] })),
      ]);
      setFixtures(fixRes.fixtures || []);
      setStandings(standRes.standings || []);
    } catch (err) {
      console.error('Failed to load tournament data:', err);
    }
  }

  // Poll for live scores every 15 seconds if any match is live
  useEffect(() => {
    if (!selectedTournament) return;
    const hasLive = fixtures.some((f) => f.status === 'live');
    if (!hasLive) return;

    const interval = setInterval(() => {
      loadTournamentData(selectedTournament._id);
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedTournament, fixtures]);

  async function handleRefresh() {
    if (!selectedTournament) return;
    setRefreshing(true);
    await loadTournamentData(selectedTournament._id);
    setTimeout(() => setRefreshing(false), 500);
  }

  if (loading) {
    return (
      <div className="home-shell" style={{ display: 'grid', placeItems: 'center' }}>
        <PageLoader />
      </div>
    );
  }

  const liveFixtures = fixtures.filter((f) => f.status === 'live');
  const scheduledFixtures = fixtures.filter((f) => f.status === 'scheduled');
  const completedFixtures = fixtures.filter((f) => f.status === 'completed');

  return (
    <div className="home-shell">
      {/* Mobile-Friendly Sticky App Bar */}
      <header className="home-header">
        <div className="home-header-inner">
          <Link to="/" className="home-brand">
            <img src="/iiits-logo.jpg" alt="IIIT Sri City" className="home-logo" width="34" height="34" />
            <div>
              <h1 className="home-brand-title">IIITS SPORTS</h1>
              <span className="home-brand-subtitle">Campus Live Scores</span>
            </div>
          </Link>

          <div className="home-header-actions">
            <Link to="/register" className="home-btn-sm home-btn-primary">
              Register
            </Link>
            <Link to={COORDINATOR_PATH} className="home-btn-sm home-btn-ghost" title="Referee & Coordinator login">
              Ref Login
            </Link>
          </div>
        </div>
      </header>

      <main className="home-content">
        {/* Tournament Selector (if multiple) */}
        {tournaments && tournaments.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '1rem', scrollbarWidth: 'none' }}>
            {tournaments.map((t) => (
              <button
                key={t._id}
                type="button"
                className={`home-btn-sm ${selectedTournament?._id === t._id ? 'home-btn-primary' : 'home-btn-ghost'}`}
                onClick={() => {
                  setSelectedTournament(t);
                  loadTournamentData(t._id);
                }}
              >
                {t.tournament_name} {t.status === 'live' ? '●' : ''}
              </button>
            ))}
          </div>
        )}

        {/* Tab Selector */}
        <div className="home-tabs">
          <button
            type="button"
            className={`home-tab-btn ${activeTab === 'matches' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            ⚽ Matches {liveFixtures.length > 0 ? `(${liveFixtures.length} Live)` : ''}
          </button>
          <button
            type="button"
            className={`home-tab-btn ${activeTab === 'standings' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('standings')}
          >
            🏆 Points Table
          </button>
          <button
            type="button"
            className={`home-tab-btn ${activeTab === 'portal' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('portal')}
          >
            👤 Student Hub
          </button>
        </div>

        {/* Refresh Bar */}
        <div className="home-refresh-bar">
          <span>
            {selectedTournament ? (
              <strong>{selectedTournament.tournament_name}</strong>
            ) : (
              'No active tournament'
            )}
          </span>
          <button type="button" className="home-refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }}>
              ↻
            </span>
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
        </div>

        {/* TAB 1: MATCHES */}
        {activeTab === 'matches' && (
          <div>
            {/* 1. Live Matches (Highest Priority) */}
            {liveFixtures.map((fixture) => {
              const t1Name = houseName(selectedTournament, fixture.team1);
              const t2Name = houseName(selectedTournament, fixture.team2);
              const elapsedSecs = calculateCurrentSeconds(fixture.clock, currentTime);
              const formattedClock = formatTime(elapsedSecs);
              const periodText = PERIOD_LABELS[fixture.clock?.period] || 'Live';

              return (
                <article key={fixture._id} className="home-live-card">
                  <div className="home-card-header">
                    <span className="home-live-badge">
                      <span className="home-live-pulse" />
                      LIVE MATCH
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8' }}>
                      ⚽ Football
                    </span>
                  </div>

                  <div className="home-scoreboard">
                    <div className="home-team-col">
                      <div className="home-team-name">{t1Name}</div>
                    </div>

                    <div className="home-score-col">
                      <div className="home-score-display">
                        {fixture.team1_score} – {fixture.team2_score}
                      </div>
                      <span className="home-period-tag">
                        {periodText} {fixture.clock?.is_running ? `• ${formattedClock}` : ''}
                      </span>
                    </div>

                    <div className="home-team-col">
                      <div className="home-team-name">{t2Name}</div>
                    </div>
                  </div>

                  {fixture.events && fixture.events.length > 0 && (
                    <div className="home-match-info">
                      <span>Latest: </span>
                      {(() => {
                        const last = fixture.events[fixture.events.length - 1];
                        if (last.type === 'goal') return `⚽ Goal at ${last.minute}'`;
                        if (last.type === 'yellow_card') return `🟨 Yellow Card at ${last.minute}'`;
                        if (last.type === 'red_card') return `🟥 Red Card at ${last.minute}'`;
                        if (last.type === 'substitution') return `🔄 Sub at ${last.minute}'`;
                        return `${last.type} at ${last.minute}'`;
                      })()}
                    </div>
                  )}
                </article>
              );
            })}

            {/* 2. Upcoming / Scheduled Matches */}
            {scheduledFixtures.length > 0 && (
              <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.75rem' }}>
                  Upcoming Matches ({scheduledFixtures.length})
                </h2>
                {scheduledFixtures.map((fixture) => {
                  const t1Name = houseName(selectedTournament, fixture.team1);
                  const t2Name = houseName(selectedTournament, fixture.team2);

                  return (
                    <div key={fixture._id} className="home-match-item">
                      <div className="home-match-item-head">
                        <span className="home-badge-scheduled">Scheduled</span>
                        <span>{fixture.scheduled_at ? formatDateTime(fixture.scheduled_at) : 'Time TBA'}</span>
                      </div>
                      <div className="home-match-teams">
                        <div className="home-team-name">{t1Name}</div>
                        <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.875rem' }}>vs</span>
                        <div className="home-team-name">{t2Name}</div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* 3. Completed Matches */}
            {completedFixtures.length > 0 && (
              <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.75rem' }}>
                  Recent Results ({completedFixtures.length})
                </h2>
                {completedFixtures.map((fixture) => {
                  const t1Name = houseName(selectedTournament, fixture.team1);
                  const t2Name = houseName(selectedTournament, fixture.team2);

                  return (
                    <div key={fixture._id} className="home-match-item">
                      <div className="home-match-item-head">
                        <span className="home-badge-completed">Full Time</span>
                        <span>{fixture.scheduled_at ? formatDateTime(fixture.scheduled_at) : ''}</span>
                      </div>
                      <div className="home-match-teams">
                        <div className="home-team-name" style={{ color: fixture.result === 'team1' ? '#4ade80' : 'inherit' }}>
                          {t1Name}
                        </div>
                        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#38bdf8', padding: '0 0.5rem' }}>
                          {fixture.team1_score} – {fixture.team2_score}
                        </div>
                        <div className="home-team-name" style={{ color: fixture.result === 'team2' ? '#4ade80' : 'inherit' }}>
                          {t2Name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Empty state if no fixtures */}
            {fixtures.length === 0 && (
              <div className="home-empty-state">
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚽</div>
                <h3 style={{ fontSize: '1.125rem', color: '#fff', marginBottom: '0.25rem' }}>No matches scheduled yet</h3>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Matches will appear here as soon as they are scheduled by the tournament admin.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: POINTS TABLE */}
        {activeTab === 'standings' && (
          <div>
            {standings.length > 0 ? (
              <div className="home-standings-card">
                <div className="table-scroll">
                  <table className="home-standings-table">
                    <thead>
                      <tr>
                        <th style={{ width: '36px' }}>#</th>
                        <th className="house-col">House</th>
                        <th title="Played">P</th>
                        <th title="Won">W</th>
                        <th title="Drawn">D</th>
                        <th title="Lost">L</th>
                        <th title="Goal Difference">GD</th>
                        <th className="pts-col" title="Points">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row) => (
                        <tr key={row.house_id}>
                          <td style={{ fontWeight: 600, color: '#94a3b8' }}>{row.position}</td>
                          <td className="house-col">{row.house_name}</td>
                          <td>{row.played}</td>
                          <td>{row.won}</td>
                          <td>{row.drawn}</td>
                          <td>{row.lost}</td>
                          <td>{row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}</td>
                          <td className="pts-col">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '10px 14px', borderTop: '1px solid rgb(148 163 184 / 0.1)', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Win: 3 pts · Draw: 1 pt · Loss: 0 pts · Tiebreaker: Head-to-Head, GD, GF
                </div>
              </div>
            ) : (
              <div className="home-empty-state">
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
                <h3 style={{ fontSize: '1.125rem', color: '#fff', marginBottom: '0.25rem' }}>Standings will show once matches start</h3>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Points and goal differences will update automatically after each match.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STUDENT HUB / QUICK PORTAL */}
        {activeTab === 'portal' && (
          <div>
            <div className="home-grid-2">
              <Link to="/register" className="home-action-card">
                <span className="home-action-icon">📝</span>
                <span className="home-action-title">Player Sign-Up</span>
                <span className="home-action-desc">
                  Register your name, roll number, and handle so referees can add you to team match slips.
                </span>
              </Link>

              <Link to={COORDINATOR_PATH} className="home-action-card">
                <span className="home-action-icon">⏱️</span>
                <span className="home-action-title">Referee / Coordinator Portal</span>
                <span className="home-action-desc">
                  Assigned referees can submit team lineups, manage the match clock, record goals, and submit cards.
                </span>
              </Link>

              <Link to={ADMIN_PATH} className="home-action-card">
                <span className="home-action-icon">⚙️</span>
                <span className="home-action-title">Tournament Admin</span>
                <span className="home-action-desc">
                  Create new tournaments, add sports, schedule matches, and assign referees.
                </span>
              </Link>

              <div className="home-action-card" style={{ cursor: 'default' }}>
                <span className="home-action-icon">📱</span>
                <span className="home-action-title">Add to Home Screen</span>
                <span className="home-action-desc">
                  For quick access during matches, tap your browser's share icon and select <strong>"Add to Home Screen"</strong>.
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
