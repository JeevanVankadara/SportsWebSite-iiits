import mongoose from 'mongoose';
import { schemaOptions } from '../../schemaOptions.js';
import { BALL_KINDS, DISMISSALS, NO_BALL_RUNS_AS } from './constants.js';

const { ObjectId } = mongoose.Schema.Types;

const wicketSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: DISMISSALS, required: true },
    player_out: { type: ObjectId, ref: 'Player', required: true },
    fielder: { type: ObjectId, ref: 'Player', default: null },
  },
  { _id: false },
);

// cricket ball: one delivery, the source every innings total is rebuilt from.
// striker, non_striker, bowler and free_hit are the state before the ball, which is what Undo restores.
const ballSchema = new mongoose.Schema(
  {
    innings: { type: ObjectId, ref: 'CricketInnings', required: true },
    fixture: { type: ObjectId, ref: 'CricketFixture', required: true },
    seq: { type: Number, required: true, min: 1 },
    over: { type: Number, required: true, min: 0 },
    striker: { type: ObjectId, ref: 'Player', required: true },
    non_striker: { type: ObjectId, ref: 'Player', required: true },
    bowler: { type: ObjectId, ref: 'Player', required: true },
    free_hit: { type: Boolean, default: false },
    kind: { type: String, enum: BALL_KINDS, required: true },
    // Runs taken or the boundary, never the 1-run wide or no-ball penalty.
    runs: { type: Number, default: 0, min: 0 },
    nb_runs_as: { type: String, enum: NO_BALL_RUNS_AS, default: 'bat' },
    wicket: { type: wicketSchema, default: null },
  },
  schemaOptions,
);

ballSchema.index({ innings: 1, seq: 1 }, { unique: true });
ballSchema.index({ fixture: 1 });

export const CricketBall = mongoose.model('CricketBall', ballSchema, 'cricket_balls');
