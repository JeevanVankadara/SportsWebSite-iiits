import { Player } from '../../models/Player.js';
import { CricketFixture } from '../../models/sports/cricket/CricketFixture.js';
import { CricketInnings } from '../../models/sports/cricket/CricketInnings.js';

// Recounts player.sports.cricket = { played, won, runs, wickets } from completed fixtures.
// Only the playing XI counts as having played, and super overs are left out of runs and wickets.
export async function refreshPlayerStats(playerIds) {
  const ids = [...new Set(playerIds.map(String))];
  if (ids.length === 0) return;

  const fixtures = await CricketFixture.find(
    { status: 'completed', $or: [{ team1_players: { $in: ids } }, { team2_players: { $in: ids } }] },
    'team1_players team2_players result',
  );
  const innings = await CricketInnings.find(
    { fixture: { $in: fixtures.map((fixture) => fixture._id) }, super_over: 0 },
    'batting.player batting.runs bowling.player bowling.wickets',
  );

  const stats = new Map(ids.map((id) => [id, { played: 0, won: 0, runs: 0, wickets: 0 }]));
  for (const fixture of fixtures) {
    for (const team of ['team1', 'team2']) {
      for (const id of fixture[`${team}_players`].map(String)) {
        const record = stats.get(id);
        if (!record) continue;
        record.played += 1;
        if (fixture.result === team) record.won += 1;
      }
    }
  }
  for (const item of innings) {
    for (const row of item.batting) {
      const record = stats.get(String(row.player));
      if (record) record.runs += row.runs;
    }
    for (const row of item.bowling) {
      const record = stats.get(String(row.player));
      if (record) record.wickets += row.wickets;
    }
  }

  await Player.bulkWrite(
    [...stats].map(([id, record]) => ({
      updateOne: { filter: { _id: id }, update: { $set: { 'sports.cricket': record } } },
    })),
  );
}
