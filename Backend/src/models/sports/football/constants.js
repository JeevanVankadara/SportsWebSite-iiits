// Shared by football models, rules, validators, and controllers.

export const TEAMS = ['team1', 'team2'];

export const FIXTURE_STATUSES = ['scheduled', 'live', 'completed'];
export const FIXTURE_RESULTS = ['team1', 'team2', 'draw'];
export const RESULT_TYPES = ['normal', 'abandoned'];

export const PERIODS = [
  'not_started',
  'first_half',
  'half_time',
  'second_half',
  'extra_time_first_half',
  'extra_time_half_time',
  'extra_time_second_half',
  'penalties',
  'completed',
];

export const EVENT_TYPES = ['goal', 'yellow_card', 'red_card', 'substitution'];
export const GOAL_TYPES = ['regular', 'penalty', 'own_goal'];
export const CARD_TYPES = ['yellow', 'red', 'second_yellow'];

export const PLAYERS_PER_TEAM_OPTIONS = [5, 6, 7, 8, 9, 10, 11];
export const DEFAULT_PLAYERS_PER_TEAM = 8;
export const DEFAULT_MAX_SUBSTITUTES = 5;
export const DEFAULT_HALF_DURATION_MINUTES = 20;
export const DEFAULT_EXTRA_TIME_MINUTES = 0;

// Standard football league table points.
export const TABLE_POINTS = { win: 3, draw: 1, loss: 0 };
