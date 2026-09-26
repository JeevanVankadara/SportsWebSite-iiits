import { Game, PREDEFINED_GAMES } from '../models/Game.js';
import { caseInsensitive } from '../models/schemaOptions.js';

// Only the predefined sports are offered, even if older games are still in the database.
export async function listGames(req, res) {
  const games = await Game.find({ game_name: { $in: PREDEFINED_GAMES } }, 'game_name')
    .sort({ game_name: 1 })
    .collation(caseInsensitive);
  res.json({ games });
}
