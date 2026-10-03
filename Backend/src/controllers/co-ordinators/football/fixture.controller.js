import {
  DEFAULT_MAX_SUBSTITUTES,
  DEFAULT_PLAYERS_PER_TEAM,
} from '../../../models/sports/football/constants.js';
import { FootballFixture } from '../../../models/sports/football/FootballFixture.js';
import {
  saveLineup,
  saveMatchConfig,
  setFixtureDecision,
} from '../../../services/football/fixture.service.js';
import {
  parseLineup,
  parseMatchConfig,
  validateFixtureDecision,
} from '../../../services/football/validators.js';
import { createGuest } from '../../../services/guestPlayer.service.js';
import { HttpError } from '../../../utils/httpError.js';
import { ensureOpen, refereeDetail, refereeFixture } from './access.js';

export async function myFixtures(req, res) {
  const fixtures = await FootballFixture.find({
    referees: req.player._id,
    status: { $in: ['live', 'scheduled'] },
  })
    .populate('tournament', 'tournament_name houses')
    .sort({ scheduled_at: 1, created_at: -1 });

  res.json({ fixtures });
}

export async function getFixture(req, res) {
  await refereeFixture(req.params.id, req.player);
  res.json(await refereeDetail(req.params.id, { publish: false }));
}

export async function saveConfig(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);

  const config = parseMatchConfig(req.body);
  await saveMatchConfig(fixture, config);

  res.json(await refereeDetail(req.params.id));
}

export async function saveTeamLineup(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);

  const { team } = req.params;
  if (team !== 'team1' && team !== 'team2') {
    return res.status(400).json({ message: 'Team must be team1 or team2' });
  }

  const requiredStarters = fixture.config?.players_per_team ?? DEFAULT_PLAYERS_PER_TEAM;
  const maxSubstitutes = fixture.config?.max_substitutes ?? DEFAULT_MAX_SUBSTITUTES;
  const lineup = parseLineup(req.body, requiredStarters, maxSubstitutes);

  await saveLineup(fixture, team, lineup);
  res.json(await refereeDetail(req.params.id));
}

export async function decideFixture(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);
  // Referees can only abandon a match; changing a decision afterwards is up to the admin.
  const decision = validateFixtureDecision(req.body ?? {});
  if (decision.result_type !== 'abandoned') throw new HttpError(400, 'Choose who gets the match and add a note');

  await setFixtureDecision(fixture, decision);
  res.json(await refereeDetail(req.params.id));
}

// POST /api/coordinator/football/fixtures/:id/guests — body: { name }
// Adds a player who has no account, for this match only (services/guestPlayer.service.js).
export async function addGuest(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);
  res.status(201).json({ player: await createGuest('football', fixture, req.body?.name) });
}
