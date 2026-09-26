// Shared by the badminton models, rules and validators.

export const TEAMS = ['team1', 'team2'];
export const MATCH_TYPES = ['singles', 'doubles'];
export const SETS_COUNT_OPTIONS = [1, 3];
export const POINTS_TO_WIN_OPTIONS = [21, 15, 11];

// Score at which the next point wins a set, however close it is.
// 21 -> 30 is the BWF rule, 15 -> 21 is BWF's 3x15 system, 11 -> 15 follows BWF's old 5x11 trial.
export const POINT_CAPS = { 21: 30, 15: 21, 11: 15 };

export const MAX_MATCHES_PER_FIXTURE = 9;

export const FIXTURE_STATUSES = ['scheduled', 'live', 'completed'];
export const FIXTURE_RESULTS = ['team1', 'team2', 'draw'];
export const MATCH_STATUSES = ['pending', 'live', 'completed', 'not_played'];
export const SET_STATUSES = ['live', 'completed'];

// normal = played to the end; abandoned = stopped early and decided by the referee, with a note.
export const RESULT_TYPES = ['normal', 'abandoned'];

// League table points for one fixture.
export const TABLE_POINTS = { win: 2, draw: 1, loss: 0 };
