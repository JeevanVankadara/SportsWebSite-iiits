import { Game } from '../../models/Game.js';
import { caseInsensitive } from '../../models/schemaOptions.js';
import { CricketBall } from '../../models/sports/cricket/CricketBall.js';
import { CricketFixture } from '../../models/sports/cricket/CricketFixture.js';
import { CricketInnings } from '../../models/sports/cricket/CricketInnings.js';
import { HttpError } from '../../utils/httpError.js';
import { refreshPlayerStats } from './playerStats.service.js';
import { matchOutcome } from './rules.js';

const PLAYER_FIELDS = 'name username roll_number';

export function findCricketGame() {
  return Game.findOne({ game_name: 'Cricket' }).collation(caseInsensitive);
}

export const playingXIs = (fixture) => [...fixture.team1_players, ...fixture.team2_players];

// Everything the fixture page needs. Innings keep player ids; the page looks the names up in the squads.
export async function loadFixtureDetail(fixtureId) {
  const [fixture, innings] = await Promise.all([
    CricketFixture.findById(fixtureId)
      .populate('referees', PLAYER_FIELDS)
      .populate({ path: 'team1_players team1_substitutes team2_players team2_substitutes', select: PLAYER_FIELDS }),
    CricketInnings.find({ fixture: fixtureId }).sort({ innings_no: 1 }),
  ]);
  return { fixture, innings };
}

// Rebuilds the innings summary, status and result from the innings. Safe to run after any change.
export async function recomputeFixture(fixture) {
  const innings = await CricketInnings.find({ fixture: fixture._id }).sort({ innings_no: 1 });
  const wasCompleted = fixture.status === 'completed';

  fixture.innings = innings.map((item) => ({
    innings: item._id,
    innings_no: item.innings_no,
    super_over: item.super_over,
    batting_team: item.batting_team,
    runs: item.runs,
    wickets: item.wickets,
    legal_balls: item.legal_balls,
    status: item.status,
  }));

  if (fixture.result_type === 'abandoned') {
    fixture.margin = null;
  } else {
    const outcome = matchOutcome(innings, fixture.tie_accepted);
    fixture.result = outcome.result;
    fixture.margin = outcome.margin ?? null;
  }

  if (fixture.result) {
    fixture.status = 'completed';
    fixture.completed_at ??= new Date();
  } else {
    fixture.status = innings.length > 0 ? 'live' : 'scheduled';
    fixture.completed_at = undefined;
  }
  await fixture.save();

  if (wasCompleted || fixture.status === 'completed') await refreshPlayerStats(playingXIs(fixture));
}

// Sets or removes the referee's decision on the whole fixture (see validateFixtureDecision).
export async function applyFixtureDecision(fixture, decision) {
  fixture.result_type = decision.result_type;
  fixture.note = decision.note;
  fixture.result = decision.result_type === 'abandoned' ? decision.result : null;
  await recomputeFixture(fixture);
}

// Deletes fixtures with their innings and balls, then corrects the records of everyone who played.
export async function deleteFixtures(filter) {
  const fixtures = await CricketFixture.find(filter, 'team1_players team2_players');
  if (fixtures.length === 0) return;
  const fixtureIds = fixtures.map((fixture) => fixture._id);

  await CricketBall.deleteMany({ fixture: { $in: fixtureIds } });
  await CricketInnings.deleteMany({ fixture: { $in: fixtureIds } });
  await CricketFixture.deleteMany({ _id: { $in: fixtureIds } });
  await refreshPlayerStats(fixtures.flatMap(playingXIs));
}

// Stops a tournament edit that would leave cricket fixtures pointing at a removed house or sport.
export async function assertTournamentEditAllowed(tournament, { games, houses }) {
  if (tournament.isNew) return;

  if (games) {
    const cricket = await findCricketGame();
    const removing =
      cricket && tournament.games.some((id) => id.equals(cricket._id)) && !games.includes(String(cricket._id));
    if (removing && (await CricketFixture.exists({ tournament: tournament._id }))) {
      throw new HttpError(409, 'Cricket has fixtures in this tournament. Delete them before removing cricket.');
    }
  }

  if (houses) {
    const kept = new Set(houses.filter((house) => house._id).map((house) => String(house._id)));
    const removed = tournament.houses.filter((house) => !kept.has(String(house._id))).map((house) => house._id);
    const inUse =
      removed.length > 0 &&
      (await CricketFixture.exists({
        tournament: tournament._id,
        $or: [{ team1: { $in: removed } }, { team2: { $in: removed } }],
      }));
    if (inUse) {
      throw new HttpError(409, 'A house you removed has cricket fixtures. Delete those fixtures first, or keep the house.');
    }
  }
}
