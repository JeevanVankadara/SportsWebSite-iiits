import mongoose from 'mongoose';
import { schemaOptions } from './schemaOptions.js';

// live = ongoing, completed = past. A new tournament starts live and the admin ends it.
export const TOURNAMENT_STATUSES = ['live', 'completed'];

export const MAX_HOUSES = 30;

// house: house_id (_id), house_name. Houses belong to a single tournament, so they live inside it.
const houseSchema = new mongoose.Schema({
  house_name: {
    type: String,
    required: [true, 'House name is required'],
    trim: true,
    maxlength: [60, 'House name must be 60 characters or fewer'],
  },
});

// The houses the admin declares as a sport's winner and runner-up once its matches are over.
const winnersSchema = new mongoose.Schema(
  {
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    winner: { type: mongoose.Schema.Types.ObjectId, default: null },
    runner_up: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { _id: false },
);

// tournament: tournament_id (_id), tournament_name, list(game_id) (games), houses, winners per sport
const tournamentSchema = new mongoose.Schema(
  {
    tournament_name: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
      maxlength: [100, 'Tournament name must be 100 characters or fewer'],
    },
    games: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }],
    houses: {
      type: [houseSchema],
      default: [],
      validate: [
        {
          validator: (houses) => houses.length <= MAX_HOUSES,
          message: `A tournament can have at most ${MAX_HOUSES} houses`,
        },
        {
          validator: (houses) => {
            const names = houses.map((house) => house.house_name?.toLowerCase());
            return new Set(names).size === names.length;
          },
          message: 'Each house in a tournament needs a different name',
        },
      ],
    },
    status: {
      type: String,
      enum: { values: TOURNAMENT_STATUSES, message: 'Status must be live or completed' },
      default: 'live',
    },
    // Planned dates, shown to people. They never change the status on their own.
    start_date: Date,
    end_date: Date,
    // At most one entry per sport (game); both houses are houses of this tournament.
    winners: { type: [winnersSchema], default: [] },
    // A friendly match: a single match outside every tournament, added by the super admin. It is kept as
    // a hidden tournament with one sport and the two teams as its houses, so fixtures, scoring, referees
    // and live updates work exactly as in a tournament. Friendlies are left out of the tournament lists.
    is_friendly: { type: Boolean, default: false },
  },
  schemaOptions,
);

tournamentSchema.index({ status: 1 });
tournamentSchema.index({ games: 1 });
tournamentSchema.index({ is_friendly: 1 });

tournamentSchema.pre('validate', function () {
  if (this.start_date && this.end_date && this.end_date < this.start_date) {
    this.invalidate('end_date', 'End date cannot be before the start date');
  }
});

export const Tournament = mongoose.model('Tournament', tournamentSchema);

// Called after a fixture is deleted: a friendly is its one match, so it goes when the match goes.
export async function deleteFriendlyIfEmpty(tournamentId, FixtureModel) {
  if (await FixtureModel.exists({ tournament: tournamentId })) return;
  await Tournament.deleteOne({ _id: tournamentId, is_friendly: true });
}

// Runs on server start. Earlier versions had an "upcoming" status; those tournaments now count as ongoing.
export async function migrateUpcomingTournaments() {
  await Tournament.updateMany({ status: 'upcoming' }, { $set: { status: 'live' } });
}
