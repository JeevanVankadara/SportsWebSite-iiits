import mongoose from 'mongoose';
import { schemaOptions } from '../../schemaOptions.js';
import {
  DEFAULT_CONFIG,
  EVENT_TYPES,
  FIXTURE_RESULTS,
  FIXTURE_STATUSES,
  MATCH_SETS,
  RESULT_TYPES,
  SET_STATUSES,
  TEAMS,
} from './constants.js';

const { ObjectId } = mongoose.Schema.Types;

// The scoring rules for the fixture. Every set is played to points_to_win, capped at point_cap.
const configSchema = new mongoose.Schema(
  {
    points_to_win: { type: Number, default: DEFAULT_CONFIG.points_to_win },
    point_cap: { type: Number, default: DEFAULT_CONFIG.point_cap },
  },
  { _id: false },
);

// Each house names 5 starters and up to 3 substitutes. Who is on court later is worked out by
// replaying the substitution events over the starters.
const lineupSchema = new mongoose.Schema(
  {
    starters: [{ type: ObjectId, ref: 'Player' }],
    bench: [{ type: ObjectId, ref: 'Player' }],
  },
  { _id: false },
);

// One set of the match. The set in play keeps no stored winner: whether it is won is worked out from
// its score, and it is only closed when the referee taps Next set or Finish match. Same idea as badminton.
const setSchema = new mongoose.Schema(
  {
    set_no: { type: Number, required: true, min: 1, max: MATCH_SETS },
    team1_points: { type: Number, default: 0, min: 0 },
    team2_points: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: SET_STATUSES, default: 'live' },
    // null when the set was cut short because the match was abandoned.
    winner: { type: String, enum: [...TEAMS, null], default: null },
    started_at: Date,
    ended_at: Date,
  },
  { _id: true },
);

// A substitution: a player on court is swapped for one on the bench. Kept in the order they happen so
// the running log and the current court can be rebuilt by replaying them.
const eventSchema = new mongoose.Schema({
  type: { type: String, enum: EVENT_TYPES, required: true },
  team: { type: String, enum: TEAMS, required: true },
  // The set that was in play when the change was made (for the log), or null before the first set.
  set_no: { type: Number, default: null },
  player_out: { type: ObjectId, ref: 'Player', required: true },
  player_in: { type: ObjectId, ref: 'Player', required: true },
  note: { type: String, trim: true, maxlength: 200 },
  created_at: { type: Date, default: Date.now },
});

// volleyball fixture: one house (team 1) against another (team 2), a single match over up to 3 sets.
const fixtureSchema = new mongoose.Schema(
  {
    tournament: { type: ObjectId, ref: 'Tournament', required: true },
    // _id of a house inside tournament.houses
    team1: { type: ObjectId, required: [true, 'Team 1 is required'] },
    team2: { type: ObjectId, required: [true, 'Team 2 is required'] },
    referees: [{ type: ObjectId, ref: 'Player' }],
    // For announcements only: any date is accepted and it never allows or blocks anything.
    scheduled_at: Date,
    status: { type: String, enum: FIXTURE_STATUSES, default: 'scheduled' },

    config: { type: configSchema, default: () => ({}) },

    team1_lineup: { type: lineupSchema, default: () => ({ starters: [], bench: [] }) },
    team2_lineup: { type: lineupSchema, default: () => ({ starters: [], bench: [] }) },
    // When each house's lineup was submitted by the referee. Once both are in, play can start.
    slips: {
      team1_submitted_at: Date,
      team2_submitted_at: Date,
    },
    lineup_locked_at: Date,

    sets: { type: [setSchema], default: [] },
    events: { type: [eventSchema], default: [] },

    // Kept up to date from the sets whenever a score changes.
    team1_sets_won: { type: Number, default: 0 },
    team2_sets_won: { type: Number, default: 0 },

    result: { type: String, enum: [...FIXTURE_RESULTS, null], default: null },
    // abandoned = the referee decided the fixture before it finished; note says why.
    result_type: { type: String, enum: RESULT_TYPES, default: 'normal' },
    note: { type: String, trim: true, maxlength: [500, 'Note must be 500 characters or fewer'] },
    completed_at: Date,
  },
  schemaOptions,
);

fixtureSchema.index({ tournament: 1, status: 1 });
fixtureSchema.index({ referees: 1 });

fixtureSchema.pre('validate', function () {
  if (this.team1 && this.team2 && this.team1.equals(this.team2)) {
    this.invalidate('team2', 'A house cannot play against itself');
  }
});

export const VolleyballFixture = mongoose.model('VolleyballFixture', fixtureSchema, 'volleyball_fixtures');
