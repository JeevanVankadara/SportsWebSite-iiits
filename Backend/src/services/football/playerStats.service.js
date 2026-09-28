import { Player } from '../../models/Player.js';
import { FootballFixture } from '../../models/sports/football/FootballFixture.js';

/**
 * Refreshes player.sports.football = { played, won, goals, yellow_cards, red_cards }
 * Recomputed from completed fixtures so corrections never cause numbers to drift.
 */
export async function refreshPlayerStats(playerIds = []) {
  const ids = [...new Set(playerIds.map(String))].filter(Boolean);
  if (ids.length === 0) return;

  await Promise.all(
    ids.map(async (id) => {
      const fixtures = await FootballFixture.find({
        status: 'completed',
        $or: [
          { 'team1_lineup.starters': id },
          { 'team1_lineup.bench': id },
          { 'team2_lineup.starters': id },
          { 'team2_lineup.bench': id },
        ],
      }).select('team1_lineup team2_lineup result events');

      let played = fixtures.length;
      let won = 0;
      let goals = 0;
      let yellowCards = 0;
      let redCards = 0;

      for (const fixture of fixtures) {
        const inTeam1 =
          fixture.team1_lineup?.starters?.some((p) => String(p) === id) ||
          fixture.team1_lineup?.bench?.some((p) => String(p) === id);
        const inTeam2 =
          fixture.team2_lineup?.starters?.some((p) => String(p) === id) ||
          fixture.team2_lineup?.bench?.some((p) => String(p) === id);

        if ((inTeam1 && fixture.result === 'team1') || (inTeam2 && fixture.result === 'team2')) {
          won += 1;
        }

        for (const event of fixture.events || []) {
          if (event.player && String(event.player) === id) {
            if (event.type === 'goal' && event.goal_type !== 'own_goal') {
              goals += 1;
            } else if (event.type === 'yellow_card') {
              yellowCards += 1;
              if (event.card_type === 'second_yellow') redCards += 1;
            } else if (event.type === 'red_card') {
              redCards += 1;
            }
          }
        }
      }

      await Player.updateOne(
        { _id: id },
        {
          $set: {
            'sports.football.played': played,
            'sports.football.won': won,
            'sports.football.goals': goals,
            'sports.football.yellow_cards': yellowCards,
            'sports.football.red_cards': redCards,
          },
        },
      );
    }),
  );
}
