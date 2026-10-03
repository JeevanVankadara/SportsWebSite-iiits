import mongoose from 'mongoose';
import { stageField } from '../../fixtureStage.js';
import { schemaOptions } from '../../schemaOptions.js';
import {
  DEFAULT_CONFIG,
  EVENT_TYPES,
  FIXTURE_RESULTS,
  FIXTURE_STATUSES,
  PERIODS,
  PLAYING_PERIODS,
  RESULT_TYPES,
  TEAMS,
} from './constants.js';

const { ObjectId } = mongoose.Schema.Types;

const configSchema = new mongoose.Schema(
  {
    players_on_court: { type: Number, default: DEFAULT_CONFIG.players_on_court, min: 3, max: 12 },
    max_substitutes: { type: Number, default: DEFAULT_CONFIG.max_substitutes, min: 0, max: 10 },
    half_duration_minutes: { type: Number, default: DEFAULT_CONFIG.half_duration_minutes, min: 1, max: 60 },
    all_out_points: { type: Number, default: DEFAULT_CONFIG.all_out_points, min: 0, max: 10 },
    bonus_enabled: { type: Boolean, default: DEFAULT_CONFIG.bonus_enabled },
    super_tackle_enabled: { type: Boolean, default: DEFAULT_CONFIG.super_tackle_enabled },
    super_tackle_threshold: { type: Number, default: DEFAULT_CONFIG.super_tackle_threshold, min: 1, max: 12 },
    super_tackle_points: { type: Number, default: DEFAULT_CONFIG.super_tackle_points, min: 1, max: 5 },
    super_raid_min_points: { type: Number, default: DEFAULT_CONFIG.super_raid_min_points, min: 2, max: 12 },
    do_or_die_enabled: { type: Boolean, default: DEFAULT_CONFIG.do_or_die_enabled },
    do_or_die_after_empty_raids: { type: Number, default: DEFAULT_CONFIG.do_or_die_after_empty_raids, min: 1, max: 10 },
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

// Counts down each half. elapsed_seconds is the time played in the current half.
const clockSchema = new mongoose.Schema(
  {
    period: { type: String, enum: PERIODS, default: 'not_started' },
    is_running: { type: Boolean, default: false },
    resumed_at: { type: Date, default: null },
    elapsed_seconds: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

// team is the raiding house for raids and tackles, and the house concerned for everything else.
const eventSchema = new mongoose.Schema({
  type: { type: String, enum: EVENT_TYPES, required: true },
  half: { type: String, enum: [...PLAYING_PERIODS, 'completed'], required: true },
  team: { type: String, enum: TEAMS, required: true },
  raider: { type: ObjectId, ref: 'Player', default: null },
  // Raids: every defender who went out, touched or stepped out, in the order they went out
  // (the first one out is the first one revived). stepped_out marks the ones who crossed the line.
  touched: [{ type: ObjectId, ref: 'Player' }],
  stepped_out: [{ type: ObjectId, ref: 'Player' }],
  bonus: { type: Boolean, default: false },
  tackler: { type: ObjectId, ref: 'Player', default: null },
  assists: [{ type: ObjectId, ref: 'Player' }],
  points: { type: Number, default: 0 },
  defending_points: { type: Number, default: 0 },
  is_self_out: { type: Boolean, default: false },
  player_out: { type: ObjectId, ref: 'Player', default: null },
  player_in: { type: ObjectId, ref: 'Player', default: null },
  note: { type: String, trim: true, maxlength: 200 },
  created_at: { type: Date, default: Date.now },
});

const playerStatsSchema = new mongoose.Schema(
  {
    player: { type: ObjectId, ref: 'Player', required: true },
    name: { type: String, trim: true },
    is_starter: { type: Boolean, default: false },
    raids: { type: Number, default: 0 },
    successful_raids: { type: Number, default: 0 },
    touch_points: { type: Number, default: 0 },
    bonus_points: { type: Number, default: 0 },
    raid_points: { type: Number, default: 0 },
    super_raids: { type: Number, default: 0 },
    tackles: { type: Number, default: 0 },
    tackle_points: { type: Number, default: 0 },
    super_tackles: { type: Number, default: 0 },
    total_points: { type: Number, default: 0 },
  },
  { _id: false },
);

const halfTeamStatsSchema = new mongoose.Schema(
  {
    total_points: { type: Number, default: 0 },
    raid_points: { type: Number, default: 0 },
    tackle_points: { type: Number, default: 0 },
    all_out_points: { type: Number, default: 0 },
    extra_points: { type: Number, default: 0 },
  },
  { _id: false },
);

const halfStatsSchema = new mongoose.Schema(
  {
    team1: { type: halfTeamStatsSchema, default: () => ({}) },
    team2: { type: halfTeamStatsSchema, default: () => ({}) },
  },
  { _id: false },
);

const scorecardSchema = new mongoose.Schema(
  {
    team1: { type: [playerStatsSchema], default: [] },
    team2: { type: [playerStatsSchema], default: [] },
    half_stats: {
      first_half: { type: halfStatsSchema, default: () => ({}) },
      second_half: { type: halfStatsSchema, default: () => ({}) },
      full_match: { type: halfStatsSchema, default: () => ({}) },
    },
  },
  { _id: false },
);

const fixtureSchema = new mongoose.Schema(
  {
    tournament: { type: ObjectId, ref: 'Tournament', required: true },
    team1: { type: ObjectId, required: [true, 'Team 1 is required'] },
    team2: { type: ObjectId, required: [true, 'Team 2 is required'] },
    referees: [{ type: ObjectId, ref: 'Player' }],
    scheduled_at: Date,
    // Optional tag line, e.g. semi_final or final (models/fixtureStage.js).
    stage: stageField,
    status: { type: String, enum: FIXTURE_STATUSES, default: 'scheduled' },

    config: { type: configSchema, default: () => ({}) },

    team1_lineup: { type: lineupSchema, default: () => ({ starters: [], bench: [] }) },
    team2_lineup: { type: lineupSchema, default: () => ({ starters: [], bench: [] }) },
    slips: {
      team1_submitted_at: Date,
      team2_submitted_at: Date,
    },
    lineup_locked_at: Date,
    // The house that raids first (toss winner's choice). The other house opens the second half.
    first_raid: { type: String, enum: [...TEAMS, null], default: null },

    clock: { type: clockSchema, default: () => ({}) },

    // Always recalculated from events.
    team1_score: { type: Number, default: 0 },
    team2_score: { type: Number, default: 0 },
    events: { type: [eventSchema], default: [] },

    scorecard: { type: scorecardSchema, default: null },

    result: { type: String, enum: [...FIXTURE_RESULTS, null], default: null },
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

export const KabaddiFixture = mongoose.model('KabaddiFixture', fixtureSchema, 'kabaddi_fixtures');
