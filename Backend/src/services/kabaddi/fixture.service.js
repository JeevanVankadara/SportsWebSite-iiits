import { Game } from '../../models/Game.js';
import { Player } from '../../models/Player.js';
import { caseInsensitive } from '../../models/schemaOptions.js';
import { KabaddiFixture } from '../../models/sports/kabaddi/KabaddiFixture.js';
import { Tournament } from '../../models/Tournament.js';
import { HttpError } from '../../utils/httpError.js';
import { ensureAllExist } from '../../utils/validation.js';
import { refreshPlayerStats } from './playerStats.service.js';
import { computeElapsedSeconds, determineWinner, idOf, replayMatch } from './rules.js';

const PLAYER_FIELDS = 'name username roll_number';

export function findKabaddiGame() {
  return Game.findOne({ game_name: 'Kabaddi' }).collation(caseInsensitive);
}

export function loadFixture(fixtureId) {
  return KabaddiFixture.findById(fixtureId)
    .populate('referees', PLAYER_FIELDS)
    .populate('team1_lineup.starters', PLAYER_FIELDS)
    .populate('team1_lineup.bench', PLAYER_FIELDS)
    .populate('team2_lineup.starters', PLAYER_FIELDS)
    .populate('team2_lineup.bench', PLAYER_FIELDS);
}

/**
 * What every kabaddi screen needs: { fixture, state, tournament }.
 * state is the replayed match: who is on court and out, the score after each event and whose raid is next.
 */
export async function fixtureResponse(fixtureId) {
  const fixture = await loadFixture(fixtureId);
  if (!fixture) throw new HttpError(404, 'Fixture not found');
  const tournament = await Tournament.findById(fixture.tournament, 'tournament_name houses');
  return { fixture, state: replayMatch(fixture), tournament };
}

export function lineupPlayers(fixture) {
  return [
    ...(fixture.team1_lineup?.starters || []),
    ...(fixture.team1_lineup?.bench || []),
    ...(fixture.team2_lineup?.starters || []),
    ...(fixture.team2_lineup?.bench || []),
  ];
}

/**
 * Recomputes the score (and the result of a finished match) from the events, then saves.
 */
export async function recomputeFixture(fixture) {
  const { score } = replayMatch(fixture);
  fixture.team1_score = score.team1;
  fixture.team2_score = score.team2;

  if (fixture.status === 'completed' && fixture.result_type === 'normal') {
    fixture.result = determineWinner(score.team1, score.team2);
  }

  await fixture.save();
  if (fixture.status === 'completed') await refreshPlayerStats(lineupPlayers(fixture));
  return fixture;
}

/**
 * Saves the match rules. Allowed only before the match starts.
 */
export async function saveMatchConfig(fixture, config) {
  if (fixture.status !== 'scheduled') {
    throw new HttpError(409, 'The rules cannot change after the match has started');
  }

  // A lineup already submitted must still fit the new squad size.
  for (const [team, label] of [['team1', 'The first house'], ['team2', 'The second house']]) {
    if (!fixture.slips?.[`${team}_submitted_at`]) continue;
    const lineup = fixture[`${team}_lineup`];
    if (lineup.starters.length !== config.players_on_court || lineup.bench.length > config.max_substitutes) {
      throw new HttpError(
        409,
        `${label}'s lineup has ${lineup.starters.length} starters and ${lineup.bench.length} substitutes. Change that lineup first, or keep the squad size.`,
      );
    }
  }

  fixture.config = { ...fixture.config.toObject(), ...config };
  await fixture.save();
}

/**
 * Saves a house's lineup. After the start it can still be corrected, as long as every player
 * already named in an event for that house stays in it.
 */
export async function saveLineup(fixture, team, { starters, bench }) {
  const other = fixture[`${team === 'team1' ? 'team2' : 'team1'}_lineup`];
  const otherIds = new Set([...(other?.starters ?? []), ...(other?.bench ?? [])].map(String));
  const clash = [...starters, ...bench].find((id) => otherIds.has(id));
  if (clash) {
    const player = await Player.findById(clash, 'name username');
    const who = player ? `${player.name} (@${player.username})` : 'A player';
    throw new HttpError(400, `${who} is already in the other house's lineup. A player can play for one house only.`);
  }
  await ensureAllExist(Player, [...starters, ...bench], 'players');

  if (fixture.clock.period !== 'not_started') {
    const kept = new Set([...starters, ...bench]);
    const opponents = team === 'team1' ? 'team2' : 'team1';
    const used = fixture.events.flatMap((event) => {
      if (event.team === team) return [event.raider, event.player_out, event.player_in];
      if (event.team === opponents) return [...(event.touched ?? []), event.tackler, ...(event.assists ?? [])];
      return [];
    });
    if (used.map(idOf).some((id) => id && !kept.has(id))) {
      throw new HttpError(409, 'A player named in the match events must stay in the lineup. Undo those events first.');
    }
  }

  fixture[`${team}_lineup`] = { starters, bench };
  fixture.slips[`${team}_submitted_at`] = new Date();
  if (fixture.slips.team1_submitted_at && fixture.slips.team2_submitted_at) {
    fixture.lineup_locked_at = fixture.lineup_locked_at || new Date();
  }

  await recomputeFixture(fixture);
}

/**
 * Records which house raids first. Allowed only before the match starts.
 */
export async function setFirstRaid(fixture, team) {
  if (fixture.clock.period !== 'not_started') {
    throw new HttpError(409, 'The first raid cannot change after the match has started');
  }
  fixture.first_raid = team;
  await fixture.save();
}

/**
 * Abandons a match with a decision, or removes that decision.
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
    // The match was played to the end: the score decides it again.
    fixture.result = null;
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
}

/**
 * Stops an admin from removing houses or the Kabaddi sport while fixtures depend on them.
 */
export async function assertTournamentEditAllowed(tournament, { games, houses }) {
  if (tournament.isNew) return;

  if (games) {
    const kabaddi = await findKabaddiGame();
    const removing =
      kabaddi && tournament.games.some((id) => id.equals(kabaddi._id)) && !games.includes(String(kabaddi._id));
    if (removing && (await KabaddiFixture.exists({ tournament: tournament._id }))) {
      throw new HttpError(409, 'Kabaddi has fixtures in this tournament. Delete them before removing kabaddi.');
    }
  }

  if (houses) {
    const kept = new Set(houses.filter((house) => house._id).map((house) => String(house._id)));
    const removed = tournament.houses.filter((house) => !kept.has(String(house._id))).map((house) => house._id);
    const inUse =
      removed.length > 0 &&
      (await KabaddiFixture.exists({
        tournament: tournament._id,
        $or: [{ team1: { $in: removed } }, { team2: { $in: removed } }],
      }));
    if (inUse) {
      throw new HttpError(409, 'A house you removed has kabaddi fixtures. Delete those fixtures first, or keep the house.');
    }
  }
}

/**
 * Deletes kabaddi fixtures matching the filter and updates player stats.
 */
export async function deleteFixtures(filter) {
  const fixtures = await KabaddiFixture.find(filter);
  if (fixtures.length === 0) return;

  const playerIds = fixtures.flatMap(lineupPlayers);
  await KabaddiFixture.deleteMany(filter);
  await refreshPlayerStats(playerIds);
}
