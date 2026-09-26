import { Player } from '../../models/Player.js';
import { BadmintonMatch } from '../../models/sports/badminton/BadmintonMatch.js';

// Refreshes player.sports.badminton = { played, won } for the given players.
// Counting from the matches (instead of adding 1) keeps the numbers right after a result is corrected.
export async function refreshPlayerStats(playerIds) {
  const ids = [...new Set(playerIds.map(String))];

  await Promise.all(
    ids.map(async (id) => {
      const [played, won] = await Promise.all([
        BadmintonMatch.countDocuments({ status: 'completed', $or: [{ team1_players: id }, { team2_players: id }] }),
        BadmintonMatch.countDocuments({
          status: 'completed',
          $or: [
            { team1_players: id, winner: 'team1' },
            { team2_players: id, winner: 'team2' },
          ],
        }),
      ]);
      await Player.updateOne({ _id: id }, { $set: { 'sports.badminton.played': played, 'sports.badminton.won': won } });
    }),
  );
}
