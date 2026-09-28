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

  if (games) {
    await ensureAllExist(Game, games, 'sports');
    tournament.games = games;
  }
  if (houses) tournament.houses = houses;
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
  await tournament.deleteOne();
  res.status(204).end();
}
