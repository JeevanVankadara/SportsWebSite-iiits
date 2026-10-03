// Kabaddi rules and pure computation functions. No database calls.
//
// Nothing about the match state is stored: who is on court, who is out, the revival queue and
// the score are all rebuilt by replaying the events in order. Deleting an event (undo) therefore
// puts everything back exactly as it would have been without it.
import {
  DEFAULT_CONFIG,
  DO_OR_DIE_FAIL_POINTS,
  LINE_OUT_POINTS,
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

function startingSide(lineup, defaultCourt = 7) {
  const starters = idsOf(lineup?.starters);
  return {
    on_court: starters,
    out: [],
    bench: idsOf(lineup?.bench),
    subbed_off: [],
    empty_raids: 0,
    on_mat_count: starters.length || defaultCourt,
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
 *  - sides: per house { on_court, out, bench, subbed_off, empty_raids, on_mat_count }
 *  - timeline: per event { event_id, points: { team1, team2 }, outs, line_outs, revived, all_out,
 *              super_raid, super_tackle, do_or_die, empty, score_after }
 *  - players: per player id { raids, raid_points, tackle_points, ... }
 *  - next_raid: { team, do_or_die } for the current half
 */
export function replayMatch(fixture) {
  const config = fixtureConfig(fixture);
  const maxCourt = config.players_on_court || 7;
  const sides = {
    team1: startingSide(fixture.team1_lineup, maxCourt),
    team2: startingSide(fixture.team2_lineup, maxCourt),
  };
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
      line_outs: [],
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

    const raiding = event.team;
    const defending = otherTeam(raiding);
    const raider = idOf(event.raider);

    if (event.type === 'raid') {
      const doOrDie = config.do_or_die_enabled && sides[raiding].empty_raids >= config.do_or_die_after_empty_raids;
      entry.do_or_die = doOrDie;
      const stats = raider ? line(raider) : newPlayerLine();
      stats.raids += 1;

      const defendersBefore = sides[defending].on_mat_count ?? sides[defending].on_court.length;
      const isCounter = event.points != null || event.defending_points != null;
      const bonus = event.bonus ? 1 : 0;
      let raidPoints = 0;
      let housePoints = 0;
      let outsCount = 0;

      if (isCounter) {
        const touchPts = Math.max(0, event.points || 0);
        raidPoints = touchPts + bonus;
        housePoints = raidPoints;
        outsCount = touchPts;
        // Keep all players in on_court so raider selection is not restricted; reduce on_mat_count
        sides[defending].on_mat_count = Math.max(0, (sides[defending].on_mat_count ?? maxCourt) - touchPts);
      } else {
        const touched = idsOf(event.touched);
        const steppedOut = new Set(idsOf(event.stepped_out));
        entry.line_outs = touched.filter((id) => steppedOut.has(id));
        raidPoints = touched.length - entry.line_outs.length + bonus;
        housePoints = raidPoints + entry.line_outs.length * LINE_OUT_POINTS;
        const outsDefending = takeOut(sides[defending], touched);
        outsCount = outsDefending.length;
        entry.outs = [...outsDefending];
        sides[defending].on_mat_count = Math.max(0, (sides[defending].on_mat_count ?? maxCourt) - outsCount);
      }

      const defendingPoints = Math.max(0, event.defending_points || 0);

      if (housePoints === 0 && defendingPoints === 0 && doOrDie) {
        // A do-or-die raid that scores nothing: raider is out, defenders get 1 point
        sides[raiding].on_mat_count = Math.max(0, (sides[raiding].on_mat_count ?? maxCourt) - 1);
        add(defending, DO_OR_DIE_FAIL_POINTS);
        sides[defending].on_mat_count = Math.min(maxCourt, (sides[defending].on_mat_count ?? 0) + DO_OR_DIE_FAIL_POINTS);
        if (sides[raiding].on_mat_count === 0) {
          add(defending, config.all_out_points);
          sides[defending].on_mat_count = Math.min(maxCourt, (sides[defending].on_mat_count ?? 0) + config.all_out_points);
          sides[raiding].on_mat_count = maxCourt;
          entry.all_out = raiding;
        }
        sides[raiding].empty_raids = 0;
      } else {
        if (housePoints > 0) {
          add(raiding, housePoints);
          sides[raiding].on_mat_count = Math.min(maxCourt, (sides[raiding].on_mat_count ?? 0) + outsCount);
          if (sides[defending].on_mat_count === 0) {
            add(raiding, config.all_out_points);
            sides[raiding].on_mat_count = Math.min(maxCourt, (sides[raiding].on_mat_count ?? 0) + config.all_out_points);
            sides[defending].on_mat_count = maxCourt;
            entry.all_out = defending;
          }
          stats.successful_raids += 1;
        }

        entry.empty = housePoints === 0 && defendingPoints === 0;
        entry.super_raid = raidPoints >= config.super_raid_min_points;
        sides[raiding].empty_raids = entry.empty ? sides[raiding].empty_raids + 1 : 0;
        stats.raid_points += raidPoints;
        stats.bonus_points += bonus;
        stats.touch_points += Math.max(0, raidPoints - bonus);
        if (entry.super_raid) stats.super_raids += 1;

        if (defendingPoints > 0) {
          const isSuperTackle =
            config.super_tackle_enabled &&
            defendersBefore <= config.super_tackle_threshold &&
            defendingPoints >= config.super_tackle_points;
          entry.super_tackle = isSuperTackle;

          add(defending, defendingPoints);
          // In Kabaddi (AKFI/PKL), a Super Tackle awards 2 points, but only 1 player is revived
          const defRevivals = 1;
          sides[defending].on_mat_count = Math.min(maxCourt, (sides[defending].on_mat_count ?? 0) + defRevivals);
          sides[raiding].on_mat_count = Math.max(0, (sides[raiding].on_mat_count ?? maxCourt) - 1);

          if (sides[raiding].on_mat_count === 0) {
            add(defending, config.all_out_points);
            sides[defending].on_mat_count = Math.min(maxCourt, (sides[defending].on_mat_count ?? 0) + config.all_out_points);
            sides[raiding].on_mat_count = maxCourt;
            entry.all_out = raiding;
          }

          const tackler = idOf(event.tackler);
          if (tackler && !event.is_self_out) {
            const tacklerStats = line(tackler);
            tacklerStats.tackles += 1;
            tacklerStats.tackle_points += defendingPoints;
            if (isSuperTackle) tacklerStats.super_tackles += 1;
          }
        }
      }
      lastRaid = event;
    } else if (event.type === 'tackle') {
      const defendersBefore = sides[defending].on_mat_count ?? sides[defending].on_court.length;
      entry.super_tackle = config.super_tackle_enabled && defendersBefore <= config.super_tackle_threshold;
      entry.do_or_die = config.do_or_die_enabled && sides[raiding].empty_raids >= config.do_or_die_after_empty_raids;
      const tacklePoints = entry.super_tackle ? config.super_tackle_points : TACKLE_POINTS;

      sides[raiding].on_mat_count = Math.max(0, (sides[raiding].on_mat_count ?? maxCourt) - 1);
      add(defending, tacklePoints);
      sides[defending].on_mat_count = Math.min(maxCourt, (sides[defending].on_mat_count ?? 0) + 1);
      if (sides[raiding].on_mat_count === 0) {
        add(defending, config.all_out_points);
        sides[defending].on_mat_count = Math.min(maxCourt, (sides[defending].on_mat_count ?? 0) + config.all_out_points);
        sides[raiding].on_mat_count = maxCourt;
        entry.all_out = raiding;
      }
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
    } else if (event.type === 'line_out') {
      // The raider stepped out of bounds: the raider is out and the defenders get the point.
      // It still counts as the raiding house's raid, so the next raid goes to the other house.
      entry.do_or_die = config.do_or_die_enabled && sides[raiding].empty_raids >= config.do_or_die_after_empty_raids;
      sides[raiding].on_mat_count = Math.max(0, (sides[raiding].on_mat_count ?? maxCourt) - 1);
      add(defending, LINE_OUT_POINTS);
      sides[defending].on_mat_count = Math.min(maxCourt, (sides[defending].on_mat_count ?? 0) + LINE_OUT_POINTS);
      if (sides[raiding].on_mat_count === 0) {
        add(defending, config.all_out_points);
        sides[defending].on_mat_count = Math.min(maxCourt, (sides[defending].on_mat_count ?? 0) + config.all_out_points);
        sides[raiding].on_mat_count = maxCourt;
        entry.all_out = raiding;
      }
      sides[raiding].empty_raids = 0;
      if (raider) line(raider).raids += 1;
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

/**
 * Calculates the complete player scorecard and half-wise comparison statistics.
 * Pure computation function.
 */
export function computeKabaddiScorecardStats(fixture, playersMap = {}) {
  const config = fixtureConfig(fixture);
  const { timeline, players } = replayMatch(fixture);

  const createHalfTeamStats = () => ({
    total_points: 0,
    raid_points: 0,
    tackle_points: 0,
    all_out_points: 0,
    extra_points: 0,
  });

  const half_stats = {
    first_half: { team1: createHalfTeamStats(), team2: createHalfTeamStats() },
    second_half: { team1: createHalfTeamStats(), team2: createHalfTeamStats() },
    full_match: { team1: createHalfTeamStats(), team2: createHalfTeamStats() },
  };

  const addStat = (team, category, pts, half) => {
    if (!pts || pts <= 0) return;
    const targetHalf = half === 'second_half' ? 'second_half' : 'first_half';
    if (half_stats[targetHalf] && half_stats[targetHalf][team]) {
      half_stats[targetHalf][team][category] += pts;
      half_stats[targetHalf][team].total_points += pts;
    }
    half_stats.full_match[team][category] += pts;
    half_stats.full_match[team].total_points += pts;
  };

  (fixture.events ?? []).forEach((event, index) => {
    const entry = timeline[index];
    const half = event.half;
    const raiding = event.team;
    const defending = otherTeam(raiding);

    if (event.type === 'raid') {
      const isCounter = event.points != null || event.defending_points != null;
      let raidPoints = 0;
      let lineOutPoints = 0;
      const defendingPoints = Math.max(0, event.defending_points || 0);

      if (isCounter) {
        const bonus = event.bonus ? 1 : 0;
        raidPoints = Math.max(0, event.points || 0) + bonus;
      } else {
        const touched = idsOf(event.touched);
        const steppedOut = new Set(idsOf(event.stepped_out));
        const lineOuts = touched.filter((id) => steppedOut.has(id));
        const bonus = event.bonus ? 1 : 0;
        raidPoints = touched.length - lineOuts.length + bonus;
        lineOutPoints = lineOuts.length * LINE_OUT_POINTS;
      }
      const housePoints = raidPoints + lineOutPoints;

      if (housePoints === 0 && defendingPoints === 0 && entry?.do_or_die) {
        addStat(defending, 'tackle_points', DO_OR_DIE_FAIL_POINTS, half);
      } else {
        if (raidPoints > 0) addStat(raiding, 'raid_points', raidPoints, half);
        if (lineOutPoints > 0) addStat(raiding, 'extra_points', lineOutPoints, half);
        if (defendingPoints > 0) {
          if (event.is_self_out) {
            addStat(defending, 'extra_points', defendingPoints, half);
          } else {
            addStat(defending, 'tackle_points', defendingPoints, half);
          }
        }
      }
    } else if (event.type === 'tackle') {
      const tacklePoints = entry?.super_tackle ? config.super_tackle_points : TACKLE_POINTS;
      addStat(defending, 'tackle_points', tacklePoints, half);
    } else if (event.type === 'line_out') {
      addStat(defending, 'extra_points', LINE_OUT_POINTS, half);
    } else if (event.type === 'technical' || event.type === 'correction') {
      addStat(event.team, 'extra_points', event.points ?? 0, half);
    }

    if (entry?.all_out) {
      const scoringTeam = otherTeam(entry.all_out);
      addStat(scoringTeam, 'all_out_points', config.all_out_points, half);
    }
  });

  const buildTeamScorecard = (teamKey) => {
    const lineup = fixture[`${teamKey}_lineup`] || {};
    const startersList = idsOf(lineup.starters);
    const benchList = idsOf(lineup.bench);
    const starterSet = new Set(startersList);
    const benchSet = new Set(benchList);
    const seen = new Set();
    const list = [];

    const addPlayer = (id, isStarter) => {
      const idStr = idOf(id);
      if (!idStr || seen.has(idStr)) return;
      seen.add(idStr);
      const st = players[idStr] || newPlayerLine();
      const pName = playersMap[idStr] || (id && typeof id === 'object' && id.name ? id.name : null) || 'Player';
      list.push({
        player: idStr,
        name: pName,
        is_starter: isStarter,
        raids: st.raids || 0,
        successful_raids: st.successful_raids || 0,
        touch_points: Math.max(0, (st.raid_points || 0) - (st.bonus_points || 0)),
        bonus_points: st.bonus_points || 0,
        raid_points: st.raid_points || 0,
        super_raids: st.super_raids || 0,
        tackles: st.tackles || 0,
        tackle_points: st.tackle_points || 0,
        super_tackles: st.super_tackles || 0,
        total_points: (st.raid_points || 0) + (st.tackle_points || 0),
      });
    };

    startersList.forEach((id) => addPlayer(id, true));
    benchList.forEach((id) => addPlayer(id, false));

    // Also include any other players who have stats and belong to this team
    Object.keys(players).forEach((idStr) => {
      if (!seen.has(idStr) && (starterSet.has(idStr) || benchSet.has(idStr))) {
        addPlayer(idStr, false);
      }
    });

    return list;
  };

  return {
    team1: buildTeamScorecard('team1'),
    team2: buildTeamScorecard('team2'),
    half_stats,
  };
}
