import mongoose from 'mongoose';
import { schemaOptions } from '../../schemaOptions.js';
import { FIXTURE_RESULTS, FIXTURE_STATUSES, MATCH_TYPES, RESULT_TYPES } from './constants.js';

const { ObjectId } = mongoose.Schema.Types;

// Quick view of each match in the fixture, so the fixture alone shows how many matches
// there are and how many sets each one has. The full match lives in badminton_matches.
const matchSummarySchema = new mongoose.Schema(
  {
    match: { type: ObjectId, ref: 'BadmintonMatch', required: true },
    match_no: { type: Number, required: true },
    type: { type: String, enum: MATCH_TYPES, required: true },
    sets_count: { type: Number, required: true },
  },
  { _id: false },
);

// badminton fixture: one house (team 1) against another (team 2) in a tournament.
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

    match_count: { type: Number, default: 0 },
    matches: [matchSummarySchema],
    // When each house's slip was submitted by the referee. Once both are in, the lineup is locked:
    // play can start, and only the referees may still correct it.
    slips: {
      team1_submitted_at: Date,
      team2_submitted_at: Date,
    },
    lineup_locked_at: Date,

    // Kept up to date from the matches whenever a result changes.
    team1_matches_won: { type: Number, default: 0 },
    team2_matches_won: { type: Number, default: 0 },
    result: { type: String, enum: FIXTURE_RESULTS, default: null },
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

export const BadmintonFixture = mongoose.model('BadmintonFixture', fixtureSchema, 'badminton_fixtures');
