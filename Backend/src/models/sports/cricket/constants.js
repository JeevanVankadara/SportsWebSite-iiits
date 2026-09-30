// Shared by the cricket models, rules and validators.

export const TEAMS = ['team1', 'team2'];
export const TOSS_DECISIONS = ['bat', 'bowl'];

export const PLAYING_XI = 11;
export const MAX_SUBSTITUTES = 3;
export const MIN_OVERS = 1;
export const MAX_OVERS = 50;
export const BALLS_PER_OVER = 6;
export const SUPER_OVER_OVERS = 1;
export const SUPER_OVER_WICKETS = 2;
export const MAX_UNDO = 2;

export const FIXTURE_STATUSES = ['scheduled', 'live', 'completed'];
export const FIXTURE_RESULTS = ['team1', 'team2', 'tie', 'no_result'];
export const DECISION_RESULTS = ['team1', 'team2', 'no_result'];
export const RESULT_TYPES = ['normal', 'abandoned'];
export const MARGIN_TYPES = ['runs', 'wickets', 'super_over'];
export const INNINGS_STATUSES = ['live', 'completed'];
export const COMPLETE_REASONS = ['overs', 'all_out', 'target'];
export const BATTER_STATUSES = ['batting', 'not_out', 'out'];

export const BALL_KINDS = ['run', 'wide', 'no_ball', 'bye', 'leg_bye'];
export const NO_BALL_RUNS_AS = ['bat', 'bye', 'leg_bye'];
export const DISMISSALS = ['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket'];
export const BOWLER_DISMISSALS = ['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'];

export const TABLE_POINTS = { win: 2, tie: 1, no_result: 1, loss: 0 };
