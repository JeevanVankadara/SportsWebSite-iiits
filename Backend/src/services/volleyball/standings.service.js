import { TABLE_POINTS } from '../../models/sports/volleyball/constants.js';
import { VolleyballFixture } from '../../models/sports/volleyball/VolleyballFixture.js';
import { scoreSummary } from './rules.js';

// Tie-breakers after table points: sets won minus lost, then points scored minus conceded, then name.
const RANKING = ['points', 'set_diff', 'point_diff'];

function emptyRow(house) {
  return {
    house_id: String(house._id),
    house_name: house.house_name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    points: 0,
    sets_won: 0,
    sets_lost: 0,
    points_scored: 0,
    points_conceded: 0,
  };
}

function addFixture(row, { won, drawn, setsFor, setsAgainst, pointsFor, pointsAgainst }) {
  row.played += 1;
  if (won) row.won += 1;
  else if (drawn) row.drawn += 1;
  else row.lost += 1;
  row.points += won ? TABLE_POINTS.win : drawn ? TABLE_POINTS.draw : TABLE_POINTS.loss;
  row.sets_won += setsFor;
  row.sets_lost += setsAgainst;
  row.points_scored += pointsFor;
  row.points_conceded += pointsAgainst;
}

// Table points each house earned in the fixtures between just these two houses.
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

// Points table for volleyball in one tournament, worked out from completed fixtures every time.
export async function computeStandings(tournament) {
  const fixtures = await VolleyballFixture.find({ tournament: tournament._id, status: 'completed' });
  const rows = new Map(tournament.houses.map((house) => [String(house._id), emptyRow(house)]));

  for (const fixture of fixtures) {
    const team1 = rows.get(String(fixture.team1));
    const team2 = rows.get(String(fixture.team2));
    if (!team1 || !team2) continue;

    const { team1Sets, team2Sets, team1Points, team2Points } = scoreSummary(fixture);
    const drawn = fixture.result === 'draw';

    addFixture(team1, {
      won: fixture.result === 'team1',
      drawn,
      setsFor: team1Sets,
      setsAgainst: team2Sets,
      pointsFor: team1Points,
      pointsAgainst: team2Points,
    });
    addFixture(team2, {
      won: fixture.result === 'team2',
      drawn,
      setsFor: team2Sets,
      setsAgainst: team1Sets,
      pointsFor: team2Points,
      pointsAgainst: team1Points,
    });
  }

  const table = [...rows.values()].map((row) => ({
    ...row,
    set_diff: row.sets_won - row.sets_lost,
    point_diff: row.points_scored - row.points_conceded,
  }));

  return rank(table, 0, fixtures).map((row, index) => ({ position: index + 1, ...row }));
}
