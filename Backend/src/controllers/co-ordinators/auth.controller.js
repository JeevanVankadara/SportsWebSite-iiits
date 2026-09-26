import { signCoordinatorToken } from '../../middleware/auth.js';
import { Player } from '../../models/Player.js';
import { searchPlayers as findPlayers } from '../../services/player.service.js';
import { HttpError } from '../../utils/httpError.js';

// POST /api/coordinator/login — a co-ordinator signs in with their player username and password.
export async function login(req, res) {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
    throw new HttpError(400, 'Enter your username and password');
  }

  const player = await Player.findOne({ username: username.trim().toLowerCase() }).select('+password_hash');
  // Same message for an unknown username and a wrong password, so the form never reveals which usernames exist.
  if (!player || !(await player.verifyPassword(password))) {
    throw new HttpError(401, 'Incorrect username or password');
  }

  res.json({ token: signCoordinatorToken(player), player });
}

// GET /api/coordinator/me
export function getCurrentCoordinator(req, res) {
  res.json({ player: req.player });
}

// GET /api/coordinator/players?search=ali — to fill in the slips.
export async function searchPlayers(req, res) {
  res.json({ players: await findPlayers(req.query.search) });
}
