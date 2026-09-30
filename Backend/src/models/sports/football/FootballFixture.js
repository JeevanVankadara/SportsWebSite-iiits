import mongoose from 'mongoose';
import { schemaOptions } from '../../schemaOptions.js';
import {
  CARD_TYPES,
  DEFAULT_EXTRA_TIME_MINUTES,
  DEFAULT_HALF_DURATION_MINUTES,
  DEFAULT_MAX_SUBSTITUTES,
  DEFAULT_PLAYERS_PER_TEAM,
  EVENT_TYPES,
  FIXTURE_RESULTS,
  FIXTURE_STATUSES,
  GOAL_TYPES,
  PERIODS,
  RESULT_TYPES,
  TEAMS,
} from './constants.js';

const { ObjectId } = mongoose.Schema.Types;

const configSchema = new mongoose.Schema(
  {
    players_per_team: { type: Number, default: DEFAULT_PLAYERS_PER_TEAM, min: 3, max: 15 },
    max_substitutes: { type: Number, default: DEFAULT_MAX_SUBSTITUTES, min: 0, max: 20 },
    half_duration_minutes: { type: Number, default: DEFAULT_HALF_DURATION_MINUTES, min: 5, max: 60 },
    extra_time_duration_minutes: { type: Number, default: DEFAULT_EXTRA_TIME_MINUTES, min: 0, max: 30 },
    rolling_subs: { type: Boolean, default: true },
  },
  { _id: false },
);

const lineupSchema = new mongoose.Schema(
  {
    starters: [{ type: ObjectId, ref: 'Player' }],
    bench: [{ type: ObjectId, ref: 'Player' }],
  },
  { _id: false },
);

const clockSchema = new mongoose.Schema(
  {
    period: { type: String, enum: PERIODS, default: 'not_started' },
    is_running: { type: Boolean, default: false },
    resumed_at: { type: Date, default: null },
    elapsed_seconds: { type: Number, default: 0, min: 0 },
    stoppage_time_minutes: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const eventSchema = new mongoose.Schema({
  type: { type: String, enum: EVENT_TYPES, required: true },
  minute: { type: Number, required: true, min: 0 },
  period: { type: String, enum: PERIODS, required: true },
  team: { type: String, enum: TEAMS, required: true },
  player: { type: ObjectId, ref: 'Player', default: null },
  assist_player: { type: ObjectId, ref: 'Player', default: null },
  player_out: { type: ObjectId, ref: 'Player', default: null },
  player_in: { type: ObjectId, ref: 'Player', default: null },
  goal_type: { type: String, enum: GOAL_TYPES, default: 'regular' },
  card_type: { type: String, enum: CARD_TYPES, default: null },
  note: { type: String, trim: true, maxlength: 200 },
  created_at: { type: Date, default: Date.now },
});

const fixtureSchema = new mongoose.Schema(
  {
    tournament: { type: ObjectId, ref: 'Tournament', required: true },
    team1: { type: ObjectId, required: [true, 'Team 1 is required'] },
    team2: { type: ObjectId, required: [true, 'Team 2 is required'] },
    referees: [{ type: ObjectId, ref: 'Player' }],
    scheduled_at: Date,
    status: { type: String, enum: FIXTURE_STATUSES, default: 'scheduled' },

    config: { type: configSchema, default: () => ({}) },

    team1_lineup: { type: lineupSchema, default: () => ({ starters: [], bench: [] }) },
    team2_lineup: { type: lineupSchema, default: () => ({ starters: [], bench: [] }) },
    slips: {
      team1_submitted_at: Date,
      team2_submitted_at: Date,
    },
    lineup_locked_at: Date,

    clock: { type: clockSchema, default: () => ({}) },

    team1_score: { type: Number, default: 0, min: 0 },
    team2_score: { type: Number, default: 0, min: 0 },
    events: { type: [eventSchema], default: [] },

    result: { type: String, enum: FIXTURE_RESULTS, default: null },
    result_type: { type: String, enum: RESULT_TYPES, default: 'normal' },
    decision_note: { type: String, trim: true, maxlength: [500, 'Note must be 500 characters or fewer'] },
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

export const FootballFixture = mongoose.model('FootballFixture', fixtureSchema, 'football_fixtures');
