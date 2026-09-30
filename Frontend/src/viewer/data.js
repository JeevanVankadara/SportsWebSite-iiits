import { viewerApi } from '../api/endpoints.js'
import {
  calculateCurrentSeconds,
  PERIOD_LABELS,
} from '../sports/football/format.js'

export const sports = ['cricket', 'football', 'badminton']
export const sportName = (sport) =>
  sport.charAt(0).toUpperCase() + sport.slice(1)
export const idOf = (item) => String(item?._id ?? item ?? '')
export const houseName = (tournament, id) =>
  tournament?.houses?.find((house) => idOf(house) === idOf(id))?.house_name ??
  'Removed house'
export const fixturePath = (item) =>
  `/t/${item.tournamentId}/${item.sport}/${item._id}`
export const sportPath = (tournamentId, sport) => `/t/${tournamentId}/${sport}`
export function firstSportPath(tournaments, sport) {
  const tournament = tournaments.find((row) =>
    row.games?.some((game) => game.game_name?.toLowerCase() === sport),
  )
  return tournament ? sportPath(tournament._id, sport) : '/tournaments'
}

export function score(item, team) {
  const f = item.fixture ?? item
  if (f.status === 'scheduled') return '—'
  if (item.sport === 'football') return String(f[`${team}_score`] ?? 0)
  if (item.sport === 'badminton') return String(f[`${team}_matches_won`] ?? 0)
  const inning = f.innings?.find(
    (row) => row.super_over === 0 && row.batting_team === team,
  )
  return inning
    ? `${inning.runs}/${inning.wickets} · ${Math.floor(inning.legal_balls / 6)}.${inning.legal_balls % 6} ov`
    : 'Yet to bat'
}

export function resultLine(item, tournament) {
  const f = item.fixture ?? item
  const first = houseName(tournament, f.team1)
  const second = houseName(tournament, f.team2)
  if (f.status === 'scheduled')
    return f.scheduled_at ? formatDate(f.scheduled_at) : 'Time to be announced'
  if (f.status === 'live') {
    if (item.sport === 'football')
      return `${PERIOD_LABELS[f.clock?.period] ?? 'Live'} · ${Math.floor(calculateCurrentSeconds(f.clock) / 60)}′`
    if (item.sport === 'badminton')
      return `${f.team1_matches_won}–${f.team2_matches_won} matches won`
    const innings = (f.innings ?? []).filter((row) => !row.super_over)
    if (innings.length > 1) {
      const chasing = innings.at(-1)
      return `Need ${Math.max(0, innings[0].runs + 1 - chasing.runs)} from ${Math.max(0, (f.overs ?? 0) * 6 - chasing.legal_balls)} balls`
    }
    return f.toss?.winner
      ? `${f.toss.winner === 'team1' ? first : second} chose to ${f.toss.decision}`
      : 'In progress'
  }
  if (f.result === 'draw' || f.result === 'tie')
    return f.result === 'tie' ? 'Match tied' : 'Match drawn'
  if (f.result === 'no_result') return 'No result'
  if (!f.result) return 'Result to be announced'
  const winner = f.result === 'team1' ? first : second
  if (f.result_type === 'abandoned') return `${winner} awarded the match`
  if (item.sport === 'cricket' && f.margin?.by)
    return f.margin.by === 'super_over'
      ? `${winner} won in the super over`
      : `${winner} won by ${f.margin.value} ${f.margin.by}`
  return `${winner} won`
}

export function formatDate(value) {
  if (!value) return 'Date to be announced'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export async function loadOverview() {
  const { tournaments } = await viewerApi.tournaments()
  const ordered = [...tournaments].sort(
    (a, b) => Number(b.status === 'live') - Number(a.status === 'live'),
  )
  const requests = ordered.flatMap((tournament) =>
    tournament.games
      .map((game) => game.game_name?.toLowerCase())
      .filter((sport) => sports.includes(sport))
      .map((sport) => ({ tournament, sport })),
  )
  const results = await Promise.allSettled(
    requests.map(({ tournament, sport }) =>
      viewerApi.fixtures(tournament._id, sport),
    ),
  )
  const fixtures = results.flatMap((result, index) =>
    result.status === 'fulfilled'
      ? (result.value.fixtures ?? []).map((fixture) => ({
          ...fixture,
          sport: requests[index].sport,
          tournamentId: requests[index].tournament._id,
        }))
      : [],
  )
  return {
    tournaments: ordered,
    fixtures,
    incomplete: results.some((result) => result.status === 'rejected'),
  }
}

export async function loadSport(tournamentId, sport) {
  const [{ tournament }, { fixtures }, tableResult] = await Promise.all([
    viewerApi.tournament(tournamentId),
    viewerApi.fixtures(tournamentId, sport),
    viewerApi.standings(tournamentId, sport).then(
      (table) => ({ table }),
      (error) => ({ error: error.message }),
    ),
  ])
  return {
    tournament,
    fixtures: fixtures.map((fixture) => ({ ...fixture, sport, tournamentId })),
    table: tableResult.table,
    tableError: tableResult.error,
  }
}

export async function loadFixture(tournamentId, sport, fixtureId) {
  const [{ tournament }, detail] = await Promise.all([
    viewerApi.tournament(tournamentId),
    viewerApi.fixture(fixtureId, sport),
  ])
  if (idOf(detail.fixture?.tournament) !== tournamentId)
    throw new Error('This fixture does not belong to this tournament.')
  return {
    tournament,
    detail,
    fixture: { ...detail.fixture, sport, tournamentId },
  }
}

const demoTournament = {
  _id: 'preview-inter-ug',
  tournament_name: 'Inter-UG Championship',
  status: 'live',
  start_date: '2026-09-12',
  end_date: '2026-09-30',
  houses: [
    { _id: 'blue', house_name: 'Blue House' },
    { _id: 'red', house_name: 'Red House' },
    { _id: 'green', house_name: 'Green House' },
    { _id: 'yellow', house_name: 'Yellow House' },
  ],
  games: sports.map((sport) => ({ _id: sport, game_name: sportName(sport) })),
}
const demoFixtures = [
  {
    _id: 'preview-cricket-live',
    sport: 'cricket',
    tournamentId: demoTournament._id,
    team1: 'blue',
    team2: 'red',
    status: 'live',
    scheduled_at: '2026-09-30T09:00:00+05:30',
    overs: 20,
    toss: { winner: 'team1', decision: 'bat' },
    innings: [
      {
        super_over: 0,
        batting_team: 'team1',
        runs: 124,
        wickets: 3,
        legal_balls: 86,
      },
    ],
  },
  {
    _id: 'preview-football-live',
    sport: 'football',
    tournamentId: demoTournament._id,
    team1: 'green',
    team2: 'yellow',
    status: 'live',
    scheduled_at: '2026-09-30T10:00:00+05:30',
    team1_score: 2,
    team2_score: 1,
    clock: { period: 'second_half', elapsed_seconds: 3780 },
  },
  {
    _id: 'preview-badminton-finished',
    sport: 'badminton',
    tournamentId: demoTournament._id,
    team1: 'blue',
    team2: 'green',
    status: 'completed',
    result: 'team1',
    scheduled_at: '2026-09-29T17:00:00+05:30',
    team1_matches_won: 3,
    team2_matches_won: 2,
  },
  {
    _id: 'preview-cricket-upcoming',
    sport: 'cricket',
    tournamentId: demoTournament._id,
    team1: 'yellow',
    team2: 'green',
    status: 'scheduled',
    scheduled_at: '2026-10-01T16:00:00+05:30',
    innings: [],
  },
  {
    _id: 'preview-football-upcoming',
    sport: 'football',
    tournamentId: demoTournament._id,
    team1: 'red',
    team2: 'blue',
    status: 'scheduled',
    scheduled_at: '2026-10-02T17:00:00+05:30',
    team1_score: 0,
    team2_score: 0,
  },
]
export const previewOverview = {
  tournaments: [demoTournament],
  fixtures: demoFixtures,
}
export function previewSport(sport) {
  return {
    tournament: demoTournament,
    fixtures: demoFixtures.filter((fixture) => fixture.sport === sport),
    table: {
      standings: demoTournament.houses.map((house, index) => ({
        house_name: house.house_name,
        played: 3,
        won: index === 0 ? 2 : 1,
        drawn: sport !== 'cricket' && index === 1 ? 1 : 0,
        tied: sport === 'cricket' && index === 1 ? 1 : 0,
        lost: index < 2 ? 1 : 2,
        points:
          index === 0
            ? sport === 'football'
              ? 6
              : 4
            : index === 1
              ? sport === 'football'
                ? 4
                : 3
              : sport === 'football'
                ? 3
                : 2,
        goals_for: [7, 5, 4, 3][index],
        goals_against: [3, 4, 5, 7][index],
        goal_diff: [4, 1, -1, -4][index],
        matches_won: [10, 8, 7, 5][index],
        matches_lost: [5, 7, 8, 10][index],
        sets_won: [23, 20, 18, 16][index],
        sets_lost: [16, 18, 20, 23][index],
        points_scored: [408, 378, 364, 338][index],
        points_conceded: [338, 364, 378, 408][index],
        net_run_rate: index === 0 ? 0.642 : -0.128,
      })),
    },
  }
}
export function previewFixture(sport, fixtureId) {
  const fixture = demoFixtures.find(
    (item) => item._id === fixtureId && item.sport === sport,
  )
  if (!fixture)
    throw new Error(
      'This fixture does not exist. Return to the sport fixtures to choose a match.',
    )
  const player = (id, name) => ({ _id: id, name })
  const aarav = player('preview-1', 'Aarav Rao')
  const kabir = player('preview-3', 'Kabir Das')
  const sana = player('preview-2', 'Sana Iyer')
  const meera = player('preview-4', 'Meera Joshi')
  const rohan = player('preview-5', 'Rohan Nair')
  let full = { ...fixture }
  let innings = []
  let matches = []
  if (sport === 'cricket' && fixture.status === 'live') {
    full = {
      ...full,
      team1_players: [
        aarav,
        rohan,
        player('preview-6', 'Dev Nair'),
        player('preview-7', 'Nikhil Shah'),
        player('preview-8', 'Arjun Sen'),
      ],
      team2_players: [kabir, player('preview-9', 'Aditya Verma')],
      team1_substitutes: [],
      team2_substitutes: [],
      powerplay_overs: 6,
    }
    innings = [
      {
        _id: 'preview-innings',
        innings_no: 1,
        super_over: 0,
        batting_team: 'team1',
        bowling_team: 'team2',
        overs: 20,
        runs: 124,
        wickets: 3,
        legal_balls: 86,
        status: 'live',
        striker: aarav._id,
        non_striker: rohan._id,
        bowler: kabir._id,
        this_over: ['1', '4'],
        this_over_no: 15,
        over_history: [{ number: 13, balls: ['1','4','0','0','6','0'] }, { number: 14, balls: ['0','1','4','0','1','0'] }, { number: 15, balls: ['1','4'] }],
        extras: { total: 8, wides: 5, no_balls: 1, byes: 1, leg_byes: 1 },
        fall_of_wickets: [{ wicket_no: 1, runs: 35, balls: 24, player: 'preview-6' }, { wicket_no: 2, runs: 59, balls: 42, player: 'preview-7' }, { wicket_no: 3, runs: 67, balls: 50, player: 'preview-8' }],
        batting: [
          {
            player: aarav._id,
            runs: 45,
            balls: 30,
            fours: 5,
            sixes: 2,
            status: 'batting',
          },
          {
            player: rohan._id,
            runs: 12,
            balls: 10,
            fours: 1,
            sixes: 0,
            status: 'batting',
          },
          ...[
            ['preview-6', 31, 22],
            ['preview-7', 20, 16],
            ['preview-8', 8, 8],
          ].map(([id, runs, balls]) => ({
            player: id,
            runs,
            balls,
            fours: 2,
            sixes: 0,
            status: 'out',
            dismissal: id === 'preview-8' ? { kind: 'run_out' } : { kind: 'bowled', bowler: kabir._id },
          })),
        ],
        bowling: [
          { player: kabir._id, balls: 20, runs: 21, wickets: 2, maidens: 0 },
        ],
      },
    ]
  }
  if (sport === 'football') {
    full = {
      ...full,
      team1_lineup: { starters: [sana], bench: [rohan] },
      team2_lineup: { starters: [meera], bench: [] },
      events:
        fixture.status === 'live'
          ? [
              {
                _id: 'goal-1',
                type: 'goal',
                minute: 52,
                team: 'team1',
                player: sana,
                goal_type: 'regular',
              },
              {
                _id: 'goal-2',
                type: 'goal',
                minute: 36,
                team: 'team2',
                player: meera,
                goal_type: 'regular',
              },
              {
                _id: 'goal-3',
                type: 'goal',
                minute: 18,
                team: 'team1',
                player: sana,
                goal_type: 'regular',
              },
            ]
          : [],
    }
  }
  if (sport === 'badminton') {
    matches = [
      {
        _id: 'preview-bm-1',
        match_no: 1,
        type: 'singles',
        sets_count: 3,
        points_to_win: 21,
        status: 'completed',
        winner: 'team1',
        team1_players: [aarav],
        team2_players: [sana],
        sets: [
          {
            _id: 'set-1',
            team1_points: 21,
            team2_points: 16,
            winner: 'team1',
            status: 'completed',
          },
          {
            _id: 'set-2',
            team1_points: 18,
            team2_points: 21,
            winner: 'team2',
            status: 'completed',
          },
          {
            _id: 'set-3',
            team1_points: 21,
            team2_points: 19,
            winner: 'team1',
            status: 'completed',
          },
        ],
      },
    ]
  }
  return {
    tournament: demoTournament,
    fixture: full,
    detail: { fixture: full, innings, matches },
  }
}

export async function loadPlayers(overview) {
  const details = await Promise.allSettled(
    overview.fixtures.map((item) => viewerApi.fixture(item._id, item.sport)),
  )
  if (details.length && details.every((result) => result.status === 'rejected'))
    throw new Error('Could not load the campus roster. Please try again.')
  const people = new Map()
  function tally(playerId, sport, key, value) {
    const player = people.get(idOf(playerId))
    if (!player) return
    player.stats[sport] ??= {}
    player.stats[sport][key] = (player.stats[sport][key] ?? 0) + (value ?? 0)
  }
  function add(player, item, team) {
    if (!player?.name || !player?._id) return
    const key = idOf(player)
    const current = people.get(key) ?? {
      _id: key,
      name: player.name,
      sports: [],
      houses: [],
      fixtures: [],
      status: 'Previous fixture',
      stats: {},
    }
    if (!current.sports.includes(item.sport)) current.sports.push(item.sport)
    const tournament = overview.tournaments.find(
      (row) => idOf(row) === item.tournamentId,
    )
    const house = houseName(tournament, item[team])
    if (!current.houses.includes(house)) current.houses.push(house)
    if (!current.fixtures.some((row) => row._id === item._id))
      current.fixtures.push(item)
    if (item.status === 'live') current.status = 'In live squad'
    else if (item.status === 'scheduled' && current.status !== 'In live squad')
      current.status = 'Up next'
    people.set(key, current)
  }
  details.forEach((result, index) => {
    if (result.status !== 'fulfilled') return
    const item = overview.fixtures[index]
    const detail = result.value
    const fixture = detail.fixture
    if (item.sport === 'cricket') {
      for (const team of ['team1', 'team2']) {
        for (const player of [
          ...(fixture[`${team}_players`] ?? []),
          ...(fixture[`${team}_substitutes`] ?? []),
        ])
          add(player, item, team)
      }
      for (const inning of detail.innings ?? []) {
        if (inning.super_over > 0) continue
        for (const row of inning.batting ?? []) {
          for (const key of ['runs', 'balls', 'fours', 'sixes'])
            tally(row.player, 'cricket', key, row[key])
        }
        for (const row of inning.bowling ?? []) {
          tally(row.player, 'cricket', 'wickets', row.wickets)
          tally(row.player, 'cricket', 'bowlingBalls', row.balls)
          tally(row.player, 'cricket', 'conceded', row.runs)
        }
      }
    } else if (item.sport === 'football') {
      for (const team of ['team1', 'team2']) {
        for (const player of [
          ...(fixture[`${team}_lineup`]?.starters ?? []),
          ...(fixture[`${team}_lineup`]?.bench ?? []),
        ])
          add(player, item, team)
      }
      for (const event of fixture.events ?? []) {
        if (event.type === 'goal' && event.goal_type !== 'own_goal') {
          tally(event.player, 'football', 'goals', 1)
          tally(event.assist_player, 'football', 'assists', 1)
        }
        if (event.type === 'yellow_card')
          tally(event.player, 'football', 'yellowCards', 1)
        if (event.type === 'red_card')
          tally(event.player, 'football', 'redCards', 1)
      }
    } else {
      for (const match of detail.matches ?? []) {
        for (const team of ['team1', 'team2'])
          for (const player of match[`${team}_players`] ?? [])
            add(player, item, team)
        for (const team of ['team1', 'team2']) {
          for (const player of match[`${team}_players`] ?? []) {
            if (match.status === 'live' || match.status === 'completed')
              tally(player, 'badminton', 'matches', 1)
            if (match.status === 'completed' && match.winner === team)
              tally(player, 'badminton', 'wins', 1)
            for (const set of match.sets ?? []) {
              if (set.winner === team) tally(player, 'badminton', 'setsWon', 1)
              tally(player, 'badminton', 'points', set[`${team}_points`])
            }
          }
        }
      }
    }
  })
  return {
    players: [...people.values()].sort((a, b) => a.name.localeCompare(b.name)),
    incomplete:
      details.some((result) => result.status === 'rejected') ||
      Boolean(overview.incomplete),
  }
}

export const previewPlayers = [
  {
    _id: 'preview-1',
    name: 'Aarav Rao',
    houses: ['Blue House'],
    sports: ['cricket', 'badminton'],
    status: 'In live squad',
    fixtures: [demoFixtures[0], demoFixtures[2]],
    stats: {
      cricket: { runs: 45, balls: 30, fours: 5, sixes: 2, wickets: 0 },
      badminton: { matches: 1, wins: 1, setsWon: 2, points: 60 },
    },
  },
  {
    _id: 'preview-2',
    name: 'Sana Iyer',
    houses: ['Green House'],
    sports: ['football', 'badminton'],
    status: 'In live squad',
    fixtures: [demoFixtures[1], demoFixtures[2]],
    stats: {
      football: { goals: 2, assists: 0, yellowCards: 0, redCards: 0 },
      badminton: { matches: 1, wins: 0, setsWon: 1, points: 56 },
    },
  },
  {
    _id: 'preview-3',
    name: 'Kabir Das',
    houses: ['Red House'],
    sports: ['cricket', 'football'],
    status: 'In live squad',
    fixtures: [demoFixtures[0], demoFixtures[4]],
    stats: { cricket: { wickets: 2, bowlingBalls: 20, conceded: 21 } },
  },
  {
    _id: 'preview-4',
    name: 'Meera Joshi',
    houses: ['Yellow House'],
    sports: ['football', 'cricket'],
    status: 'In live squad',
    fixtures: [demoFixtures[1], demoFixtures[3]],
    stats: { football: { goals: 1, assists: 0, yellowCards: 0, redCards: 0 } },
  },
]
