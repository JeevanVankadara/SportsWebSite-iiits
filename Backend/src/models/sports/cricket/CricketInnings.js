import mongoose from 'mongoose';
import { schemaOptions } from '../../schemaOptions.js';
import { BATTER_STATUSES, COMPLETE_REASONS, DISMISSALS, INNINGS_STATUSES, MAX_UNDO, TEAMS } from './constants.js';

const { ObjectId } = mongoose.Schema.Types;

const dismissalSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: DISMISSALS, required: true },
    bowler: { type: ObjectId, ref: 'Player', default: null },
    fielder: { type: ObjectId, ref: 'Player', default: null },
  },
  { _id: false },
);

const battingSchema = new mongoose.Schema(
  {
    player: { type: ObjectId, ref: 'Player', required: true },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    status: { type: String, enum: BATTER_STATUSES, default: 'batting' },
    dismissal: { type: dismissalSchema, default: null },
  },
  { _id: false },
);

const bowlingSchema = new mongoose.Schema(
  {
    player: { type: ObjectId, ref: 'Player', required: true },
    balls: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    no_balls: { type: Number, default: 0 },
  },
  { _id: false },
);

const fallOfWicketSchema = new mongoose.Schema(
  {
    wicket_no: { type: Number, required: true },
    runs: { type: Number, required: true },
    balls: { type: Number, required: true },
    player: { type: ObjectId, ref: 'Player', required: true },
  },
  { _id: false },
);

// cricket innings: live state of the crease plus the scorecard, which is rebuilt from
// cricket_balls after every change so an undo can never leave a wrong total behind.
const inningsSchema = new mongoose.Schema(
  {
    fixture: { type: ObjectId, ref: 'CricketFixture', required: true },
    tournament: { type: ObjectId, ref: 'Tournament', required: true },
    innings_no: { type: Number, required: true, min: 1 },
    // 0 for the match itself, 1 for the first super over, and so on.
    super_over: { type: Number, default: 0 },
    batting_team: { type: String, enum: TEAMS, required: true },
    bowling_team: { type: String, enum: TEAMS, required: true },
    overs: { type: Number, required: true },
    max_wickets: { type: Number, required: true },
    powerplay_overs: { type: Number, default: 0 },
    target: { type: Number, default: null },
    status: { type: String, enum: INNINGS_STATUSES, default: 'live' },

    // null means the referee still has to pick someone (after a wicket or an over).
    striker: { type: ObjectId, ref: 'Player', default: null },
    non_striker: { type: ObjectId, ref: 'Player', default: null },
    bowler: { type: ObjectId, ref: 'Player', default: null },
    free_hit: { type: Boolean, default: false },
    ball_count: { type: Number, default: 0 },
    undo_left: { type: Number, default: 0, min: 0, max: MAX_UNDO },

    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    legal_balls: { type: Number, default: 0 },
    extras: {
      wides: { type: Number, default: 0 },
      no_balls: { type: Number, default: 0 },
      byes: { type: Number, default: 0 },
      leg_byes: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    powerplay: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
    },
    batting: { type: [battingSchema], default: [] },
    bowling: { type: [bowlingSchema], default: [] },
    fall_of_wickets: { type: [fallOfWicketSchema], default: [] },
    this_over: { type: [String], default: [] },
    this_over_no: { type: Number, default: 1 },
    previous_bowler: { type: ObjectId, ref: 'Player', default: null },
    complete_reason: { type: String, enum: COMPLETE_REASONS, default: null },

    started_at: Date,
    ended_at: Date,
  },
  schemaOptions,
);

inningsSchema.index({ fixture: 1, innings_no: 1 }, { unique: true });

export const CricketInnings = mongoose.model('CricketInnings', inningsSchema, 'cricket_innings');
