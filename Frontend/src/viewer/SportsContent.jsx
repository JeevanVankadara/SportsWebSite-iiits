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
  EVENT_LABELS as KABADDI_EVENT_LABELS,
  formatClock as formatKabaddiClock,
  lineupPlayers as kabaddiLineupPlayers,
  PERIOD_LABELS as KABADDI_PERIOD_LABELS,
  remainingSeconds as kabaddiRemainingSeconds,
  TEAMS as KABADDI_TEAMS,
} from '../sports/kabaddi/format.js'
import '../sports/kabaddi/kabaddi.css'
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
const playerName = (players, id) =>
  players.get(idOf(id))?.name ?? 'Player to be announced'

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
                    {didNotBat.map((player) => player.name).join(', ')}
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
                    .map((player) => player.name)
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
                ? `${event.player_in?.name ?? 'Player'} on · ${event.player_out?.name ?? 'Player'} off`
                : (event.player?.name ??
                  houseName(data.tournament, f[event.team]))}
            </p>
            {event.assist_player?.name && (
              <p>Assist: {event.assist_player.name}</p>
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

      {sides && (
        <section className="kb-court">
          {KABADDI_TEAMS.map((team) => {
            const side = sides[team] ?? { on_court: [], out: [], bench: [] }
            return (
              <div key={team} className="kb-panel">
                <h3 className="kb-title">{names[team]}</h3>
                <p className="kb-step">On court ({side.on_court.length})</p>
                {side.on_court.length === 0 ? (
                  <p className="kb-hint">Nobody on court</p>
                ) : (
                  <div className="kb-chips">
                    {side.on_court.map((id) => (
                      <span key={id} className="kb-chip kb-chip-static">
                        {players.get(id)?.name ?? 'Unknown'}
                      </span>
                    ))}
                  </div>
                )}

                <p className="kb-step">Out, next back first ({side.out.length})</p>
                {side.out.length === 0 ? (
                  <p className="kb-hint">Nobody out</p>
                ) : (
                  <div className="kb-chips">
                    {side.out.map((id, index) => (
                      <span key={id} className="kb-chip kb-chip-static">
                        <span className="kb-chip-order">{index + 1}</span>
                        {players.get(id)?.name ?? 'Unknown'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      <section className="kb-panel">
        <h3 className="kb-title">Events</h3>
        {rows.length === 0 ? (
          <p className="kb-hint">Nothing recorded yet.</p>
        ) : (
          <ol className="kb-log">
            {rows.map(({ event, entry, number }) => {
              const gained = ['team1', 'team2'].filter((team) => entry?.points?.[team])
              return (
                <li key={event._id || number} className="kb-log-row">
                  <span className="kb-log-no">{number}</span>
                  <span className={`kb-tag kb-tag-${event.type}`}>{KABADDI_EVENT_LABELS[event.type] ?? event.type}</span>
                  <span className="kb-log-text">
                    <strong>{names[event.team]}</strong> {describeKabaddiEvent(event, players)}
                    {entry?.super_raid && <span className="kb-tag kb-tag-good">Super raid</span>}
                    {entry?.super_tackle && <span className="kb-tag kb-tag-good">Super tackle</span>}
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
                  <strong>{player.name}</strong>
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
  if (tab === 'scorecard') {
    if (f.sport === 'cricket') return <CricketScorecard data={data} />
    if (f.sport === 'badminton') return <BadmintonMatches data={data} />
    if (f.sport === 'kabaddi') return <KabaddiTimeline data={data} />
    return <FootballTimeline data={data} />
  }
  if (f.status === 'live' || f.status === 'completed') {
    if (f.sport === 'cricket') return f.status === 'live' ? <CricketLive data={data} live={data.live} /> : <CricketScorecard data={data} />
    if (f.sport === 'badminton') return <BadmintonMatches data={data} />
    if (f.sport === 'kabaddi') return <KabaddiTimeline data={data} />
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
          : key === 'point_diff'
            ? (row.points_scored ?? 0) - (row.points_conceded ?? 0)
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
