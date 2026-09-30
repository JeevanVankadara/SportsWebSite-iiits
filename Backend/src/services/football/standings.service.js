import { FootballFixture } from '../../models/sports/football/FootballFixture.js';
import { TABLE_POINTS } from '../../models/sports/football/constants.js';

const RANKING = ['points', 'goal_diff', 'goals_for'];

function emptyRow(house) {
  return {
    house_id: String(house._id),
    house_name: house.house_name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    points: 0,
    goals_for: 0,
    goals_against: 0,
    goal_diff: 0,
  };
}

function addFixture(row, { won, drawn, goalsFor, goalsAgainst }) {
  row.played += 1;
  if (won) row.won += 1;
  else if (drawn) row.drawn += 1;
  else row.lost += 1;

  row.points += won ? TABLE_POINTS.win : drawn ? TABLE_POINTS.draw : TABLE_POINTS.loss;
  row.goals_for += goalsFor;
  row.goals_against += goalsAgainst;
}

function headToHeadLeader(a, b, fixtures) {
  let aPoints = 0;
  let bPoints = 0;

  for (const fixture of fixtures) {
    const teams = [String(fixture.team1), String(fixture.team2)];
    if (!teams.includes(a.house_id) || !teams.includes(b.house_id)) continue;

    if (fixture.result === 'draw') {
      aPoints += TABLE_POINTS.draw;
      bPoints += TABLE_POINTS.draw;
    } else {
      const winnerId = String(fixture.result === 'team1' ? fixture.team1 : fixture.team2);
      if (winnerId === a.house_id) aPoints += TABLE_POINTS.win;
      else bPoints += TABLE_POINTS.win;
    }
  }

  if (aPoints === bPoints) return null;
  return aPoints > bPoints ? a : b;
}

function rank(rows, step, fixtures) {
  if (rows.length <= 1) return rows;
  if (step === RANKING.length) return [...rows].sort((a, b) => a.house_name.localeCompare(b.house_name));

  const key = RANKING[step];
  const groups = new Map();
  for (const row of [...rows].sort((a, b) => b[key] - a[key])) {
    if (!groups.has(row[key])) groups.set(row[key], []);
    groups.get(row[key]).push(row);
  }

  return [...groups.values()].flatMap((group) => {
    if (group.length === 2) {
      const leader = headToHeadLeader(group[0], group[1], fixtures);
      if (leader) return leader === group[0] ? group : [group[1], group[0]];
    }
    return rank(group, step + 1, fixtures);
  });
}

/**
 * Computes standard football standings for a tournament from completed fixtures.
 */
export async function computeStandings(tournament) {
  const fixtures = await FootballFixture.find({ tournament: tournament._id, status: 'completed' });
  const rows = new Map(tournament.houses.map((house) => [String(house._id), emptyRow(house)]));

  for (const fixture of fixtures) {
    const team1 = rows.get(String(fixture.team1));
    const team2 = rows.get(String(fixture.team2));
    if (!team1 || !team2) continue;

    const drawn = fixture.result === 'draw';

    addFixture(team1, {
      won: fixture.result === 'team1',
      drawn,
      goalsFor: fixture.team1_score,
      goalsAgainst: fixture.team2_score,
    });
    addFixture(team2, {
      won: fixture.result === 'team2',
      drawn,
      goalsFor: fixture.team2_score,
      goalsAgainst: fixture.team1_score,
    });
  }

  const table = [...rows.values()].map((row) => ({
    ...row,
    goal_diff: row.goals_for - row.goals_against,
  }));

  return rank(table, 0, fixtures).map((row, index) => ({ position: index + 1, ...row }));
}
