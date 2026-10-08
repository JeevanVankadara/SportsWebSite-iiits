// Shared by the throwball models, rules, validators and controllers.
//
// A throwball fixture is a single match played as best of 3 sets. Each house puts 5 players on
// court and keeps up to 3 substitutes. Live scoring is a + / - tap on the set in play, the same as
// badminton; substitutions are logged as events and shown to viewers like kabaddi's match log.

export const TEAMS = ['team1', 'team2'];

export const FIXTURE_STATUSES = ['scheduled', 'live', 'completed'];
export const FIXTURE_RESULTS = ['team1', 'team2', 'draw'];
// normal = played to the end; abandoned = stopped early and decided by the referee, with a note.
export const RESULT_TYPES = ['normal', 'abandoned'];
export const SET_STATUSES = ['live', 'completed'];

// The only event a throwball match logs.
export const EVENT_TYPES = ['substitution'];

// Best of 3: a house wins the match once it has won 2 sets.
export const DEFAULT_CONFIG = { points_to_win: 15, point_cap: 17, players_on_court: 7, max_substitutes: 5, match_sets: 3 };

export const PLAYERS_ON_COURT_MIN = 1;
export const PLAYERS_ON_COURT_MAX = 20;
export const MAX_SUBSTITUTES_MIN = 0;
export const MAX_SUBSTITUTES_MAX = 20;
export const MATCH_SETS_MIN = 1;
export const MATCH_SETS_MAX = 9;

export const POINTS_TO_WIN_MIN = 5;
export const POINTS_TO_WIN_MAX = 99;
// The cap can be as low as the target (sudden win at the target) or well above it for long deuces.
export const POINT_CAP_MAX_OVER = 50;

// League table points for one fixture, as in the badminton team event.
export const TABLE_POINTS = { win: 2, draw: 1, loss: 0 };
