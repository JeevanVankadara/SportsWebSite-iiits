import { Game } from '../../models/Game.js';
import { caseInsensitive } from '../../models/schemaOptions.js';
import { FootballFixture } from '../../models/sports/football/FootballFixture.js';
import { HttpError } from '../../utils/httpError.js';
import { refreshPlayerStats } from './playerStats.service.js';
import { calculateScore, determineWinner } from './rules.js';

const PLAYER_FIELDS = 'name username roll_number';

export function findFootballGame() {
  return Game.findOne({ game_name: 'Football' }).collation(caseInsensitive);
}

/**
 * Loads the complete fixture details including populated lineups, referees and event participants.
 */
export async function loadFixtureDetail(fixtureId) {
  const fixture = await FootballFixture.findById(fixtureId)
    .populate('referees', PLAYER_FIELDS)
    .populate('team1_lineup.starters', PLAYER_FIELDS)
    .populate('team1_lineup.bench', PLAYER_FIELDS)
    .populate('team2_lineup.starters', PLAYER_FIELDS)
    .populate('team2_lineup.bench', PLAYER_FIELDS)
    .populate('events.player', PLAYER_FIELDS)
    .populate('events.assist_player', PLAYER_FIELDS)
    .populate('events.player_out', PLAYER_FIELDS)
    .populate('events.player_in', PLAYER_FIELDS);

  return fixture;
}

/**
 * Recomputes fixture score, result and stats from the source events list.
 */
export async function recomputeFixture(fixture) {
  const { team1_score, team2_score } = calculateScore(fixture.events);
  fixture.team1_score = team1_score;
  fixture.team2_score = team2_score;

  if (fixture.status === 'completed' && fixture.result_type === 'normal') {
    fixture.result = determineWinner(team1_score, team2_score);
  }

  await fixture.save();

  if (fixture.status === 'completed') {
    const allPlayers = [
      ...(fixture.team1_lineup?.starters || []),
      ...(fixture.team1_lineup?.bench || []),
      ...(fixture.team2_lineup?.starters || []),
      ...(fixture.team2_lineup?.bench || []),
    ];
    await refreshPlayerStats(allPlayers);
  }

  return fixture;
}

/**
 * Saves match configuration (format, half duration, extra time).
 * Allowed only before kickoff.
 */
export async function saveMatchConfig(fixture, config) {
  if (fixture.status !== 'scheduled' && fixture.clock.period !== 'not_started') {
    throw new HttpError(409, 'Cannot change match settings after the match has started');
  }

  fixture.config = {
    ...fixture.config.toObject(),
    ...config,
  };

  await fixture.save();
  return loadFixtureDetail(fixture._id);
}

/**
 * Saves a team's lineup (starting lineup and bench).
 */
export async function saveLineup(fixture, team, { starters, bench }) {
  if (fixture.status === 'completed') {
    throw new HttpError(409, 'Cannot change lineup for a completed match');
  }

  if (team === 'team1') {
    fixture.team1_lineup = { starters, bench };
    fixture.slips.team1_submitted_at = new Date();
  } else {
    fixture.team2_lineup = { starters, bench };
    fixture.slips.team2_submitted_at = new Date();
  }

  // Once both slips are submitted, lock the lineup
  if (fixture.slips.team1_submitted_at && fixture.slips.team2_submitted_at) {
    fixture.lineup_locked_at = fixture.lineup_locked_at || new Date();
  }

  await fixture.save();

  // If match was already completed or players were updated, refresh stats
  if (fixture.status === 'completed') {
    await refreshPlayerStats([...starters, ...bench]);
  }

  return loadFixtureDetail(fixture._id);
}

/**
 * Sets fixture decision (e.g. abandon match or restore to normal).
 */
export async function setFixtureDecision(fixture, decision) {
  fixture.result_type = decision.result_type;

  if (decision.result_type === 'abandoned') {
    fixture.result = decision.result;
    fixture.decision_note = decision.decision_note;
    fixture.status = 'completed';
    fixture.clock.is_running = false;
    fixture.completed_at = fixture.completed_at || new Date();
  } else {
    fixture.result = determineWinner(fixture.team1_score, fixture.team2_score);
    fixture.decision_note = '';
  }

  await recomputeFixture(fixture);
  return loadFixtureDetail(fixture._id);
}

/**
 * Stops an admin from removing houses or the Football sport while fixtures depend on them.
 */
export async function assertTournamentEditAllowed(tournament, { games, houses }) {
  if (tournament.isNew) return;

  if (games) {
    const football = await findFootballGame();
    const removing =
      football &&
      tournament.games.some((id) => id.equals(football._id)) &&
      !games.includes(String(football._id));
    if (removing && (await FootballFixture.exists({ tournament: tournament._id }))) {
      throw new HttpError(409, 'Football has fixtures in this tournament. Delete them before removing football.');
    }
  }

  if (houses) {
    const kept = new Set(houses.filter((house) => house._id).map((house) => String(house._id)));
    const removed = tournament.houses.filter((house) => !kept.has(String(house._id))).map((house) => house._id);
    const inUse =
      removed.length > 0 &&
      (await FootballFixture.exists({
        tournament: tournament._id,
        $or: [{ team1: { $in: removed } }, { team2: { $in: removed } }],
      }));
    if (inUse) {
      throw new HttpError(409, 'A house you removed has football fixtures. Delete those fixtures first, or keep the house.');
    }
  }
}

/**
 * Deletes football fixtures matching the filter and updates player stats.
 */
export async function deleteFixtures(filter) {
  const fixtures = await FootballFixture.find(filter);
  if (fixtures.length === 0) return;

  const playerIds = fixtures.flatMap((f) => [
    ...(f.team1_lineup?.starters || []),
    ...(f.team1_lineup?.bench || []),
    ...(f.team2_lineup?.starters || []),
    ...(f.team2_lineup?.bench || []),
  ]);

  await FootballFixture.deleteMany(filter);
  await refreshPlayerStats(playerIds);
}
