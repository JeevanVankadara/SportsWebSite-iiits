import { searchPlayers as findPlayers } from '../../services/player.service.js';

// GET /api/players?search=ali — used to pick referees for a fixture.
export async function searchPlayers(req, res) {
  res.json({ players: await findPlayers(req.query.search) });
}
