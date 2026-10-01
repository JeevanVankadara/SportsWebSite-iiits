// Shared by kabaddi models, rules, validators, and controllers.

export const TEAMS = ['team1', 'team2'];

export const FIXTURE_STATUSES = ['scheduled', 'live', 'completed'];
export const FIXTURE_RESULTS = ['team1', 'team2', 'draw'];
export const RESULT_TYPES = ['normal', 'abandoned'];

export const PERIODS = ['not_started', 'first_half', 'half_time', 'second_half', 'completed'];
export const PLAYING_PERIODS = ['first_half', 'second_half'];

// raid: the raider comes back, with touch points (+ bonus), defenders who stepped out, or nothing.
// tackle: the defenders catch the raider.
// line_out: the raider steps out of bounds; the raider is out and the defenders get a point.
// technical: points given to a house by the referee (e.g. a lobby or time-out violation).
// correction: an admin's plus or minus change to a house's score.
// substitution: a player on court is swapped for one on the bench.
export const EVENT_TYPES = ['raid', 'tackle', 'line_out', 'technical', 'correction', 'substitution'];

// Rules from the Inter UG Kabaddi rule set. Each fixture keeps its own copy, set before the match starts.
export const DEFAULT_CONFIG = {
  players_on_court: 7,
  max_substitutes: 5,
  half_duration_minutes: 20,
  all_out_points: 2,
  bonus_enabled: true,
  super_tackle_enabled: true,
  super_tackle_threshold: 3,
  super_tackle_points: 2,
  super_raid_min_points: 3,
  do_or_die_enabled: false,
  do_or_die_after_empty_raids: 2,
};

export const TACKLE_POINTS = 1;
// A player who steps out of bounds is out, and the other house gets this many points for each one.
export const LINE_OUT_POINTS = 1;
export const DO_OR_DIE_FAIL_POINTS = 1;

// Points table: win 3, draw 1, loss 0. Ties split by point difference, then points scored.
export const TABLE_POINTS = { win: 3, draw: 1, loss: 0 };
