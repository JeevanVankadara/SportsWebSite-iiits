import mongoose from 'mongoose';
import { schemaOptions } from '../../schemaOptions.js';
import { SET_STATUSES, TEAMS } from './constants.js';

const { ObjectId } = mongoose.Schema.Types;

// badminton set: the points of one set of a match. Live scoring only ever updates this small document.
const setSchema = new mongoose.Schema(
  {
    match: { type: ObjectId, ref: 'BadmintonMatch', required: true },
    fixture: { type: ObjectId, ref: 'BadmintonFixture', required: true },
    set_no: { type: Number, required: true, min: 1, max: 3 },
    team1_points: { type: Number, default: 0, min: 0 },
    team2_points: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: SET_STATUSES, default: 'live' },
    // null when the set was cut short because the match was abandoned.
    winner: { type: String, enum: TEAMS, default: null },
    started_at: Date,
    ended_at: Date,
  },
  schemaOptions,
);

setSchema.index({ match: 1, set_no: 1 }, { unique: true });
setSchema.index({ fixture: 1 });

export const BadmintonSet = mongoose.model('BadmintonSet', setSchema, 'badminton_sets');
