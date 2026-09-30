import { TABLE_POINTS } from '../../models/sports/kabaddi/constants.js';
import { KabaddiFixture } from '../../models/sports/kabaddi/KabaddiFixture.js';

// Houses level on table points are split by point difference, then points scored, then name.
const RANKING = ['points', 'point_diff', 'points_for'];

function emptyRow(house) {
  return {
    house_id: String(house._id),
    house_name: house.house_name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    points_for: 0,
    points_against: 0,
    point_diff: 0,
    points: 0,
  };
}

function addFixture(row, result, scored, conceded) {
  row.played += 1;
  row[result] += 1;
  row.points += result === 'won' ? TABLE_POINTS.win : result === 'drawn' ? TABLE_POINTS.draw : TABLE_POINTS.loss;
  row.points_for += scored;
  row.points_against += conceded;
  row.point_diff = row.points_for - row.points_against;
}

/**
 * Computes the kabaddi points table for a tournament from completed fixtures.
 */
export async function computeStandings(tournament) {
  const fixtures = await KabaddiFixture.find({ tournament: tournament._id, status: 'completed' }).select(
    'team1 team2 team1_score team2_score result',
  );
  const rows = new Map(tournament.houses.map((house) => [String(house._id), emptyRow(house)]));

  for (const fixture of fixtures) {
    const team1 = rows.get(String(fixture.team1));
    const team2 = rows.get(String(fixture.team2));
    if (!team1 || !team2 || !fixture.result) continue;

    const outcome = (team) => (fixture.result === 'draw' ? 'drawn' : fixture.result === team ? 'won' : 'lost');
    addFixture(team1, outcome('team1'), fixture.team1_score, fixture.team2_score);
    addFixture(team2, outcome('team2'), fixture.team2_score, fixture.team1_score);
  }

  return [...rows.values()]
    .sort(
      (a, b) =>
        RANKING.map((key) => b[key] - a[key]).find((difference) => difference !== 0) ??
        a.house_name.localeCompare(b.house_name),
    )
    .map((row, index) => ({ position: index + 1, ...row }));
}
