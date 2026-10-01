import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { PREDEFINED_GAMES } from './Game.js';
import { schemaOptions } from './schemaOptions.js';

// super_admin: everything, including adding and removing other admins.
// admin: added by the super admin; manages only the sports in `sports`.
export const ADMIN_ROLES = ['super_admin', 'admin'];

// 'cricket', 'badminton', ... — the same names the sport routes use (/api/<sport>/...).
export const SPORT_KEYS = PREDEFINED_GAMES.map((name) => name.toLowerCase());

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
    role: {
      type: String,
      enum: { values: ADMIN_ROLES, message: 'Role must be super_admin or admin' },
      default: 'admin',
    },
    sports: {
      type: [{ type: String, enum: { values: SPORT_KEYS, message: 'Unknown sport' } }],
      default: [],
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

adminSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 12);
};

// Requires the document to have been loaded with .select('+password_hash').
adminSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.password_hash);
};

adminSchema.methods.isSuperAdmin = function () {
  return this.role === 'super_admin';
};

// sport: one of SPORT_KEYS.
adminSchema.methods.canManageSport = function (sport) {
  return this.isSuperAdmin() || this.sports.includes(sport);
};

export const Admin = mongoose.model('Admin', adminSchema);

// Runs on server start. Admins from before roles existed could do everything, so they become super admins.
export async function migrateAdminRoles() {
  await Admin.collection.updateMany({ role: { $exists: false } }, { $set: { role: 'super_admin', sports: [] } });
}
