import { adminSession, coordinatorSession, publicRequest, signUpSession } from './client.js'

const id = (value) => encodeURIComponent(value)

// Admin area and public reads.
const request = adminSession.request
const publicPost = (path, body) => signUpSession.request(path, { method: 'POST', body })

// Sign-in helpers for AuthProvider: login -> { token, user }, me -> user.
export const adminAuth = {
  login: (username, password) =>
    request('/api/admin/login', { method: 'POST', body: { username, password } }).then(({ token, admin }) => ({
      token,
      user: admin,
    })),
  me: () => request('/api/admin/me').then(({ admin }) => admin),
}

// Super admin only: the other admins and the sports each one manages.
export const adminsApi = {
  list: () => request('/api/admin/admins'),
  // body: { username, password, sports: ['cricket', ...] }
  create: (data) => request('/api/admin/admins', { method: 'POST', body: data }),
  // body: { sports?, password? }
  update: (adminId, data) => request(`/api/admin/admins/${id(adminId)}`, { method: 'PATCH', body: data }),
  remove: (adminId) => request(`/api/admin/admins/${id(adminId)}`, { method: 'DELETE' }),
}

export const tournamentsApi = {
  list: () => request('/api/tournaments'),
  get: (tournamentId) => request(`/api/tournaments/${id(tournamentId)}`),
  create: (data) => request('/api/tournaments', { method: 'POST', body: data }),
  update: (tournamentId, data) => request(`/api/tournaments/${id(tournamentId)}`, { method: 'PATCH', body: data }),
  remove: (tournamentId) => request(`/api/tournaments/${id(tournamentId)}`, { method: 'DELETE' }),
  // body: { game, winner, runner_up } — house ids, or null for both to clear the sport's winners.
  setWinners: (tournamentId, data) =>
    request(`/api/tournaments/${id(tournamentId)}/winners`, { method: 'PUT', body: data }),
}

// Super admin only: friendly matches, outside every tournament. Each answers like a tournament
// (tournament.is_friendly) with one sport; its match is changed through that sport's api below.
export const friendliesApi = {
  // { friendlies: [{ tournament, sport: 'cricket', fixture }] }
  list: () => request('/api/friendlies'),
  // body: { game, team1_name, team2_name, scheduled_at, referees: [playerId] }. Answers { fixture, ... }.
  create: (data) => request('/api/friendlies', { method: 'POST', body: data }),
}

// The predefined sports (Cricket, Badminton) that can be picked for a tournament.
export const gamesApi = {
  list: () => request('/api/games'),
}

export const playersApi = {
  // credential: the ID token from Google's button. Answers { registered, player, profile: { name, email } }.
  checkGoogle: (credential) => publicPost('/api/players/google', { credential }),
  // body: { credential, roll_number }. Answers { player }.
  register: (data) => publicPost('/api/players/register', data),
  // Admin only: find players by username, name or roll number.
  search: (text) => request(`/api/players?search=${encodeURIComponent(text)}`),
}

export const badmintonApi = {
  fixtures: (tournamentId) => request(`/api/badminton/tournaments/${id(tournamentId)}/fixtures`),
  standings: (tournamentId) => request(`/api/badminton/tournaments/${id(tournamentId)}/standings`),
  fixture: (fixtureId) => request(`/api/badminton/fixtures/${id(fixtureId)}`),
  createFixture: (tournamentId, data) =>
    request(`/api/badminton/tournaments/${id(tournamentId)}/fixtures`, { method: 'POST', body: data }),
  updateFixture: (fixtureId, data) => request(`/api/badminton/fixtures/${id(fixtureId)}`, { method: 'PATCH', body: data }),
  deleteFixture: (fixtureId) => request(`/api/badminton/fixtures/${id(fixtureId)}`, { method: 'DELETE' }),
  setDecision: (fixtureId, data) =>
    request(`/api/badminton/fixtures/${id(fixtureId)}/decision`, { method: 'PUT', body: data }),
  saveResult: (matchId, data) => request(`/api/badminton/matches/${id(matchId)}/result`, { method: 'PUT', body: data }),
  clearResult: (matchId) => request(`/api/badminton/matches/${id(matchId)}/result`, { method: 'DELETE' }),
}

export const footballApi = {
  fixtures: (tournamentId) => request(`/api/football/tournaments/${id(tournamentId)}/fixtures`),
  standings: (tournamentId) => request(`/api/football/tournaments/${id(tournamentId)}/standings`),
  fixture: (fixtureId) => request(`/api/football/fixtures/${id(fixtureId)}`),
  createFixture: (tournamentId, data) =>
    request(`/api/football/tournaments/${id(tournamentId)}/fixtures`, { method: 'POST', body: data }),
  updateFixture: (fixtureId, data) => request(`/api/football/fixtures/${id(fixtureId)}`, { method: 'PATCH', body: data }),
  deleteFixture: (fixtureId) => request(`/api/football/fixtures/${id(fixtureId)}`, { method: 'DELETE' }),
  setDecision: (fixtureId, data) =>
    request(`/api/football/fixtures/${id(fixtureId)}/decision`, { method: 'PUT', body: data }),
}

export const cricketApi = {
  fixtures: (tournamentId) => request(`/api/cricket/tournaments/${id(tournamentId)}/fixtures`),
  standings: (tournamentId) => request(`/api/cricket/tournaments/${id(tournamentId)}/standings`),
  fixture: (fixtureId) => request(`/api/cricket/fixtures/${id(fixtureId)}`),
  createFixture: (tournamentId, data) =>
    request(`/api/cricket/tournaments/${id(tournamentId)}/fixtures`, { method: 'POST', body: data }),
  updateFixture: (fixtureId, data) => request(`/api/cricket/fixtures/${id(fixtureId)}`, { method: 'PATCH', body: data }),
  deleteFixture: (fixtureId) => request(`/api/cricket/fixtures/${id(fixtureId)}`, { method: 'DELETE' }),
  setDecision: (fixtureId, data) => request(`/api/cricket/fixtures/${id(fixtureId)}/decision`, { method: 'PUT', body: data }),
}

// Public reads answer with { fixture, state, tournament }. Like every other sport, the admin only
// manages the fixture and the final decision; the referee runs the match from the co-ordinator area.
const kabaddiPath = (path) => `/api/kabaddi/${path}`

export const kabaddiApi = {
  fixtures: (tournamentId) => request(kabaddiPath(`tournaments/${id(tournamentId)}/fixtures`)),
  standings: (tournamentId) => request(kabaddiPath(`tournaments/${id(tournamentId)}/standings`)),
  fixture: (fixtureId) => request(kabaddiPath(`fixtures/${id(fixtureId)}`)),
  createFixture: (tournamentId, data) =>
    request(kabaddiPath(`tournaments/${id(tournamentId)}/fixtures`), { method: 'POST', body: data }),
  updateFixture: (fixtureId, data) => request(kabaddiPath(`fixtures/${id(fixtureId)}`), { method: 'PATCH', body: data }),
  deleteFixture: (fixtureId) => request(kabaddiPath(`fixtures/${id(fixtureId)}`), { method: 'DELETE' }),
  setDecision: (fixtureId, data) => request(kabaddiPath(`fixtures/${id(fixtureId)}/decision`), { method: 'PUT', body: data }),
}

// Public reads answer with { fixture, state, tournament }. Like every other sport, the admin only
// manages the fixture and the final decision; the referee runs the match from the co-ordinator area.
const volleyballPath = (path) => `/api/volleyball/${path}`

export const volleyballApi = {
  fixtures: (tournamentId) => request(volleyballPath(`tournaments/${id(tournamentId)}/fixtures`)),
  standings: (tournamentId) => request(volleyballPath(`tournaments/${id(tournamentId)}/standings`)),
  fixture: (fixtureId) => request(volleyballPath(`fixtures/${id(fixtureId)}`)),
  createFixture: (tournamentId, data) =>
    request(volleyballPath(`tournaments/${id(tournamentId)}/fixtures`), { method: 'POST', body: data }),
  updateFixture: (fixtureId, data) => request(volleyballPath(`fixtures/${id(fixtureId)}`), { method: 'PATCH', body: data }),
  deleteFixture: (fixtureId) => request(volleyballPath(`fixtures/${id(fixtureId)}`), { method: 'DELETE' }),
  setDecision: (fixtureId, data) => request(volleyballPath(`fixtures/${id(fixtureId)}/decision`), { method: 'PUT', body: data }),
}

// Co-ordinator area.
const coordinatorRequest = coordinatorSession.request

export const coordinatorAuth = {
  // credential: the ID token from Google's button.
  login: (credential) =>
    coordinatorRequest('/api/coordinator/google', { method: 'POST', body: { credential } }).then(
      ({ token, player }) => ({ token, user: player }),
    ),
  me: () => coordinatorRequest('/api/coordinator/me').then(({ player }) => player),
}

export const coordinatorPlayersApi = {
  search: (text) => coordinatorRequest(`/api/coordinator/players?search=${encodeURIComponent(text)}`),
  // Adds someone without an account, for this match only. Answers { player }.
  addGuest: (sport, fixtureId, name) =>
    coordinatorRequest(`/api/coordinator/${sport}/fixtures/${id(fixtureId)}/guests`, { method: 'POST', body: { name } }),
}

// Every action answers with the whole fixture: { fixture, matches, tournament }.
export const coordinatorBadmintonApi = {
  fixtures: () => coordinatorRequest('/api/coordinator/badminton/fixtures'),
  fixture: (fixtureId) => coordinatorRequest(`/api/coordinator/badminton/fixtures/${id(fixtureId)}`),
  saveOrder: (fixtureId, plan) =>
    coordinatorRequest(`/api/coordinator/badminton/fixtures/${id(fixtureId)}/order`, { method: 'PUT', body: { plan } }),
  saveSlip: (fixtureId, team, data) =>
    coordinatorRequest(`/api/coordinator/badminton/fixtures/${id(fixtureId)}/slips/${team}`, { method: 'PUT', body: data }),
  decideFixture: (fixtureId, data) =>
    coordinatorRequest(`/api/coordinator/badminton/fixtures/${id(fixtureId)}/decision`, { method: 'PUT', body: data }),
  startMatch: (matchId) =>
    coordinatorRequest(`/api/coordinator/badminton/matches/${id(matchId)}/start`, { method: 'POST' }),
  score: (matchId, data) =>
    coordinatorRequest(`/api/coordinator/badminton/matches/${id(matchId)}/score`, { method: 'POST', body: data }),
  nextSet: (matchId) =>
    coordinatorRequest(`/api/coordinator/badminton/matches/${id(matchId)}/next-set`, { method: 'POST' }),
  finishMatch: (matchId) =>
    coordinatorRequest(`/api/coordinator/badminton/matches/${id(matchId)}/finish`, { method: 'POST' }),
  abandonMatch: (matchId, data) =>
    coordinatorRequest(`/api/coordinator/badminton/matches/${id(matchId)}/abandon`, { method: 'POST', body: data }),
  editSet: (setId, data) =>
    coordinatorRequest(`/api/coordinator/badminton/sets/${id(setId)}`, { method: 'PUT', body: data }),
}

export const coordinatorFootballApi = {
  fixtures: () => coordinatorRequest('/api/coordinator/football/fixtures'),
  fixture: (fixtureId) => coordinatorRequest(`/api/coordinator/football/fixtures/${id(fixtureId)}`),
  saveConfig: (fixtureId, data) =>
    coordinatorRequest(`/api/coordinator/football/fixtures/${id(fixtureId)}/config`, { method: 'PUT', body: data }),
  saveSlip: (fixtureId, team, data) =>
    coordinatorRequest(`/api/coordinator/football/fixtures/${id(fixtureId)}/slips/${team}`, { method: 'PUT', body: data }),
  decideFixture: (fixtureId, data) =>
    coordinatorRequest(`/api/coordinator/football/fixtures/${id(fixtureId)}/decision`, { method: 'PUT', body: data }),
  clock: (fixtureId, data) =>
    coordinatorRequest(`/api/coordinator/football/fixtures/${id(fixtureId)}/clock`, { method: 'POST', body: data }),
  finishMatch: (fixtureId) =>
    coordinatorRequest(`/api/coordinator/football/fixtures/${id(fixtureId)}/finish`, { method: 'POST' }),
  addEvent: (fixtureId, data) =>
    coordinatorRequest(`/api/coordinator/football/fixtures/${id(fixtureId)}/events`, { method: 'POST', body: data }),
  updateEvent: (fixtureId, eventId, data) =>
    coordinatorRequest(`/api/coordinator/football/fixtures/${id(fixtureId)}/events/${id(eventId)}`, {
      method: 'PUT',
      body: data,
    }),
  deleteEvent: (fixtureId, eventId) =>
    coordinatorRequest(`/api/coordinator/football/fixtures/${id(fixtureId)}/events/${id(eventId)}`, {
      method: 'DELETE',
    }),
}

// Every action answers with the whole fixture: { fixture, innings, tournament }.
const cricketPath = (path) => `/api/coordinator/cricket/${path}`

export const coordinatorCricketApi = {
  fixtures: () => coordinatorRequest(cricketPath('fixtures')),
  fixture: (fixtureId) => coordinatorRequest(cricketPath(`fixtures/${id(fixtureId)}`)),
  saveSetup: (fixtureId, data) => coordinatorRequest(cricketPath(`fixtures/${id(fixtureId)}/setup`), { method: 'PUT', body: data }),
  saveToss: (fixtureId, data) => coordinatorRequest(cricketPath(`fixtures/${id(fixtureId)}/toss`), { method: 'PUT', body: data }),
  startInnings: (fixtureId, data) =>
    coordinatorRequest(cricketPath(`fixtures/${id(fixtureId)}/innings`), { method: 'POST', body: data }),
  acceptTie: (fixtureId) => coordinatorRequest(cricketPath(`fixtures/${id(fixtureId)}/accept-tie`), { method: 'POST' }),
  decideFixture: (fixtureId, data) =>
    coordinatorRequest(cricketPath(`fixtures/${id(fixtureId)}/decision`), { method: 'PUT', body: data }),
  ball: (inningsId, data) => coordinatorRequest(cricketPath(`innings/${id(inningsId)}/balls`), { method: 'POST', body: data }),
  undo: (inningsId, data) => coordinatorRequest(cricketPath(`innings/${id(inningsId)}/undo`), { method: 'POST', body: data }),
  setBatter: (inningsId, data) => coordinatorRequest(cricketPath(`innings/${id(inningsId)}/batter`), { method: 'PUT', body: data }),
  setBowler: (inningsId, data) => coordinatorRequest(cricketPath(`innings/${id(inningsId)}/bowler`), { method: 'PUT', body: data }),
  swapStrike: (inningsId) => coordinatorRequest(cricketPath(`innings/${id(inningsId)}/swap-strike`), { method: 'POST' }),
  endInnings: (inningsId) => coordinatorRequest(cricketPath(`innings/${id(inningsId)}/end`), { method: 'POST' }),
}

// Every action answers with the whole fixture: { fixture, state, tournament }.
const volleyballCoordinatorPath = (path) => `/api/coordinator/volleyball/${path}`

export const coordinatorVolleyballApi = {
  fixtures: () => coordinatorRequest(volleyballCoordinatorPath('fixtures')),
  fixture: (fixtureId) => coordinatorRequest(volleyballCoordinatorPath(`fixtures/${id(fixtureId)}`)),
  saveConfig: (fixtureId, data) =>
    coordinatorRequest(volleyballCoordinatorPath(`fixtures/${id(fixtureId)}/config`), { method: 'PUT', body: data }),
  saveSlip: (fixtureId, team, data) =>
    coordinatorRequest(volleyballCoordinatorPath(`fixtures/${id(fixtureId)}/slips/${team}`), { method: 'PUT', body: data }),
  decideFixture: (fixtureId, data) =>
    coordinatorRequest(volleyballCoordinatorPath(`fixtures/${id(fixtureId)}/decision`), { method: 'PUT', body: data }),
  startMatch: (fixtureId) =>
    coordinatorRequest(volleyballCoordinatorPath(`fixtures/${id(fixtureId)}/start`), { method: 'POST' }),
  score: (fixtureId, data) =>
    coordinatorRequest(volleyballCoordinatorPath(`fixtures/${id(fixtureId)}/score`), { method: 'POST', body: data }),
  nextSet: (fixtureId) =>
    coordinatorRequest(volleyballCoordinatorPath(`fixtures/${id(fixtureId)}/next-set`), { method: 'POST' }),
  finishMatch: (fixtureId) =>
    coordinatorRequest(volleyballCoordinatorPath(`fixtures/${id(fixtureId)}/finish`), { method: 'POST' }),
  substitute: (fixtureId, data) =>
    coordinatorRequest(volleyballCoordinatorPath(`fixtures/${id(fixtureId)}/substitution`), { method: 'POST', body: data }),
  undo: (fixtureId) => coordinatorRequest(volleyballCoordinatorPath(`fixtures/${id(fixtureId)}/undo`), { method: 'POST' }),
  editSet: (fixtureId, setId, data) =>
    coordinatorRequest(volleyballCoordinatorPath(`fixtures/${id(fixtureId)}/sets/${id(setId)}`), { method: 'PUT', body: data }),
}

export const viewerApi = {
  tournaments: () => publicRequest('/api/tournaments'),
  tournament: (tournamentId) =>
    publicRequest(`/api/tournaments/${id(tournamentId)}`),
  fixtures: (tournamentId, sport) =>
    publicRequest(`/api/${sport}/tournaments/${id(tournamentId)}/fixtures`),
  standings: (tournamentId, sport) =>
    publicRequest(`/api/${sport}/tournaments/${id(tournamentId)}/standings`),
  fixture: (fixtureId, sport) =>
    publicRequest(`/api/${sport}/fixtures/${id(fixtureId)}`),
  // Every live fixture of every sport, plus the current state of `known` (fixtures shown as live).
  liveFixtures: (known = []) =>
    publicRequest(`/api/live/fixtures${known.length ? `?known=${known.map(id).join(',')}` : ''}`),
}

const kabaddiCoordinatorPath = (path) => `/api/coordinator/kabaddi/${path}`

export const coordinatorKabaddiApi = {
  fixtures: () => coordinatorRequest(kabaddiCoordinatorPath('fixtures')),
  fixture: (fixtureId) => coordinatorRequest(kabaddiCoordinatorPath(`fixtures/${id(fixtureId)}`)),
  saveConfig: (fixtureId, data) =>
    coordinatorRequest(kabaddiCoordinatorPath(`fixtures/${id(fixtureId)}/config`), { method: 'PUT', body: data }),
  saveSlip: (fixtureId, team, data) =>
    coordinatorRequest(kabaddiCoordinatorPath(`fixtures/${id(fixtureId)}/slips/${team}`), { method: 'PUT', body: data }),
  firstRaid: (fixtureId, data) =>
    coordinatorRequest(kabaddiCoordinatorPath(`fixtures/${id(fixtureId)}/first-raid`), { method: 'PUT', body: data }),
  decideFixture: (fixtureId, data) =>
    coordinatorRequest(kabaddiCoordinatorPath(`fixtures/${id(fixtureId)}/decision`), { method: 'PUT', body: data }),
  clock: (fixtureId, data) =>
    coordinatorRequest(kabaddiCoordinatorPath(`fixtures/${id(fixtureId)}/clock`), { method: 'POST', body: data }),
  finish: (fixtureId) => coordinatorRequest(kabaddiCoordinatorPath(`fixtures/${id(fixtureId)}/finish`), { method: 'POST' }),
  addEvent: (fixtureId, data) =>
    coordinatorRequest(kabaddiCoordinatorPath(`fixtures/${id(fixtureId)}/events`), { method: 'POST', body: data }),
  undo: (fixtureId) => coordinatorRequest(kabaddiCoordinatorPath(`fixtures/${id(fixtureId)}/undo`), { method: 'POST' }),
}
