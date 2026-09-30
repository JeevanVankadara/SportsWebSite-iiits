import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'

// Exercise the public API contracts without a database or a signed-in session.
const server = await createServer({
  server: { middlewareMode: true },
  logLevel: 'silent',
})
const originalFetch = globalThis.fetch
try {
  const {
    loadPlayers,
    loadFixture,
    loadSport,
    score,
    resultLine,
    previewFixture,
    previewOverview,
  } = await server.ssrLoadModule('/src/viewer/data.js')
  const { publicRequest, adminSession } =
    await server.ssrLoadModule('/src/api/client.js')
  const tournament = {
    _id: 't1',
    tournament_name: 'Campus Cup',
    houses: [
      { _id: 'blue', house_name: 'Blue House' },
      { _id: 'red', house_name: 'Red House' },
    ],
  }
  const player = {
    _id: 'p1',
    name: 'Campus Player',
    username: 'private',
    roll_number: 'private',
    email: 'private',
  }
  const overview = {
    tournaments: [tournament],
    fixtures: [
      {
        _id: 'c1',
        sport: 'cricket',
        tournamentId: 't1',
        team1: 'blue',
        team2: 'red',
        status: 'live',
      },
      {
        _id: 'f1',
        sport: 'football',
        tournamentId: 't1',
        team1: 'blue',
        team2: 'red',
        status: 'completed',
      },
      {
        _id: 'b1',
        sport: 'badminton',
        tournamentId: 't1',
        team1: 'blue',
        team2: 'red',
        status: 'scheduled',
      },
    ],
  }
  const payloads = {
    '/api/cricket/fixtures/c1': {
      fixture: { tournament: 't1', team1_players: [player] },
      innings: [
        {
          super_over: 0,
          batting: [{ player: 'p1', runs: 45, balls: 30, fours: 5, sixes: 2 }],
          bowling: [],
        },
        {
          super_over: 1,
          batting: [{ player: 'p1', runs: 12, balls: 3 }],
          bowling: [],
        },
      ],
    },
    '/api/football/fixtures/f1': {
      fixture: {
        team1_lineup: { starters: [player] },
        events: [
          { type: 'goal', goal_type: 'regular', player },
          { type: 'goal', goal_type: 'own_goal', player },
          { type: 'yellow_card', player },
        ],
      },
    },
    '/api/badminton/fixtures/b1': {
      fixture: {},
      matches: [
        { status: 'pending', team1_players: [player], sets: [] },
        { status: 'not_played', team1_players: [player], sets: [] },
        {
          status: 'completed',
          winner: 'team1',
          team1_players: [player],
          sets: [{ winner: 'team1', team1_points: 21 }],
        },
      ],
    },
    '/api/tournaments/t1': { tournament },
    '/api/cricket/tournaments/t1/fixtures': { fixtures: [] },
  }
  globalThis.fetch = async (url) =>
    payloads[url]
      ? Response.json(payloads[url])
      : Response.json({ message: 'Unavailable' }, { status: 503 })

  await test('public player index exposes names and participation, with correct sporting totals', async () => {
    const { players, incomplete } = await loadPlayers(overview)
      assert.equal(incomplete, false)
    assert.equal(players.length, 1)
    assert.equal(players[0].status, 'In live squad')
    assert.equal(
      players[0].stats.cricket.runs,
      45,
      'super-over runs excluded from regular batting totals',
    )
    assert.equal(
      players[0].stats.football.goals,
      1,
      'own goals excluded from scorer totals',
    )
    assert.equal(players[0].stats.football.yellowCards, 1)
    assert.equal(
      players[0].stats.badminton.matches,
      1,
      'pending and unplayed matches excluded',
    )
    assert.equal(players[0].stats.badminton.wins, 1)
    assert.equal(players[0].stats.badminton.points, 21)
    assert.deepEqual(players[0].sports, ['cricket', 'football', 'badminton'])
    for (const key of ['email', 'username', 'roll_number'])
      assert.equal(key in players[0], false)
  })
  await test('partial scorecard failures retain available players and report incomplete data', async () => {
    const partial = await loadPlayers({
      ...overview,
      fixtures: [...overview.fixtures, { _id: 'missing', sport: 'cricket' }],
    })
    assert.equal(partial.players.length, 1)
    assert.equal(partial.incomplete, true)
    await assert.rejects(
      loadPlayers({
        ...overview,
        fixtures: [{ _id: 'missing', sport: 'cricket' }],
      }),
      /campus roster/,
    )
  })
  await test('standings failure does not hide available sport fixtures', async () => {
    const data = await loadSport('t1', 'cricket')
    assert.deepEqual(data.fixtures, [])
    assert.equal(data.tableError, 'Unavailable')
  })
  await test('a fixture cannot appear under another tournament', async () => {
    payloads['/api/tournaments/t2'] = {
      tournament: { ...tournament, _id: 't2' },
    }
    await assert.rejects(loadFixture('t2', 'cricket', 'c1'), /does not belong/)
  })
  await test('scheduled fixtures and super-over results remain accurate', () => {
    assert.equal(
      score(
        { sport: 'football', status: 'scheduled', team1_score: 0 },
        'team1',
      ),
      '—',
    )
    assert.equal(
      resultLine(
        {
          sport: 'cricket',
          status: 'completed',
          team1: 'blue',
          team2: 'red',
          result: 'team1',
          margin: { by: 'super_over' },
        },
        tournament,
      ),
      'Blue House won in the super over',
    )
    assert.throws(() => previewFixture('cricket', 'missing'), /does not exist/)
    assert.equal(previewOverview.fixtures.length, 5)
  })
  await test('viewer reads never send the admin token', async () => {
    adminSession.setToken('test-token')
    let sentOptions
    globalThis.fetch = async (_url, options) => {
      sentOptions = options
      return Response.json({ tournaments: [] })
    }
    await publicRequest('/api/tournaments')
    assert.equal(sentOptions.headers?.Authorization, undefined)
    assert.ok(sentOptions.signal instanceof AbortSignal)
    adminSession.setToken(null)
  })
} finally {
  globalThis.fetch = originalFetch
  await server.close()
}
