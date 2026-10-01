import { Game } from '../../models/Game.js';
import { Tournament } from '../../models/Tournament.js';
import { HttpError } from '../../utils/httpError.js';
import { isObjectId, requireText } from '../../utils/validation.js';
import { FIXTURE_LISTS } from '../user/live.controller.js';
import { createFixture as createBadmintonFixture } from './badminton/fixture.controller.js';
import { createFixture as createCricketFixture } from './cricket/fixture.controller.js';
import { createFixture as createFootballFixture } from './football/fixture.controller.js';
import { createFixture as createKabaddiFixture } from './kabaddi/fixture.controller.js';
import { createFixture as createVolleyballFixture } from './volleyball/fixture.controller.js';

// Friendly matches: one match outside every tournament, between two teams the super admin names.
// Each is a hidden tournament (is_friendly) with one sport and the two teams as its houses, so the
// fixture itself is made, scored, refereed and edited by the same code as a tournament fixture.

const CREATE_FIXTURE = {
  badminton: createBadmintonFixture,
  cricket: createCricketFixture,
  football: createFootballFixture,
  kabaddi: createKabaddiFixture,
  volleyball: createVolleyballFixture,
};

const TEAM_NAME_MAX = 60;

function teamName(value, label) {
  const name = requireText(value, label).replace(/\s+/g, ' ');
  if (name.length > TEAM_NAME_MAX) throw new HttpError(400, `${label} must be ${TEAM_NAME_MAX} characters or fewer`);
  return name;
}

// GET /api/friendlies — every friendly with its sport and its match (null if it was removed).
export async function listFriendlies(req, res) {
  const friendlies = await Tournament.find({ is_friendly: true }).populate('games', 'game_name');
  const bySport = {};
  for (const friendly of friendlies) {
    const sport = friendly.games[0]?.game_name.toLowerCase();
    if (FIXTURE_LISTS[sport]) (bySport[sport] ??= []).push(friendly._id);
  }

  const fixtures = new Map();
  await Promise.all(
    Object.entries(bySport).map(async ([sport, ids]) => {
      for (const fixture of await FIXTURE_LISTS[sport]({ tournament: { $in: ids } })) {
        fixtures.set(String(fixture.tournament), fixture);
      }
    }),
  );

  const rows = friendlies.map((friendly) => ({
    tournament: friendly,
    sport: friendly.games[0]?.game_name.toLowerCase() ?? null,
    fixture: fixtures.get(String(friendly._id)) ?? null,
  }));
  // Newest match first; matches without a date go last.
  const when = (row) => new Date(row.fixture?.scheduled_at ?? 0).getTime();
  rows.sort((a, b) => when(b) - when(a));
  res.json({ friendlies: rows });
}

// POST /api/friendlies — body: { game, team1_name, team2_name, scheduled_at, referees }
// Answers like the sport's own "create fixture": { fixture, ... }.
export async function createFriendly(req, res) {
  const body = req.body ?? {};
  const game = isObjectId(body.game) ? await Game.findById(body.game) : null;
  const sport = game?.game_name.toLowerCase();
  if (!CREATE_FIXTURE[sport]) throw new HttpError(400, 'Pick the sport');

  const team1 = teamName(body.team1_name, 'Team 1 name');
  const team2 = teamName(body.team2_name, 'Team 2 name');
  if (team1.toLowerCase() === team2.toLowerCase()) throw new HttpError(400, 'The two teams need different names');

  const friendly = await Tournament.create({
    tournament_name: 'Friendly match',
    is_friendly: true,
    games: [game._id],
    houses: [{ house_name: team1 }, { house_name: team2 }],
  });

  // The sport's own create-fixture checks the referees and the date, and saves the fixture.
  const fixtureReq = Object.assign(Object.create(req), {
    params: { tournamentId: String(friendly._id) },
    body: {
      team1: String(friendly.houses[0]._id),
      team2: String(friendly.houses[1]._id),
      referees: body.referees,
      scheduled_at: body.scheduled_at,
    },
  });
  try {
    await CREATE_FIXTURE[sport](fixtureReq, res);
  } catch (err) {
    await friendly.deleteOne();
    throw err;
  }
}
