import { useState } from 'react'
import { formatPlayerName } from '../utils/names.js'
import CricketLive from './CricketLive.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import { Check, Clock3 } from 'lucide-react'
import {
  dismissalText,
  inningsTitle,
  oversText,
  runRate,
  strikeRate,
} from '../sports/cricket/format.js'
import {
  calculateCurrentSeconds,
  EVENT_TYPE_LABELS,
  formatTime,
  GOAL_TYPE_LABELS,
  PERIOD_LABELS,
  rosterState,
  sortEvents,
} from '../sports/football/format.js'
import {
  describeEvent as describeKabaddiEvent,
  eventBadge as kabaddiEventBadge,
  formatClock as formatKabaddiClock,
  lineupPlayers as kabaddiLineupPlayers,
  PERIOD_LABELS as KABADDI_PERIOD_LABELS,
  remainingSeconds as kabaddiRemainingSeconds,
  TEAMS as KABADDI_TEAMS,
} from '../sports/kabaddi/format.js'
import '../sports/kabaddi/kabaddi.css'
import { OnTheMat } from '../sports/kabaddi/MatchConsole.jsx'
import {
  configOf as volleyballConfigOf,
  MATCH_SETS,
} from '../sports/volleyball/format.js'
import { houseName, idOf, resultLine, sportName, formatDate } from './data.js'

function playerIndex(fixture) {
  return new Map(
    ['team1', 'team2']
      .flatMap((team) => [
        ...(fixture[`${team}_players`] ?? []),
        ...(fixture[`${team}_substitutes`] ?? []),
      ])
      .map((player) => [idOf(player), player]),
  )
}
const playerName = (players, id) => {
  const p = players?.get(idOf(id))
  if (!p) return 'Player to be announced'
  const formatted = formatPlayerName(p.name) || p.name || 'Player'
  return p.substitute ? `sub [${formatted}]` : formatted
}

function BattingTable({ innings, players, live = false }) {
  const rows = (innings.batting ?? []).filter(
    (row) =>
      !live ||
      [idOf(innings.striker), idOf(innings.non_striker)].includes(
        idOf(row.player),
      ),
  )
  return (
    <div className="st-table-scroll">
      <table className="st-table st-scorecard-table">
        <thead>
          <tr>
            <th scope="col">Batting</th>
            {['R', 'B', '4s', '6s', 'SR'].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={idOf(row.player)}>
              <th scope="row">
                {playerName(players, row.player)}
                {idOf(innings.striker) === idOf(row.player) &&
                innings.status === 'live'
                  ? ' *'
                  : ''}
                <small>
                  {row.dismissal
                    ? dismissalText(row.dismissal, players)
                    : row.status === 'batting'
                      ? 'Batting'
                      : 'Not out'}
                </small>
              </th>
              <td>
                <strong>{row.runs}</strong>
              </td>
              <td>{row.balls}</td>
              <td>{row.fours}</td>
              <td>{row.sixes}</td>
              <td>{strikeRate(row.runs, row.balls)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="st-table-empty">Batters to be announced.</p>
      )}
    </div>
  )
}

function BowlingTable({ innings, players, live = false }) {
  const rows = (innings.bowling ?? []).filter(
    (row) => !live || idOf(row.player) === idOf(innings.bowler),
  )
  return (
    <div className="st-table-scroll">
      <table className="st-table st-scorecard-table">
        <thead>
          <tr>
            <th scope="col">Bowling</th>
            {['O', 'M', 'R', 'W', 'Econ'].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={idOf(row.player)}>
              <th scope="row">{playerName(players, row.player)}</th>
              <td>{oversText(row.balls)}</td>
              <td>{row.maidens}</td>
              <td>{row.runs}</td>
              <td>
                <strong>{row.wickets}</strong>
              </td>
              <td>{runRate(row.runs, row.balls)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="st-table-empty">Bowling figures to come.</p>
      )}
    </div>
  )
}

function ActiveCricketers({ innings, players }) {
  const batters = (innings.batting ?? []).filter(row => [idOf(innings.striker), idOf(innings.non_striker)].includes(idOf(row.player)))
  const bowler = (innings.bowling ?? []).find(row => idOf(row.player) === idOf(innings.bowler))
  return <div className="st-active-players">
    {batters.map(row => <div className="st-active-player" key={idOf(row.player)}>
      <PlayerAvatar id={idOf(row.player)} />
      <div><small>{idOf(row.player) === idOf(innings.striker) ? 'On strike' : 'Non-striker'}</small><strong>{playerName(players, row.player)}</strong><p><b>{row.runs}</b> <span>({row.balls})</span></p><small>{row.fours} fours · {row.sixes} sixes · SR {strikeRate(row.runs, row.balls)}</small></div>
    </div>)}
    {bowler && <div className="st-active-player" key={idOf(bowler.player)}><PlayerAvatar id={idOf(bowler.player)} /><div><small>Bowling</small><strong>{playerName(players, bowler.player)}</strong><p><b>{bowler.wickets}–{bowler.runs}</b> <span>({oversText(bowler.balls)} ov)</span></p><small>Economy {runRate(bowler.runs, bowler.balls)}</small></div></div>}
  </div>
}

function CricketScorecard({ data, live = false }) {
  const { fixture, detail, tournament } = data
  const players = playerIndex(fixture)
  const innings = live
    ? (detail.innings ?? []).filter((row) => row.status === 'live')
    : (detail.innings ?? [])
  if (!innings.length)
    return (
      <div className="st-message st-message-small">
        {fixture.status === 'scheduled'
          ? 'Not started yet. The scorecard will appear when play begins.'
          : 'No innings in play right now.'}
      </div>
    )
  return (
    <div className="st-detail-stack">
      {innings.map((inning) => {
        const left = Math.max(
          0,
          (inning.overs ?? fixture.overs ?? 0) * 6 - inning.legal_balls,
        )
        const batted = new Set(
          (inning.batting ?? []).map((row) => idOf(row.player)),
        )
        const didNotBat = (
          fixture[`${inning.batting_team}_players`] ?? []
        ).filter((player) => !batted.has(idOf(player)))
        return (
          <section
            className="st-detail-panel st-cricket-innings"
            key={idOf(inning)}
          >
            <header className="st-innings-head">
              <div>
                <span className="st-eyebrow">{inningsTitle(inning)}</span>
                <h2>{houseName(tournament, fixture[inning.batting_team])}</h2>
              </div>
              <div className="st-innings-total">
                {inning.runs}/{inning.wickets}
                <small>
                  {oversText(inning.legal_balls)} ov · CRR{' '}
                  {runRate(inning.runs, inning.legal_balls)}
                </small>
              </div>
            </header>
            {inning.target != null && (
              <p className="st-chase-line">
                Target {inning.target} · Need{' '}
                {Math.max(0, inning.target - inning.runs)} from {left} balls
                {left > 0 &&
                  ` · RRR ${runRate(Math.max(0, inning.target - inning.runs), left)}`}
              </p>
            )}
            {live && (
              <div className="st-live-flags">
                {inning.free_hit && <span>FREE HIT</span>}
                {inning.powerplay_overs >
                  Math.floor(inning.legal_balls / 6) && <span>POWERPLAY</span>}
              </div>
            )}
            {live ? <ActiveCricketers innings={inning} players={players} /> : <BattingTable innings={inning} players={players} />}
            {!live && (
              <div className="st-innings-notes">
                <p>
                  <strong>Extras {inning.extras?.total ?? 0}</strong> (wd{' '}
                  {inning.extras?.wides ?? 0}, nb {inning.extras?.no_balls ?? 0}
                  , b {inning.extras?.byes ?? 0}, lb{' '}
                  {inning.extras?.leg_byes ?? 0})
                </p>
                {didNotBat.length > 0 && (
                  <p>
                    <strong>Did not bat:</strong>{' '}
                    {didNotBat.map((player) => formatPlayerName(player.name)).join(', ')}
                  </p>
                )}
                {inning.fall_of_wickets?.length > 0 && (
                  <p>
                    <strong>Fall of wickets:</strong>{' '}
                    {inning.fall_of_wickets
                      .map(
                        (row) =>
                          `${row.runs}/${row.wicket_no} (${playerName(players, row.player)}, ${oversText(row.balls)} ov)`,
                      )
                      .join(' · ')}
                  </p>
                )}
              </div>
            )}
            {!live && <BowlingTable innings={inning} players={players} />}
            {live && (
              <div className="st-over-strip">
                <span>THIS OVER</span>
                {(inning.this_over ?? []).map((ball, index) => (
                  <b
                    className={
                      ball.includes('W')
                        ? 'is-wicket'
                        : ball === '4' || ball === '6'
                          ? 'is-boundary'
                          : ''
                    }
                    key={index}
                  >
                    {ball === '0' ? '•' : ball}
                  </b>
                ))}
                {!inning.this_over?.length && (
                  <p>Waiting for the first ball.</p>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function BadmintonMatches({ data }) {
  const matches = data.detail.matches ?? []
  if (!matches.length)
    return (
      <div className="st-message st-message-small">
        Match order to be announced.
      </div>
    )
  return (
    <div className="st-detail-stack">
      {matches.map((match) => (
        <details
          className={`st-badminton-match ${match.status === 'live' ? 'is-live' : ''}`}
          key={idOf(match)}
          open={match.status === 'live' || match.status === 'pending'}
        >
          <summary>
            <span>
              <b>Match {match.match_no}</b> · {match.type} ·{' '}
              {match.sets_count === 1 ? '1 set' : 'Best of 3'} to{' '}
              {match.points_to_win ?? 21}
            </span>
            <span className={match.status === 'live' ? 'st-live-text' : ''}>
              {match.status === 'live'
                ? '● LIVE'
                : match.status === 'completed'
                  ? 'Finished'
                  : match.status === 'not_played'
                    ? 'Not played'
                    : 'Up next'}
            </span>
          </summary>
          <div className="st-badminton-score">
            {['team1', 'team2'].map((team) => (
              <div key={team}>
                <div className="st-badminton-player-portraits">{(match[`${team}_players`] ?? []).map(player => <PlayerAvatar key={idOf(player)} id={idOf(player)} />)}</div>
                <strong>
                  {(match[`${team}_players`] ?? [])
                    .map((player) => formatPlayerName(player.name))
                    .join(' / ') || 'Players to be announced'}
                </strong>
                <div>
                  {(match.sets ?? []).map((set) => (
                    <b
                      className={`${set.winner === team ? 'won' : ''} ${set.status === 'live' ? 'current' : ''}`}
                      key={idOf(set)}
                    >
                      {set[`${team}_points`]}
                    </b>
                  ))}
                  {match.winner === team && (
                    <Check size={18} aria-label="Won" />
                  )}
                </div>
              </div>
            ))}
          </div>
          {match.note && <p className="st-innings-notes">{match.note}</p>}
        </details>
      ))}
    </div>
  )
}

function FootballTimeline({ data }) {
  const f = data.fixture
  const events = sortEvents(f.events).reverse()
  return (
    <div className="st-detail-stack">
      <section className="st-detail-panel st-football-clock">
        <Clock3 size={20} />
        <strong>
          {PERIOD_LABELS[f.clock?.period] ?? 'Pre-match'} ·{' '}
          {formatTime(calculateCurrentSeconds(f.clock))}
        </strong>
        <span>{f.clock?.is_running ? 'Clock running' : 'Clock paused'}</span>
      </section>
      {events.map((event, index) => (
        <section
          className="st-detail-panel st-event-row"
          key={event._id ?? index}
        >
          <strong>{event.minute}′</strong>
          {event.player && <PlayerAvatar id={idOf(event.player)} />}
          <div>
            <b>
              {event.type === 'goal'
                ? (GOAL_TYPE_LABELS[event.goal_type] ?? 'Goal')
                : (EVENT_TYPE_LABELS[event.type] ?? event.type)}
            </b>
            <p>
              {event.type === 'substitution'
                ? `${formatPlayerName(event.player_in?.name) || 'Player'} on · ${formatPlayerName(event.player_out?.name) || 'Player'} off`
                : (formatPlayerName(event.player?.name) ||
                  houseName(data.tournament, f[event.team]))}
            </p>
            {event.assist_player?.name && (
              <p>Assist: {formatPlayerName(event.assist_player.name)}</p>
            )}
          </div>
          <span>{houseName(data.tournament, f[event.team])}</span>
        </section>
      ))}
      {!events.length && (
        <div className="st-message st-message-small">No match events yet.</div>
      )}
    </div>
  )
}

function KabaddiTimeline({ data }) {
  const { fixture, tournament, detail } = data
  const players = kabaddiLineupPlayers(fixture)
  const state = detail?.state ?? {
    sides: { team1: { on_court: [], out: [], bench: [] }, team2: { on_court: [], out: [], bench: [] } },
    timeline: [],
  }
  const names = {
    team1: houseName(tournament, fixture.team1),
    team2: houseName(tournament, fixture.team2),
  }
  const rows = (fixture.events ?? [])
    .map((event, index) => ({ event, entry: state.timeline?.[index], number: index + 1 }))
    .reverse()
  const sides = state.sides

  return (
    <div className="kb">
      <section className="st-detail-panel st-football-clock" style={{ background: 'var(--kb-surface)', borderColor: 'var(--kb-line)', color: 'var(--kb-text)' }}>
        <Clock3 size={20} />
        <strong>{KABADDI_PERIOD_LABELS[fixture.clock?.period] ?? 'Pre-match'} · {formatKabaddiClock(kabaddiRemainingSeconds(fixture))}</strong>
        <span style={{ color: 'var(--kb-muted)' }}>{fixture.clock?.is_running ? 'Clock running' : 'Clock paused'}</span>
      </section>

      {sides && <OnTheMat state={detail.state} />}



      <section className="kb-panel">
        <h3 className="kb-title">Events</h3>
        {rows.length === 0 ? (
          <p className="kb-hint">Nothing recorded yet.</p>
        ) : (
          <ol className="kb-log">
            {rows.map(({ event, entry, number }) => {
              const gained = ['team1', 'team2'].filter((team) => entry?.points?.[team])
              const badge = kabaddiEventBadge(event, entry)
              return (
                <li key={event._id || number} className="kb-log-row">
                  <span className="kb-log-no">{number}</span>
                  <span className={`kb-tag kb-tag-${badge.tone}`}>{badge.label}</span>
                  <span className="kb-log-text">
                    <strong>{names[event.team]}</strong> {describeKabaddiEvent(event, players)}
                    {event.type === 'raid' && entry?.line_outs?.length > 0 && <span className="kb-tag kb-tag-line_out">Line out</span>}
                    {entry?.do_or_die && <span className="kb-tag kb-tag-warn">Do-or-die</span>}
                    {entry?.all_out && <span className="kb-tag kb-tag-bad">All out: {names[entry.all_out]}</span>}
                  </span>
                  <span className="kb-log-points">
                    {gained.map((team) => (
                      <span key={team}>
                        {entry.points[team] > 0 ? '+' : ''}
                        {entry.points[team]} {names[team]}
                      </span>
                    ))}
                  </span>
                  <span className="kb-log-score">
                    {entry?.score_after ? `${entry.score_after.team1}–${entry.score_after.team2}` : ''}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

function KabaddiMatchComparison({ stats, team1Name, team2Name, first, second }) {
  const currentStats = stats ?? {
    team1: { total_points: 0, raid_points: 0, tackle_points: 0, all_out_points: 0, extra_points: 0 },
    team2: { total_points: 0, raid_points: 0, tackle_points: 0, all_out_points: 0, extra_points: 0 },
  }

  const metrics = [
    { label: 'Total Points', key: 'total_points' },
    { label: 'Raid Points', key: 'raid_points' },
    { label: 'Tackle Points', key: 'tackle_points' },
    { label: 'All out Points', key: 'all_out_points' },
    { label: 'Extra Points', key: 'extra_points' },
  ]

  return (
    <section className="st-detail-panel st-kabaddi-comparison-panel">
      <div className="st-comparison-card">
        <div className="st-comparison-header">
          <div className="st-comparison-team left">
            <span className="st-comparison-team-name">{team1Name}</span>
            <i className={`st-house-dot st-house-${(first ?? '').toLowerCase().split(' ')[0]}`} />
            <div className="st-comparison-accent-bar left" />
          </div>
          <div className="st-comparison-title">Match Comparison</div>
          <div className="st-comparison-team right">
            <div className="st-comparison-accent-bar right" />
            <i className={`st-house-dot st-house-${(second ?? '').toLowerCase().split(' ')[0]}`} />
            <span className="st-comparison-team-name">{team2Name}</span>
          </div>
        </div>

        <div className="st-comparison-rows">
          {metrics.map(({ label, key }) => {
            const v1 = currentStats.team1?.[key] ?? 0
            const v2 = currentStats.team2?.[key] ?? 0
            const maxVal = Math.max(v1, v2, 1)
            const pct1 = Math.round((v1 / maxVal) * 85)
            const pct2 = Math.round((v2 / maxVal) * 85)

            return (
              <div key={key} className="st-comparison-row">
                <div className="st-comparison-val left">{v1}</div>
                <div className="st-comparison-center">
                  <span className="st-comparison-metric-label">{label}</span>
                  <div className="st-comparison-bar-track">
                    <div className="st-comparison-bar-half left">
                      <div
                        className="st-comparison-bar-fill left"
                        style={{ width: `${pct1}%` }}
                      />
                    </div>
                    <div className="st-comparison-bar-divider" />
                    <div className="st-comparison-bar-half right">
                      <div
                        className="st-comparison-bar-fill right"
                        style={{ width: `${pct2}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="st-comparison-val right">{v2}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function KabaddiScorecardTable({ teamName, houseClass, score, players = [] }) {
  const totals = players.reduce(
    (acc, p) => ({
      raid_points: acc.raid_points + (p.raid_points || 0),
      tackle_points: acc.tackle_points + (p.tackle_points || 0),
    }),
    {
      raid_points: 0,
      tackle_points: 0,
    },
  )

  return (
    <section className="st-detail-panel st-kabaddi-innings">
      <header className="st-innings-head">
        <div>
          <span className="st-eyebrow">SCORECARD</span>
          <h2>
            <i className={`st-house-dot ${houseClass}`} style={{ marginRight: 8, display: 'inline-block' }} />
            {teamName}
          </h2>
        </div>
        <div className="st-innings-total">
          {score} <small>pts</small>
        </div>
      </header>

      <div className="st-kabaddi-table-wrap">
        <table className="st-kabaddi-table">
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col" style={{ textAlign: 'right' }}>Raid Points</th>
              <th scope="col" style={{ textAlign: 'right' }}>Tackle Points</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={p.player || idx}>
                <th scope="row">
                  <div className="st-kabaddi-player-cell">
                    <span className="st-kabaddi-player-name">{formatPlayerName(p.name) || p.name || 'Player'}</span>
                  </div>
                </th>
                <td style={{ textAlign: 'right' }}>
                  <span className="st-kabaddi-pts">{p.raid_points ?? 0}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="st-kabaddi-pts">{p.tackle_points ?? 0}</span>
                </td>
              </tr>
            ))}
          </tbody>
          {players.length > 0 && (
            <tfoot>
              <tr>
                <th scope="row">Team Total</th>
                <td style={{ textAlign: 'right' }}>
                  <span className="st-kabaddi-pts" style={{ color: 'var(--st-brand)' }}>{totals.raid_points}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="st-kabaddi-pts" style={{ color: 'var(--st-brand)' }}>{totals.tackle_points}</span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        {!players.length && (
          <p className="st-table-empty">No player statistics recorded for this match.</p>
        )}
      </div>
    </section>
  )
}

function buildLiveKabaddiScorecard(fixture, state, playersMap) {
  const buildTeam = (teamKey) => {
    const lineup = fixture[`${teamKey}_lineup`] || {}
    const starters = lineup.starters ?? []
    const bench = lineup.bench ?? []
    const seen = new Set()
    const list = []

    const addPlayer = (playerObjOrId, isStarter) => {
      const id = typeof playerObjOrId === 'object' && playerObjOrId?._id ? String(playerObjOrId._id) : String(playerObjOrId)
      if (!id || seen.has(id)) return
      seen.add(id)
      const st = state?.players?.[id] || {}
      const p = playersMap.get(id) || (typeof playerObjOrId === 'object' ? playerObjOrId : null)
      const name = p?.name || 'Player'

      list.push({
        player: id,
        name,
        is_starter: isStarter,
        raids: st.raids || 0,
        successful_raids: st.successful_raids || 0,
        touch_points: Math.max(0, (st.raid_points || 0) - (st.bonus_points || 0)),
        bonus_points: st.bonus_points || 0,
        raid_points: st.raid_points || 0,
        super_raids: st.super_raids || 0,
        tackles: st.tackles || 0,
        tackle_points: st.tackle_points || 0,
        super_tackles: st.super_tackles || 0,
        total_points: (st.raid_points || 0) + (st.tackle_points || 0),
      })
    }

    starters.forEach((p) => addPlayer(p, true))
    bench.forEach((p) => addPlayer(p, false))
    return list
  }

  return {
    team1: buildTeam('team1'),
    team2: buildTeam('team2'),
  }
}

function KabaddiScorecard({ data }) {
  const { fixture, tournament, detail } = data
  const team1Name = houseName(tournament, fixture.team1)
  const team2Name = houseName(tournament, fixture.team2)
  const scorecard =
    fixture.scorecard && fixture.scorecard.team1?.length
      ? fixture.scorecard
      : buildLiveKabaddiScorecard(fixture, detail?.state, kabaddiLineupPlayers(fixture))

  return (
    <div className="st-detail-stack">
      <KabaddiScorecardTable
        teamName={team1Name}
        houseClass={`st-house-${(team1Name ?? '').toLowerCase().split(' ')[0]}`}
        score={fixture.team1_score}
        players={scorecard?.team1 ?? []}
      />

      <KabaddiScorecardTable
        teamName={team2Name}
        houseClass={`st-house-${(team2Name ?? '').toLowerCase().split(' ')[0]}`}
        score={fixture.team2_score}
        players={scorecard?.team2 ?? []}
      />
    </div>
  )
}

function KabaddiMatchInfo({ data }) {
  const { fixture: f, tournament } = data
  const team1Name = houseName(tournament, f.team1)
  const team2Name = houseName(tournament, f.team2)
  const scorecard = f.scorecard
  const fullStats = scorecard?.half_stats?.full_match ?? scorecard?.half_stats?.first_half ?? {
    team1: { total_points: Number(f.team1_score || 0), raid_points: 0, tackle_points: 0, all_out_points: 0, extra_points: 0 },
    team2: { total_points: Number(f.team2_score || 0), raid_points: 0, tackle_points: 0, all_out_points: 0, extra_points: 0 },
  }

  return (
    <div className="st-detail-stack">
      <KabaddiMatchComparison
        stats={fullStats}
        team1Name={team1Name}
        team2Name={team2Name}
        first={team1Name}
        second={team2Name}
      />

      <div className="st-detail-grid">
        <section className="st-detail-panel">
          <span className="st-eyebrow">MATCH STATUS</span>
          <h2>Match finished</h2>
          <p>{resultLine(f, tournament)}</p>
        </section>
        <section className="st-detail-panel">
          <span className="st-eyebrow">MATCH DETAILS</span>
          <div className="st-detail-row">
            <span>Sport</span>
            <strong>{sportName(f.sport)}</strong>
          </div>
          <div className="st-detail-row">
            <span>Scheduled</span>
            <strong>{formatDate(f.scheduled_at)}</strong>
          </div>
          {f.referees?.length > 0 && (
            <div className="st-detail-row">
              <span>Referees</span>
              <strong>{f.referees.map((ref) => ref.name).join(', ')}</strong>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function VolleyballSets({ data }) {
  const { fixture, tournament } = data
  const names = {
    team1: houseName(tournament, fixture.team1),
    team2: houseName(tournament, fixture.team2),
  }
  const config = volleyballConfigOf(fixture)

  return (
    <div className="st-detail-stack">
      <section className="st-detail-panel">
        <span className="st-eyebrow">SETS · Best of {MATCH_SETS} · {config.points_to_win} to win · {config.point_cap} cap</span>
        <div className="st-table-scroll">
          <table className="st-table">
            <thead>
              <tr>
                <th scope="col">Set</th>
                <th scope="col">{names.team1}</th>
                <th scope="col">{names.team2}</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((setNo) => {
                const set = (fixture.sets ?? []).find((s) => s.set_no === setNo)
                const isLive = set?.status === 'live'
                const isCompleted = set?.status === 'completed'
                const played = isLive || isCompleted

                return (
                  <tr key={setNo}>
                    <td><strong>Set {setNo}</strong></td>
                    <td>{played ? <strong className={set.winner === 'team1' ? 'won' : ''}>{set.team1_points}</strong> : '—'}</td>
                    <td>{played ? <strong className={set.winner === 'team2' ? 'won' : ''}>{set.team2_points}</strong> : '—'}</td>
                    <td>
                      {isLive ? (
                        <span className="st-live-text">● LIVE</span>
                      ) : isCompleted ? (
                        set.winner ? `${names[set.winner]} won` : 'Finished'
                      ) : (
                        <span style={{ color: 'var(--color-muted)' }}>Yet to be played</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Squads({ data }) {
  const { fixture: f, detail } = data
  return (
    <div className="st-detail-grid">
      {['team1', 'team2'].map((team) => {
        const players =
          f.sport === 'cricket'
            ? [
                ...(f[`${team}_players`] ?? []),
                ...(f[`${team}_substitutes`] ?? []),
              ]
            : f.sport === 'football'
              ? rosterState(f, team).all
              : f.sport === 'kabaddi' || f.sport === 'volleyball'
                ? [
                    ...(f[`${team}_lineup`]?.starters ?? []),
                    ...(f[`${team}_lineup`]?.bench ?? []),
                  ]
              : [
                  ...new Map(
                    (detail.matches ?? [])
                      .flatMap((match) => match[`${team}_players`] ?? [])
                      .map((player) => [idOf(player), player]),
                  ).values(),
                ]
        const onPitch =
          f.sport === 'football'
            ? new Set(rosterState(f, team).onPitch.map(idOf))
            : f.sport === 'kabaddi'
              ? new Set(detail.state?.sides?.[team]?.on_court ?? [])
            : null
        return (
          <section className="st-detail-panel" key={team}>
            <h2>{houseName(data.tournament, f[team])}</h2>
            {players.length ? (
              players.map((player) => (
                <div className="st-roster-row" key={idOf(player)}>
                  {f.sport !== 'volleyball' && <PlayerAvatar id={idOf(player)} />}
                  <strong>{formatPlayerName(player.name)}</strong>
                  {onPitch && (
                    <span>
                      {onPitch.has(idOf(player))
                        ? f.sport === 'kabaddi' ? 'On court' : 'On pitch'
                        : f.sport === 'kabaddi' ? 'Bench / out' : 'Bench / off pitch'}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p>Players to be announced.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

export function FixtureContent({ tab, data }) {
  const { fixture: f } = data
  if (tab === 'squads') return <Squads data={data} />
  if (f.sport === 'volleyball') return <VolleyballSets data={data} />
  if (tab === 'timeline') {
    if (f.sport === 'kabaddi') return <KabaddiTimeline data={data} />
    return <FootballTimeline data={data} />
  }
  if (tab === 'scorecard') {
    if (f.sport === 'cricket') return <CricketScorecard data={data} />
    if (f.sport === 'badminton') return <BadmintonMatches data={data} />
    if (f.sport === 'kabaddi') return <KabaddiScorecard data={data} />
    return <FootballTimeline data={data} />
  }
  if (f.status === 'live' || f.status === 'completed') {
    if (f.sport === 'cricket') return f.status === 'live' ? <CricketLive data={data} live={data.live} /> : <CricketScorecard data={data} />
    if (f.sport === 'badminton') return <BadmintonMatches data={data} />
    if (f.sport === 'kabaddi') return f.status === 'completed' ? <KabaddiMatchInfo data={data} /> : <KabaddiTimeline data={data} />
    return <FootballTimeline data={data} />
  }
  return (
    <div className="st-detail-grid">
      <section className="st-detail-panel">
        <span className="st-eyebrow">MATCH STATUS</span>
        <h2>
          {f.status === 'scheduled' ? 'Not started yet' : 'Match finished'}
        </h2>
        <p>{resultLine(f, data.tournament)}</p>
      </section>
      <section className="st-detail-panel">
        <span className="st-eyebrow">MATCH DETAILS</span>
        <div className="st-detail-row">
          <span>Sport</span>
          <strong>{sportName(f.sport)}</strong>
        </div>
        <div className="st-detail-row">
          <span>Scheduled</span>
          <strong>{formatDate(f.scheduled_at)}</strong>
        </div>
        {f.sport === 'cricket' && (
          <div className="st-detail-row">
            <span>Format</span>
            <strong>{f.overs ? `${f.overs} overs` : 'To be announced'}</strong>
          </div>
        )}
        {f.referees?.length > 0 && (
          <div className="st-detail-row">
            <span>Referees</span>
            <strong>{f.referees.map((ref) => ref.name).join(', ')}</strong>
          </div>
        )}
      </section>
    </div>
  )
}

export function PointsTable({ data, sport }) {
  const rows = data?.standings ?? []
  const base = [
    ['P', 'played', 'Played'],
    ['W', 'won', 'Won'],
  ]
  const columns =
    sport === 'cricket'
      ? [
          ...base,
          ['L', 'lost', 'Lost'],
          ['T', 'tied', 'Tied'],
          ['NR', 'no_result', 'No result'],
          ['NRR', 'nrr', 'Net run rate'],
        ]
      : sport === 'kabaddi'
        ? [
            ...base,
            ['D', 'drawn', 'Drawn'],
            ['L', 'lost', 'Lost'],
            ['PF', 'points_for', 'Points for'],
            ['PA', 'points_against', 'Points against'],
            ['PD', 'point_diff', 'Points difference'],
          ]
      : [
          ...base,
          ['D', 'drawn', 'Drawn'],
          ['L', 'lost', 'Lost'],
          ...(sport === 'football'
            ? [
                ['GF', 'goals_for', 'Goals for'],
                ['GA', 'goals_against', 'Goals against'],
                ['GD', 'goal_diff', 'Goal difference'],
              ]
            : [
                ['M', 'matches', 'Matches won–lost'],
                ['S', 'sets', 'Sets won–lost'],
                ['PD', 'point_diff', 'Points difference'],
              ]),
        ]
  const value = (row, key) =>
    key === 'nrr'
      ? Number(row.nrr ?? row.net_run_rate ?? 0).toFixed(3)
      : key === 'matches'
        ? `${row.matches_won ?? 0}–${row.matches_lost ?? 0}`
        : key === 'sets'
          ? `${row.sets_won ?? 0}–${row.sets_lost ?? 0}`
          : key === 'point_diff' || key === 'goal_diff'
            ? (() => {
                const diff = row[key] ?? ((row.points_scored ?? 0) - (row.points_conceded ?? 0))
                return diff > 0 ? `+${diff}` : diff
              })()
            : (row[key] ?? 0)
  if (!rows.length)
    return (
      <div className="st-message st-message-small">
        The table fills in as fixtures finish.
      </div>
    )
  return (
    <>
      {rows.every((row) => !row.played) && (
        <p className="st-table-legend">
          The table fills in as fixtures finish.
        </p>
      )}
      <div className="st-table-scroll">
        <table className="st-table st-standings-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">House</th>
              {columns.map(([label, key, title]) => (
                <th scope="col" title={title} key={key}>
                  {label}
                </th>
              ))}
              <th scope="col">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.house_id ?? row.house_name ?? index}>
                <td>{row.position ?? index + 1}</td>
                <th scope="row">{row.house_name ?? 'Removed house'}</th>
                {columns.map(([, key]) => (
                  <td key={key}>{value(row, key)}</td>
                ))}
                <td>
                  <strong>{row.points ?? 0}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="st-table-legend">
        {columns.map(([label, , title]) => `${label} ${title}`).join(' · ')} ·
        Pts Table points
      </p>
      {data?.table_points && (
        <p className="st-table-legend">
          {Object.entries(data.table_points)
            .map(([key, value]) => `${key.replaceAll('_', ' ')} ${value}`)
            .join(' · ')}
        </p>
      )}
    </>
  )
}
