import { Player } from '../../models/Player.js';
import { KabaddiFixture } from '../../models/sports/kabaddi/KabaddiFixture.js';
import { idOf, replayMatch } from './rules.js';

// Did the player take the court for that house: a starter, or a substitute who came on.
function tookPart(fixture, team, id) {
  const lineup = fixture[`${team}_lineup`];
  if (lineup?.starters?.some((p) => idOf(p) === id)) return true;
  return (
    lineup?.bench?.some((p) => idOf(p) === id) &&
    (fixture.events || []).some(
      (event) => event.type === 'substitution' && event.team === team && idOf(event.player_in) === id,
    )
  );
}

/**
 * Refreshes player.sports.kabaddi = { played, won, raid_points, tackle_points, points }
 * Recomputed from completed fixtures so corrections never cause numbers to drift.
 */
export async function refreshPlayerStats(playerIds = []) {
  const ids = [...new Set(playerIds.map(idOf))].filter(Boolean);
  if (ids.length === 0) return;

  await Promise.all(
    ids.map(async (id) => {
      const fixtures = await KabaddiFixture.find({
        status: 'completed',
        $or: [
          { 'team1_lineup.starters': id },
          { 'team1_lineup.bench': id },
          { 'team2_lineup.starters': id },
          { 'team2_lineup.bench': id },
        ],
      }).select('config first_raid clock team1_lineup team2_lineup result events');

      let played = 0;
      let won = 0;
      let raidPoints = 0;
      let tacklePoints = 0;

      for (const fixture of fixtures) {
        const team = ['team1', 'team2'].find((side) => tookPart(fixture, side, id));
        if (!team) continue;
        played += 1;
        if (fixture.result === team) won += 1;
        const line = replayMatch(fixture).players[id];
        raidPoints += line?.raid_points ?? 0;
        tacklePoints += line?.tackle_points ?? 0;
      }

      await Player.updateOne(
        { _id: id },
        {
          $set: {
            'sports.kabaddi.played': played,
            'sports.kabaddi.won': won,
            'sports.kabaddi.raid_points': raidPoints,
            'sports.kabaddi.tackle_points': tacklePoints,
            'sports.kabaddi.points': raidPoints + tacklePoints,
          },
        },
      );
    }),
  );
}
