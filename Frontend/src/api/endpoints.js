import { request } from './client.js'

const tournamentUrl = (id) => `/api/tournaments/${encodeURIComponent(id)}`

export const adminApi = {
  login: (username, password) => request('/api/admin/login', { method: 'POST', body: { username, password } }),
  me: () => request('/api/admin/me'),
}

export const tournamentsApi = {
  list: () => request('/api/tournaments'),
  get: (id) => request(tournamentUrl(id)),
  create: (data) => request('/api/tournaments', { method: 'POST', body: data }),
  update: (id, data) => request(tournamentUrl(id), { method: 'PATCH', body: data }),
  remove: (id) => request(tournamentUrl(id), { method: 'DELETE' }),
}

// The predefined sports (Cricket, Badminton) that can be picked for a tournament.
export const gamesApi = {
  list: () => request('/api/games'),
}
