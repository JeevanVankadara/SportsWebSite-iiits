import { signCoordinatorToken } from '../../middleware/auth.js';
import { Player } from '../../models/Player.js';
import { verifyCollegeAccount } from '../../services/googleAuth.service.js';
import { searchPlayers as findPlayers } from '../../services/player.service.js';
import { HttpError } from '../../utils/httpError.js';

// POST /api/coordinator/google — body: { credential }. A co-ordinator signs in with the college
// Google account they registered with. Guest players (added for one match only) can never sign in.
export async function googleLogin(req, res) {
  const { googleId, email } = await verifyCollegeAccount(req.body?.credential);
  const player = await Player.findOne({ $or: [{ google_id: googleId }, { email }], is_guest: { $ne: true } });
  if (!player) {
    throw new HttpError(404, 'No player account for this Google account. Register first.');
  }
  // Accounts made before Google sign-in (same college email) are linked on their first sign-in.
  if (!player.google_id) {
    player.google_id = googleId;
    await player.save();
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
