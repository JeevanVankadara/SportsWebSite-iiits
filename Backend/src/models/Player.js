import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { schemaOptions } from './schemaOptions.js';

export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

// IIITS roll numbers: S + batch year + 7 digits, e.g. S20230010250.
const ROLL_NUMBER_PATTERN = /^S(\d{4})\d{7}$/;
export const FIRST_BATCH_YEAR = 2023;

// For registration: batches from 2023 up to this year. Guests and seeded demo players are not checked.
export function isValidRollNumber(rollNumber) {
  const year = Number(ROLL_NUMBER_PATTERN.exec(rollNumber)?.[1]);
  return year >= FIRST_BATCH_YEAR && year <= new Date().getFullYear();
}

// A player's record in one sport, refreshed after every match they play.
const sportRecordSchema = new mongoose.Schema(
  {
    played: { type: Number, default: 0, min: 0 },
    won: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const footballRecordSchema = new mongoose.Schema(
  {
    played: { type: Number, default: 0, min: 0 },
    won: { type: Number, default: 0, min: 0 },
    goals: { type: Number, default: 0, min: 0 },
    yellow_cards: { type: Number, default: 0, min: 0 },
    red_cards: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const cricketRecordSchema = new mongoose.Schema(
  {
    played: { type: Number, default: 0, min: 0 },
    won: { type: Number, default: 0, min: 0 },
    runs: { type: Number, default: 0, min: 0 },
    wickets: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const kabaddiRecordSchema = new mongoose.Schema(
  {
    played: { type: Number, default: 0, min: 0 },
    won: { type: Number, default: 0, min: 0 },
    raid_points: { type: Number, default: 0, min: 0 },
    tackle_points: { type: Number, default: 0, min: 0 },
    points: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

// player: player_id (_id), name, email, roll_number, username. Players are shared by every sport,
// and any player can be picked as a referee (co-ordinator) for a fixture.
// Players register and sign in with their college Google account (google_id); there are no passwords.
const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [80, 'Name must be 80 characters or fewer'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [120, 'Email must be 120 characters or fewer'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    roll_number: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [30, 'Roll number must be 30 characters or fewer'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [USERNAME_PATTERN, 'Username must be 3 to 30 characters: letters, numbers, dots or underscores'],
    },
    // Google's id for the account ("sub"). Guests and seeded demo players have none.
    google_id: { type: String, trim: true },
    // Only guests (a placeholder that matches nothing) and old seeded demo players have one.
    password_hash: { type: String, select: false },
    // A guest is a name a referee added for one match only, for someone who has no account.
    // It has placeholder email/roll number/username (services/guestPlayer.service.js), cannot sign
    // in, never appears in player search, and can be named only in the lineups of that one match.
    is_guest: { type: Boolean, default: false },
    guest_for: {
      type: new mongoose.Schema(
        { sport: { type: String, required: true }, fixture: { type: mongoose.Schema.Types.ObjectId, required: true } },
        { _id: false },
      ),
      default: undefined,
    },
    sports: {
      badminton: { type: sportRecordSchema, default: () => ({}) },
      football: { type: footballRecordSchema, default: () => ({}) },
      cricket: { type: cricketRecordSchema, default: () => ({}) },
      kabaddi: { type: kabaddiRecordSchema, default: () => ({}) },
    },
  },
  {
    ...schemaOptions,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret.password_hash;
        delete ret.google_id;
        return ret;
      },
    },
  },
);

// Finding (and deleting) the guests of a fixture.
playerSchema.index({ 'guest_for.fixture': 1 }, { sparse: true });
playerSchema.index({ google_id: 1 }, { unique: true, sparse: true });

// Used by the demo seed scripts only.
playerSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 12);
};

export const Player = mongoose.model('Player', playerSchema);
