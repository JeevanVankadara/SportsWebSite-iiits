import mongoose from 'mongoose';
import { schemaOptions } from '../../schemaOptions.js';
import {
  MATCH_STATUSES,
  MATCH_TYPES,
  POINTS_TO_WIN_OPTIONS,
  RESULT_TYPES,
  SETS_COUNT_OPTIONS,
  TEAMS,
} from './constants.js';

const { ObjectId } = mongoose.Schema.Types;

// badminton match: one singles or doubles match inside a fixture, played over 1 or 3 sets.
const matchSchema = new mongoose.Schema(
  {
    fixture: { type: ObjectId, ref: 'BadmintonFixture', required: true },
    tournament: { type: ObjectId, ref: 'Tournament', required: true },
    match_no: { type: Number, required: true, min: 1 },
    type: { type: String, enum: MATCH_TYPES, required: true },

    sets_count: {
      type: Number,
      required: true,
      validate: { validator: (value) => SETS_COUNT_OPTIONS.includes(value), message: 'A match has 1 or 3 sets' },
    },
    points_to_win: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => POINTS_TO_WIN_OPTIONS.includes(value),
        message: 'A set is played to 21, 15 or 11 points',
      },
    },
    point_cap: { type: Number, required: true },

    // From the slips: 1 player each for singles, 2 each for doubles.
    team1_players: [{ type: ObjectId, ref: 'Player' }],
    team2_players: [{ type: ObjectId, ref: 'Player' }],

    sets: [{ type: ObjectId, ref: 'BadmintonSet' }],
    team1_sets_won: { type: Number, default: 0 },
    team2_sets_won: { type: Number, default: 0 },

    status: { type: String, enum: MATCH_STATUSES, default: 'pending' },
    result_type: { type: String, enum: RESULT_TYPES },
    // null on a completed match means it was declared a draw (only possible when abandoned).
    winner: { type: String, enum: TEAMS, default: null },
    note: { type: String, trim: true, maxlength: [500, 'Note must be 500 characters or fewer'] },
    started_at: Date,
    ended_at: Date,
  },
  schemaOptions,
);

matchSchema.index({ fixture: 1, match_no: 1 }, { unique: true });
matchSchema.index({ team1_players: 1 });
matchSchema.index({ team2_players: 1 });

export const BadmintonMatch = mongoose.model('BadmintonMatch', matchSchema, 'badminton_matches');
