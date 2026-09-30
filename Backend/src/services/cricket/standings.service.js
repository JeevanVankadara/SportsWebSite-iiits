import { CricketFixture } from '../../models/sports/cricket/CricketFixture.js';
import { CricketInnings } from '../../models/sports/cricket/CricketInnings.js';
import { BALLS_PER_OVER, TABLE_POINTS } from '../../models/sports/cricket/constants.js';
import { nrrBalls } from './rules.js';

const RANKING = ['points', 'nrr'];

function emptyRow(house) {
  return {
    house_id: String(house._id),
    house_name: house.house_name,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    no_result: 0,
    points: 0,
    runs_for: 0,
    balls_for: 0,
    runs_against: 0,
    balls_against: 0,
  };
}

function pointsFor(result, team) {
  if (result === 'tie') return TABLE_POINTS.tie;
  if (result === 'no_result') return TABLE_POINTS.no_result;
  return result === team ? TABLE_POINTS.win : TABLE_POINTS.loss;
}

function addResult(row, result, team) {
  row.played += 1;
  if (result === 'tie') row.tied += 1;
  else if (result === 'no_result') row.no_result += 1;
  else if (result === team) row.won += 1;
  else row.lost += 1;
  row.points += pointsFor(result, team);
}

// NRR = runs scored per over faced - runs conceded per over bowled, from balls so 12.3 overs is 12.5.
function netRunRate(row) {
  const scored = row.balls_for ? (row.runs_for * BALLS_PER_OVER) / row.balls_for : 0;
  const conceded = row.balls_against ? (row.runs_against * BALLS_PER_OVER) / row.balls_against : 0;
  return Math.round((scored - conceded) * 1000) / 1000 || 0;
}

function headToHeadLeader(a, b, fixtures) {
  let aPoints = 0;
  let bPoints = 0;
  for (const fixture of fixtures) {
    const teams = { [String(fixture.team1)]: 'team1', [String(fixture.team2)]: 'team2' };
    if (!teams[a.house_id] || !teams[b.house_id]) continue;
    aPoints += pointsFor(fixture.result, teams[a.house_id]);
    bPoints += pointsFor(fixture.result, teams[b.house_id]);
  }
  if (aPoints === bPoints) return null;
  return aPoints > bPoints ? a : b;
}

// Points, then net run rate; when exactly two houses are still level, their head-to-head result.
function rank(rows, step, fixtures) {
  if (rows.length <= 1) return rows;
  if (step === RANKING.length) {
    if (rows.length === 2) {
      const leader = headToHeadLeader(rows[0], rows[1], fixtures);
      if (leader) return leader === rows[0] ? rows : [rows[1], rows[0]];
    }
    return [...rows].sort((a, b) => a.house_name.localeCompare(b.house_name));
  }

  const key = RANKING[step];
  const groups = new Map();
  for (const row of [...rows].sort((a, b) => b[key] - a[key])) {
    if (!groups.has(row[key])) groups.set(row[key], []);
    groups.get(row[key]).push(row);
  }
  return [...groups.values()].flatMap((group) => rank(group, step + 1, fixtures));
}

// Points table for cricket in one tournament, worked out from completed fixtures on every request.
// Super overs and abandoned matches give points but are left out of the net run rate.
export async function computeStandings(tournament) {
  const fixtures = await CricketFixture.find({ tournament: tournament._id, status: 'completed' });
  const rows = new Map(tournament.houses.map((house) => [String(house._id), emptyRow(house)]));

  const played = fixtures.filter((fixture) => fixture.result_type === 'normal').map((fixture) => fixture._id);
  const innings = await CricketInnings.find(
    { fixture: { $in: played }, super_over: 0 },
    'fixture batting_team runs wickets legal_balls overs max_wickets',
  );
  const inningsByFixture = new Map();
  for (const item of innings) {
    const key = String(item.fixture);
    inningsByFixture.set(key, [...(inningsByFixture.get(key) ?? []), item]);
  }

  for (const fixture of fixtures) {
    const houses = { team1: rows.get(String(fixture.team1)), team2: rows.get(String(fixture.team2)) };
    if (!houses.team1 || !houses.team2) continue;
    addResult(houses.team1, fixture.result, 'team1');
    addResult(houses.team2, fixture.result, 'team2');

    for (const item of inningsByFixture.get(String(fixture._id)) ?? []) {
      const balls = nrrBalls(item);
      const batting = houses[item.batting_team];
      const bowling = houses[item.batting_team === 'team1' ? 'team2' : 'team1'];
      batting.runs_for += item.runs;
      batting.balls_for += balls;
      bowling.runs_against += item.runs;
      bowling.balls_against += balls;
    }
  }

  const table = [...rows.values()].map((row) => ({ ...row, nrr: netRunRate(row) }));
  return rank(table, 0, fixtures).map((row, index) => ({ position: index + 1, ...row }));
}
