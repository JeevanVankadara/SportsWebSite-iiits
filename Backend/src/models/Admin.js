import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { schemaOptions } from './schemaOptions.js';

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
    },
    password_hash: { type: String, required: true, select: false },
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

adminSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 12);
};

// Requires the document to have been loaded with .select('+password_hash').
adminSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.password_hash);
};

export const Admin = mongoose.model('Admin', adminSchema);
