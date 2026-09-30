import { Game } from '../../models/Game.js';
import { Player } from '../../models/Player.js';
import { caseInsensitive } from '../../models/schemaOptions.js';
import { FootballFixture } from '../../models/sports/football/FootballFixture.js';
import { HttpError } from '../../utils/httpError.js';
import { ensureAllExist } from '../../utils/validation.js';
import { refreshPlayerStats } from './playerStats.service.js';
import { calculateScore, computeElapsedSeconds, determineWinner } from './rules.js';

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
function lineupPlayers(fixture) {
  return [
    ...(fixture.team1_lineup?.starters || []),
    ...(fixture.team1_lineup?.bench || []),
    ...(fixture.team2_lineup?.starters || []),
    ...(fixture.team2_lineup?.bench || []),
  ];
}

export async function recomputeFixture(fixture) {
  const { team1_score, team2_score } = calculateScore(fixture.events);
  fixture.team1_score = team1_score;
  fixture.team2_score = team2_score;

  if (fixture.status === 'completed' && fixture.result_type === 'normal') {
    fixture.result = determineWinner(team1_score, team2_score);
  }

  await fixture.save();

  if (fixture.status === 'completed') await refreshPlayerStats(lineupPlayers(fixture));

  return fixture;
}

/**
 * Saves match configuration (format, half duration, extra time).
 * Allowed only before kickoff.
 */
export async function saveMatchConfig(fixture, config) {
  if (fixture.status !== 'scheduled') {
    throw new HttpError(409, 'Cannot change match settings after the match has started');
  }

  // A lineup already submitted must still fit the new squad size.
  for (const [team, label] of [['team1', 'The first house'], ['team2', 'The second house']]) {
    if (!fixture.slips?.[`${team}_submitted_at`]) continue;
    const lineup = fixture[`${team}_lineup`];
    if (lineup.starters.length !== config.players_per_team || lineup.bench.length > config.max_substitutes) {
      throw new HttpError(
        409,
        `${label}'s lineup has ${lineup.starters.length} starters and ${lineup.bench.length} substitutes. Change that lineup first, or keep the squad size.`,
      );
    }
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

  // A player can play for one house only.
  const other = fixture[`${team === 'team1' ? 'team2' : 'team1'}_lineup`];
  const otherIds = new Set([...(other?.starters ?? []), ...(other?.bench ?? [])].map(String));
  const clash = [...starters, ...bench].find((id) => otherIds.has(String(id)));
  if (clash) {
    const player = await Player.findById(clash, 'name username');
    const who = player ? `${player.name} (@${player.username})` : 'A player';
    throw new HttpError(400, `${who} is already in the other house's lineup. A player can play for one house only.`);
  }
  await ensureAllExist(Player, [...starters, ...bench], 'players');

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
    if (fixture.clock.is_running) {
      fixture.clock.elapsed_seconds = computeElapsedSeconds(fixture.clock, new Date());
      fixture.clock.is_running = false;
      fixture.clock.resumed_at = null;
    }
    fixture.completed_at = fixture.completed_at || new Date();
  } else if (fixture.clock.period === 'completed') {
    // The match reached full time: the goals decide it again.
    fixture.result = determineWinner(fixture.team1_score, fixture.team2_score);
    fixture.decision_note = '';
  } else {
    // It was stopped early, so removing the decision reopens it where it stopped (clock paused).
    fixture.result = null;
    fixture.decision_note = '';
    fixture.status = fixture.clock.period === 'not_started' ? 'scheduled' : 'live';
    fixture.completed_at = null;
  }

  await recomputeFixture(fixture);
  // A reopened match no longer counts in the players' records.
  if (fixture.status !== 'completed') await refreshPlayerStats(lineupPlayers(fixture));
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

  const playerIds = fixtures.flatMap(lineupPlayers);

  await FootballFixture.deleteMany(filter);
  await refreshPlayerStats(playerIds);
}
