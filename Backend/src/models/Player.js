import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { schemaOptions } from './schemaOptions.js';

export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;
export const MIN_PASSWORD_LENGTH = 8;

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

// player: player_id (_id), name, email, roll_number, username. Players are shared by every sport,
// and any player can be picked as a referee (co-ordinator) for a fixture.
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
    password_hash: { type: String, required: true, select: false },
    sports: {
      badminton: { type: sportRecordSchema, default: () => ({}) },
      football: { type: footballRecordSchema, default: () => ({}) },
    },
  },
  {
    ...schemaOptions,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret.password_hash;
        return ret;
      },
    },
  },
);

playerSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 12);
};

// Requires the document to have been loaded with .select('+password_hash').
playerSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.password_hash);
};

export const Player = mongoose.model('Player', playerSchema);
