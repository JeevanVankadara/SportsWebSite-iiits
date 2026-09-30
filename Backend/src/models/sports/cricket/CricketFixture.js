import mongoose from 'mongoose';
import { schemaOptions } from '../../schemaOptions.js';
import {
  FIXTURE_RESULTS,
  FIXTURE_STATUSES,
  INNINGS_STATUSES,
  MARGIN_TYPES,
  MAX_OVERS,
  MIN_OVERS,
  RESULT_TYPES,
  TEAMS,
  TOSS_DECISIONS,
} from './constants.js';

const { ObjectId } = mongoose.Schema.Types;

// Quick view of each innings, so fixture lists can show the score without loading the innings.
const inningsSummarySchema = new mongoose.Schema(
  {
    innings: { type: ObjectId, ref: 'CricketInnings', required: true },
    innings_no: { type: Number, required: true },
    super_over: { type: Number, default: 0 },
    batting_team: { type: String, enum: TEAMS, required: true },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    legal_balls: { type: Number, default: 0 },
    status: { type: String, enum: INNINGS_STATUSES, required: true },
  },
  { _id: false },
);

const marginSchema = new mongoose.Schema(
  {
    by: { type: String, enum: MARGIN_TYPES, required: true },
    value: { type: Number, default: 0 },
  },
  { _id: false },
);

const playerList = () => ({ type: [{ type: ObjectId, ref: 'Player' }], default: [] });

// cricket fixture: one match between two houses of a tournament.
const fixtureSchema = new mongoose.Schema(
  {
    tournament: { type: ObjectId, ref: 'Tournament', required: true },
    team1: { type: ObjectId, required: [true, 'Team 1 is required'] },
    team2: { type: ObjectId, required: [true, 'Team 2 is required'] },
    referees: [{ type: ObjectId, ref: 'Player' }],
    scheduled_at: Date,
    status: { type: String, enum: FIXTURE_STATUSES, default: 'scheduled' },

    // Set by the referee before the toss. Locked once the first innings starts.
    overs: { type: Number, min: MIN_OVERS, max: MAX_OVERS, default: null },
    powerplay_overs: { type: Number, min: 0, default: 0 },
    team1_players: playerList(),
    team1_substitutes: playerList(),
    team2_players: playerList(),
    team2_substitutes: playerList(),
    toss: {
      winner: { type: String, enum: TEAMS },
      decision: { type: String, enum: TOSS_DECISIONS },
    },

    innings: { type: [inningsSummarySchema], default: [] },
    // The referee chose to finish a tied match instead of playing (another) super over.
    tie_accepted: { type: Boolean, default: false },

    // Rebuilt from the innings whenever they change.
    result: { type: String, enum: FIXTURE_RESULTS, default: null },
    margin: { type: marginSchema, default: null },
    result_type: { type: String, enum: RESULT_TYPES, default: 'normal' },
    note: { type: String, trim: true, maxlength: [500, 'Note must be 500 characters or fewer'] },
    completed_at: Date,
  },
  schemaOptions,
);

fixtureSchema.index({ tournament: 1, status: 1 });
fixtureSchema.index({ referees: 1 });
fixtureSchema.index({ team1_players: 1 });
fixtureSchema.index({ team2_players: 1 });

fixtureSchema.pre('validate', function () {
  if (this.team1 && this.team2 && this.team1.equals(this.team2)) {
    this.invalidate('team2', 'A house cannot play against itself');
  }
  if (this.overs && this.powerplay_overs > this.overs) {
    this.invalidate('powerplay_overs', 'The powerplay cannot be longer than the innings');
  }
  const everyone = [
    ...this.team1_players,
    ...this.team1_substitutes,
    ...this.team2_players,
    ...this.team2_substitutes,
  ].map(String);
  if (new Set(everyone).size !== everyone.length) {
    this.invalidate('team2_players', 'A player can be named only once in a fixture');
  }
});

export const CricketFixture = mongoose.model('CricketFixture', fixtureSchema, 'cricket_fixtures');
