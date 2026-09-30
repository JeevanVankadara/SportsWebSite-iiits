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
import { ensureOpen, refereeDetail, refereeFixture } from './access.js';

export async function myFixtures(req, res) {
  const fixtures = await FootballFixture.find({ referees: req.player._id })
    .populate('tournament', 'tournament_name houses')
    .sort({ scheduled_at: 1, created_at: -1 });

  res.json({ fixtures });
}

export async function getFixture(req, res) {
  await refereeFixture(req.params.id, req.player);
  res.json(await refereeDetail(req.params.id));
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
  const decision = validateFixtureDecision(req.body);

  await setFixtureDecision(fixture, decision);
  res.json(await refereeDetail(req.params.id));
}
