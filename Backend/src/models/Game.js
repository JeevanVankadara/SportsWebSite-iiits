import mongoose from 'mongoose';
import { caseInsensitive, schemaOptions } from './schemaOptions.js';

// The sports an admin can pick for a tournament. More details (rules, scoring) come later.
export const PREDEFINED_GAMES = ['Cricket', 'Badminton'];

// Games: game_id (_id), game_name, rules_id (rules)
const gameSchema = new mongoose.Schema(
  {
    game_name: {
      type: String,
      required: [true, 'Game name is required'],
      trim: true,
      maxlength: [60, 'Game name must be 60 characters or fewer'],
    },
    rules: { type: mongoose.Schema.Types.ObjectId, ref: 'Rules' },
  },
  schemaOptions,
);

gameSchema.index({ game_name: 1 }, { unique: true, collation: caseInsensitive });

export const Game = mongoose.model('Game', gameSchema);

// Runs on server start: adds any predefined game that is missing, and leaves existing ones untouched.
export async function ensurePredefinedGames() {
  for (const game_name of PREDEFINED_GAMES) {
    const exists = await Game.exists({ game_name }).collation(caseInsensitive);
    if (!exists) await Game.create({ game_name });
  }
}
