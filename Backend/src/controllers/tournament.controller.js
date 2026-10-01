import { Game } from '../models/Game.js';
import { TOURNAMENT_STATUSES, Tournament } from '../models/Tournament.js';
import {
  assertTournamentEditAllowed as assertBadmintonEditAllowed,
  deleteFixtures as deleteBadmintonFixtures,
} from '../services/badminton/fixture.service.js';
import {
  assertTournamentEditAllowed as assertFootballEditAllowed,
  deleteFixtures as deleteFootballFixtures,
} from '../services/football/fixture.service.js';
import {
  assertTournamentEditAllowed as assertCricketEditAllowed,
  deleteFixtures as deleteCricketFixtures,
} from '../services/cricket/fixture.service.js';
import {
  assertTournamentEditAllowed as assertKabaddiEditAllowed,
  deleteFixtures as deleteKabaddiFixtures,
} from '../services/kabaddi/fixture.service.js';
import {
  assertTournamentEditAllowed as assertVolleyballEditAllowed,
  deleteFixtures as deleteVolleyballFixtures,
} from '../services/volleyball/fixture.service.js';
import { HttpError } from '../utils/httpError.js';
import {
  ensureAllExist,
  findByIdOr404,
  isObjectId,
  optionalDate,
  optionalIdList,
  requireText,
} from '../utils/validation.js';

const WITH_GAMES = { path: 'games', select: 'game_name' };

// Houses arrive as [{ _id?, house_name }]. Existing houses keep their _id; new ones get one on save.
// undefined = field not sent.
function optionalHouses(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new HttpError(400, 'Houses must be a list');

  return value.map((house) => {
    const name = house?.house_name;
    if (typeof name !== 'string' || !name.trim()) throw new HttpError(400, 'Every house needs a name');
    if (house._id === undefined) return { house_name: name.trim() };
    if (!isObjectId(house._id)) throw new HttpError(400, 'Invalid house id');
    return { _id: house._id, house_name: name.trim() };
  });
}

// Copies the fields sent in the request body onto the tournament; fields that were not sent are left alone.
async function applyChanges(tournament, body) {
  if (tournament.isNew || body.tournament_name !== undefined) {
    tournament.tournament_name = requireText(body.tournament_name, 'Tournament name');
  }
  if (body.status !== undefined) tournament.status = body.status;

  const startDate = optionalDate(body.start_date, 'Start date');
  if (startDate !== undefined) tournament.start_date = startDate;
  const endDate = optionalDate(body.end_date, 'End date');
  if (endDate !== undefined) tournament.end_date = endDate;

  const games = optionalIdList(body.games, 'Sports');
  const houses = optionalHouses(body.houses);
  // Sports and houses that already have fixtures cannot be removed.
  await assertBadmintonEditAllowed(tournament, { games, houses });
  await assertFootballEditAllowed(tournament, { games, houses });
  await assertCricketEditAllowed(tournament, { games, houses });
  await assertKabaddiEditAllowed(tournament, { games, houses });
  await assertVolleyballEditAllowed(tournament, { games, houses });

  if (games) {
    await ensureAllExist(Game, games, 'sports');
    tournament.games = games;
  }
  if (houses) tournament.houses = houses;
  if (games || houses) dropStaleWinners(tournament);
}

// Winners must name a sport and houses the tournament still has.
function dropStaleWinners(tournament) {
  const gameIds = new Set(tournament.games.map((game) => String(game._id ?? game)));
  const houseIds = new Set(tournament.houses.map((house) => String(house._id)));
  const known = (house) => house == null || houseIds.has(String(house));
  tournament.winners = tournament.winners.filter(
    (row) => gameIds.has(String(row.game)) && known(row.winner) && known(row.runner_up),
  );
}

function optionalHouse(tournament, value, label) {
  if (value === undefined || value === null || value === '') return null;
  const house = isObjectId(String(value)) ? tournament.houses.id(String(value)) : null;
  if (!house) throw new HttpError(400, `${label} must be a house of this tournament`);
  return house._id;
}

// PUT /api/tournaments/:id/winners — body: { game, winner, runner_up }
// Sets (or, with neither house, clears) the winner and runner-up the admin declares for one sport.
export async function setWinners(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.id, 'Tournament not found');
  const body = req.body ?? {};
  const game = String(body.game ?? '');
  if (!tournament.games.some((id) => String(id) === game)) {
    throw new HttpError(400, 'Pick a sport of this tournament');
  }
  const gameDoc = await Game.findById(game, 'game_name');
  if (!gameDoc || !req.admin.canManageSport(gameDoc.game_name.toLowerCase())) {
    throw new HttpError(403, `You do not have permission to manage ${gameDoc?.game_name ?? 'this sport'}. Ask the super admin.`);
  }
  const winner = optionalHouse(tournament, body.winner, 'Winner');
  const runnerUp = optionalHouse(tournament, body.runner_up, 'Runner-up');
  if (runnerUp && !winner) throw new HttpError(400, 'Pick the winner before the runner-up');
  if (winner && runnerUp && winner.equals(runnerUp)) {
    throw new HttpError(400, 'The winner and the runner-up must be different houses');
  }

  const others = tournament.winners.filter((row) => String(row.game) !== game);
  tournament.winners = winner ? [...others, { game, winner, runner_up: runnerUp }] : others;
  await tournament.save();
  await tournament.populate(WITH_GAMES);
  res.json({ tournament });
}

// GET /api/tournaments?status=live
export async function listTournaments(req, res) {
  const { status } = req.query;
  if (status !== undefined && !TOURNAMENT_STATUSES.includes(status)) {
    throw new HttpError(400, 'Status must be live or completed');
  }

  const tournaments = await Tournament.find(status ? { status } : {})
    .sort({ created_at: -1 })
    .populate(WITH_GAMES);
  res.json({ tournaments });
}

export async function getTournament(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.id, 'Tournament not found');
  await tournament.populate(WITH_GAMES);
  res.json({ tournament });
}

export async function createTournament(req, res) {
  const tournament = new Tournament();
  await applyChanges(tournament, req.body ?? {});
  await tournament.save();
  await tournament.populate(WITH_GAMES);
  res.status(201).json({ tournament });
}

export async function updateTournament(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.id, 'Tournament not found');
  await applyChanges(tournament, req.body ?? {});
  await tournament.save();
  await tournament.populate(WITH_GAMES);
  res.json({ tournament });
}

export async function deleteTournament(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.id, 'Tournament not found');
  await deleteBadmintonFixtures({ tournament: tournament._id });
  await deleteFootballFixtures({ tournament: tournament._id });
  await deleteCricketFixtures({ tournament: tournament._id });
  await deleteKabaddiFixtures({ tournament: tournament._id });
  await deleteVolleyballFixtures({ tournament: tournament._id });
  await tournament.deleteOne();
  res.status(204).end();
}
