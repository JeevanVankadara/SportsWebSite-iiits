import { Game } from '../../models/Game.js';
import { caseInsensitive } from '../../models/schemaOptions.js';
import { Player } from '../../models/Player.js';
import { VolleyballFixture } from '../../models/sports/volleyball/VolleyballFixture.js';
import { Tournament } from '../../models/Tournament.js';
import { HttpError } from '../../utils/httpError.js';
import { ensureAllExist } from '../../utils/validation.js';
import { determineWinner, idOf, replayMatch, scoreSummary } from './rules.js';

const PLAYER_FIELDS = 'name username roll_number';

export function findVolleyballGame() {
  return Game.findOne({ game_name: 'Volleyball' }).collation(caseInsensitive);
}

export function loadFixture(fixtureId) {
  return VolleyballFixture.findById(fixtureId)
    .populate('referees', PLAYER_FIELDS)
    .populate('team1_lineup.starters', PLAYER_FIELDS)
    .populate('team1_lineup.bench', PLAYER_FIELDS)
    .populate('team2_lineup.starters', PLAYER_FIELDS)
    .populate('team2_lineup.bench', PLAYER_FIELDS);
}

/**
 * What every volleyball screen needs: { fixture, state, tournament }.
 * state is the replayed match: who is on court and on the bench, and the substitution log.
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
 * Recomputes the sets won (and the result of a finished match) from the sets, then saves.
 * Safe to run after any change to the sets.
 */
export async function recomputeFixture(fixture) {
  const { team1Sets, team2Sets } = scoreSummary(fixture);
  fixture.team1_sets_won = team1Sets;
  fixture.team2_sets_won = team2Sets;

  if (fixture.status === 'completed' && fixture.result_type === 'normal') {
    fixture.result = determineWinner(team1Sets, team2Sets);
  }

  await fixture.save();
  return fixture;
}

/**
 * Saves the scoring rules. Allowed only before the match starts.
 */
export async function saveMatchConfig(fixture, config) {
  if (fixture.status !== 'scheduled' || fixture.sets.length > 0) {
    throw new HttpError(409, 'The rules cannot change after the match has started');
  }
  fixture.config = { ...fixture.config.toObject(), ...config };
  await fixture.save();
}

/**
 * Saves a house's lineup. After the start it can still be corrected, as long as every player
 * already named in a substitution for that house stays in it.
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

  if (fixture.status !== 'scheduled') {
    const kept = new Set([...starters, ...bench]);
    const used = fixture.events
      .filter((event) => event.team === team)
      .flatMap((event) => [event.player_out, event.player_in]);
    if (used.map(idOf).some((id) => id && !kept.has(id))) {
      throw new HttpError(409, 'A player named in a substitution must stay in the lineup. Undo those changes first.');
    }
  }

  fixture[`${team}_lineup`] = { starters, bench };
  fixture.slips[`${team}_submitted_at`] = new Date();
  if (fixture.slips.team1_submitted_at && fixture.slips.team2_submitted_at) {
    fixture.lineup_locked_at = fixture.lineup_locked_at || new Date();
  }
  await fixture.save();
}

/**
 * Abandons the match with a decision, or removes that decision.
 */
export async function setFixtureDecision(fixture, decision) {
  fixture.result_type = decision.result_type;

  if (decision.result_type === 'abandoned') {
    fixture.result = decision.result;
    fixture.note = decision.decision_note;
    // Close the set in play as it stands so the points already played still count.
    const live = fixture.sets.find((set) => set.status === 'live');
    if (live) {
      live.status = 'completed';
      live.ended_at = live.ended_at || new Date();
    }
    fixture.status = 'completed';
    fixture.completed_at = fixture.completed_at || new Date();
  } else {
    // Removing the decision: the sets decide it again.
    fixture.result = null;
    fixture.note = '';
    const won = fixture.sets.filter((set) => set.status === 'completed' && set.winner);
    const team1 = won.filter((set) => set.winner === 'team1').length;
    const team2 = won.filter((set) => set.winner === 'team2').length;
    const decided = team1 >= 2 || team2 >= 2;
    fixture.status = fixture.sets.length === 0 ? 'scheduled' : decided ? 'completed' : 'live';
    fixture.completed_at = decided ? fixture.completed_at || new Date() : null;
    if (decided) fixture.result = team1 > team2 ? 'team1' : 'team2';
  }

  await recomputeFixture(fixture);
}

/**
 * Stops an admin from removing houses or the Volleyball sport while fixtures depend on them.
 */
export async function assertTournamentEditAllowed(tournament, { games, houses }) {
  if (tournament.isNew) return;

  if (games) {
    const volleyball = await findVolleyballGame();
    const removing =
      volleyball && tournament.games.some((id) => id.equals(volleyball._id)) && !games.includes(String(volleyball._id));
    if (removing && (await VolleyballFixture.exists({ tournament: tournament._id }))) {
      throw new HttpError(409, 'Volleyball has fixtures in this tournament. Delete them before removing volleyball.');
    }
  }

  if (houses) {
    const kept = new Set(houses.filter((house) => house._id).map((house) => String(house._id)));
    const removed = tournament.houses.filter((house) => !kept.has(String(house._id))).map((house) => house._id);
    const inUse =
      removed.length > 0 &&
      (await VolleyballFixture.exists({
        tournament: tournament._id,
        $or: [{ team1: { $in: removed } }, { team2: { $in: removed } }],
      }));
    if (inUse) {
      throw new HttpError(409, 'A house you removed has volleyball fixtures. Delete those fixtures first, or keep the house.');
    }
  }
}

/**
 * Deletes volleyball fixtures matching the filter.
 */
export async function deleteFixtures(filter) {
  await VolleyballFixture.deleteMany(filter);
}
