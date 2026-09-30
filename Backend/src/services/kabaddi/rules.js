// Kabaddi rules and pure computation functions. No database calls.
//
// Nothing about the match state is stored: who is on court, who is out, the revival queue and
// the score are all rebuilt by replaying the events in order. Deleting an event (undo) therefore
// puts everything back exactly as it would have been without it.
import {
  DEFAULT_CONFIG,
  DO_OR_DIE_FAIL_POINTS,
  TACKLE_POINTS,
} from '../../models/sports/kabaddi/constants.js';

export const otherTeam = (team) => (team === 'team1' ? 'team2' : 'team1');

// Works for ObjectIds, populated players ({ _id }) and plain strings.
export const idOf = (value) => (value?._id ? String(value._id) : value ? String(value) : null);
const idsOf = (values = []) => values.map(idOf).filter(Boolean);

export function fixtureConfig(fixture) {
  const stored = fixture.config?.toObject ? fixture.config.toObject() : fixture.config;
  return { ...DEFAULT_CONFIG, ...(stored ?? {}) };
}

function startingSide(lineup) {
  return {
    on_court: idsOf(lineup?.starters),
    // Out players in the order they went out: the first one out is the first one revived.
    out: [],
    bench: idsOf(lineup?.bench),
    subbed_off: [],
    empty_raids: 0,
  };
}

// Players that are on court leave it and join the end of the revival queue.
function takeOut(side, playerIds) {
  const gone = [];
  for (const id of playerIds) {
    const index = side.on_court.indexOf(id);
    if (index === -1) continue;
    side.on_court.splice(index, 1);
    side.out.push(id);
    gone.push(id);
  }
  return gone;
}

// One out player comes back for every point scored, first out first in.
function revive(side, count) {
  const back = side.out.splice(0, Math.max(0, count));
  side.on_court.push(...back);
  return back;
}

function newPlayerLine() {
  return { raids: 0, successful_raids: 0, raid_points: 0, bonus_points: 0, super_raids: 0, tackles: 0, tackle_points: 0, super_tackles: 0 };
}

/**
 * Replays every event of a fixture.
 * Returns { score, sides, timeline, players, next_raid }:
 *  - score: { team1, team2 }
 *  - sides: per house { on_court, out, bench, subbed_off, empty_raids }
 *  - timeline: per event { event_id, points: { team1, team2 }, outs, revived, all_out, super_raid,
 *              super_tackle, do_or_die, empty, score_after }
 *  - players: per player id { raids, raid_points, tackle_points, ... }
 *  - next_raid: { team, do_or_die } for the current half
 */
export function replayMatch(fixture) {
  const config = fixtureConfig(fixture);
  const sides = { team1: startingSide(fixture.team1_lineup), team2: startingSide(fixture.team2_lineup) };
  const score = { team1: 0, team2: 0 };
  const players = {};
  const timeline = [];
  let lastRaid = null;

  const line = (id) => {
    if (!players[id]) players[id] = newPlayerLine();
    return players[id];
  };

  for (const event of fixture.events ?? []) {
    const entry = {
      event_id: idOf(event._id),
      points: { team1: 0, team2: 0 },
      outs: [],
      revived: [],
      all_out: null,
      super_raid: false,
      super_tackle: false,
      do_or_die: false,
      empty: false,
    };
    const add = (team, points) => {
      entry.points[team] += points;
      score[team] += points;
    };

    // If every defender is out after this event, the scoring house earns the all-out bonus and
    // the whole house that was all out comes back on court.
    const checkAllOut = (scoringTeam, allOutTeam, outsThisEvent) => {
      const side = sides[allOutTeam];
      if (outsThisEvent === 0 || side.on_court.length > 0) return;
      add(scoringTeam, config.all_out_points);
      entry.revived.push(...revive(sides[scoringTeam], config.all_out_points));
      side.on_court = [...side.out];
      side.out = [];
      entry.all_out = allOutTeam;
    };

    const raiding = event.team;
    const defending = otherTeam(raiding);
    const raider = idOf(event.raider);

    if (event.type === 'raid') {
      const doOrDie = config.do_or_die_enabled && sides[raiding].empty_raids >= config.do_or_die_after_empty_raids;
      const touched = idsOf(event.touched);
      const bonus = event.bonus ? 1 : 0;
      const raidPoints = touched.length + bonus;
      const stats = raider ? line(raider) : newPlayerLine();
      stats.raids += 1;
      entry.do_or_die = doOrDie;

      if (raidPoints === 0 && doOrDie) {
        // A do-or-die raid that scores nothing: the raider is out and the defenders get a point.
        entry.outs = takeOut(sides[raiding], raider ? [raider] : []);
        add(defending, DO_OR_DIE_FAIL_POINTS);
        entry.revived.push(...revive(sides[defending], DO_OR_DIE_FAIL_POINTS));
        checkAllOut(defending, raiding, entry.outs.length);
        sides[raiding].empty_raids = 0;
      } else {
        entry.outs = takeOut(sides[defending], touched);
        add(raiding, raidPoints);
        entry.revived.push(...revive(sides[raiding], entry.outs.length));
        checkAllOut(raiding, defending, entry.outs.length);
        entry.empty = raidPoints === 0;
        entry.super_raid = raidPoints >= config.super_raid_min_points;
        sides[raiding].empty_raids = raidPoints === 0 ? sides[raiding].empty_raids + 1 : 0;
        if (raidPoints > 0) stats.successful_raids += 1;
        stats.raid_points += raidPoints;
        stats.bonus_points += bonus;
        if (entry.super_raid) stats.super_raids += 1;
      }
      lastRaid = event;
    } else if (event.type === 'tackle') {
      const defendersBefore = sides[defending].on_court.length;
      entry.super_tackle = config.super_tackle_enabled && defendersBefore <= config.super_tackle_threshold;
      entry.do_or_die = config.do_or_die_enabled && sides[raiding].empty_raids >= config.do_or_die_after_empty_raids;
      const tacklePoints = entry.super_tackle ? config.super_tackle_points : TACKLE_POINTS;

      entry.outs = takeOut(sides[raiding], raider ? [raider] : []);
      add(defending, tacklePoints);
      entry.revived.push(...revive(sides[defending], tacklePoints));
      checkAllOut(defending, raiding, entry.outs.length);
      sides[raiding].empty_raids = 0;

      if (raider) line(raider).raids += 1;
      const tackler = idOf(event.tackler);
      if (tackler) {
        const stats = line(tackler);
        stats.tackles += 1;
        stats.tackle_points += tacklePoints;
        if (entry.super_tackle) stats.super_tackles += 1;
      }
      lastRaid = event;
    } else if (event.type === 'technical' || event.type === 'correction') {
      add(event.team, event.points ?? 0);
    } else if (event.type === 'substitution') {
      const side = sides[event.team];
      const outgoing = idOf(event.player_out);
      const incoming = idOf(event.player_in);
      const index = side.on_court.indexOf(outgoing);
      if (index !== -1 && incoming) {
        side.on_court[index] = incoming;
        side.bench = side.bench.filter((id) => id !== incoming);
        side.subbed_off.push(outgoing);
      }
    }

    entry.score_after = { ...score };
    timeline.push(entry);
  }

  // Houses take turns to raid. The house that did not raid first opens the second half.
  const period = fixture.clock?.period;
  let nextTeam = null;
  if (fixture.first_raid && (period === 'first_half' || period === 'second_half')) {
    const opener = period === 'first_half' ? fixture.first_raid : otherTeam(fixture.first_raid);
    nextTeam = lastRaid && lastRaid.half === period ? otherTeam(lastRaid.team) : opener;
  }
  const next_raid = nextTeam
    ? {
        team: nextTeam,
        do_or_die: config.do_or_die_enabled && sides[nextTeam].empty_raids >= config.do_or_die_after_empty_raids,
      }
    : null;

  return { score, sides, timeline, players, next_raid };
}

export function determineWinner(team1Score, team2Score) {
  if (team1Score > team2Score) return 'team1';
  if (team2Score > team1Score) return 'team2';
  return 'draw';
}

/**
 * Seconds played in the current half, including the running stretch.
 */
export function computeElapsedSeconds(clock, now = new Date()) {
  if (!clock) return 0;
  let elapsed = clock.elapsed_seconds || 0;
  if (clock.is_running && clock.resumed_at) {
    elapsed += Math.max(0, Math.floor((now.getTime() - new Date(clock.resumed_at).getTime()) / 1000));
  }
  return elapsed;
}
