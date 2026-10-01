import { Admin, SPORT_KEYS } from '../../models/Admin.js';
import { USERNAME_PATTERN } from '../../models/Player.js';
import { HttpError } from '../../utils/httpError.js';
import { findByIdOr404 } from '../../utils/validation.js';

// Managing admins is for the super admin only (see routes/admin.routes.js). The admins added here
// get a username and password from the super admin and manage only the sports they are given.

const MIN_PASSWORD_LENGTH = 8;

function requireUsername(value) {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(400, 'Username must be 3 to 30 characters: letters, numbers, dots or underscores');
  }
  return username;
}

function requirePassword(value) {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  // bcrypt only uses the first 72 bytes of a password.
  if (Buffer.byteLength(value) > 72) throw new HttpError(400, 'Password must be 72 characters or fewer');
  return value;
}

// undefined = field not sent.
function optionalSports(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((sport) => SPORT_KEYS.includes(sport))) {
    throw new HttpError(400, `Sports must be a list of: ${SPORT_KEYS.join(', ')}`);
  }
  return [...new Set(value)];
}

// Only admins the super admin added can be changed or removed here, never the super admin.
async function findManagedAdmin(id) {
  const admin = await findByIdOr404(Admin, id, 'Admin not found');
  if (admin.isSuperAdmin()) throw new HttpError(403, 'The super admin cannot be changed here');
  return admin;
}

// GET /api/admin/admins
export async function listAdmins(req, res) {
  const admins = await Admin.find().sort({ role: -1, username: 1 });
  res.json({ admins });
}

// POST /api/admin/admins — body: { username, password, sports }
export async function createAdmin(req, res) {
  const body = req.body ?? {};
  const username = requireUsername(body.username);
  const password = requirePassword(body.password);
  const sports = optionalSports(body.sports) ?? [];

  if (await Admin.exists({ username })) throw new HttpError(409, 'An admin with this username already exists');
  const admin = new Admin({ username, role: 'admin', sports, password_hash: await Admin.hashPassword(password) });
  try {
    await admin.save();
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, 'An admin with this username already exists');
    throw err;
  }
  res.status(201).json({ admin });
}

// PATCH /api/admin/admins/:id — body: { sports?, password? }
export async function updateAdmin(req, res) {
  const admin = await findManagedAdmin(req.params.id);
  const body = req.body ?? {};
  const sports = optionalSports(body.sports);
  if (sports) admin.sports = sports;
  if (body.password !== undefined && body.password !== '') {
    admin.password_hash = await Admin.hashPassword(requirePassword(body.password));
  }
  await admin.save();
  res.json({ admin });
}

// DELETE /api/admin/admins/:id — their next request is turned away (requireAdmin reads the database).
export async function deleteAdmin(req, res) {
  const admin = await findManagedAdmin(req.params.id);
  await admin.deleteOne();
  res.status(204).end();
}
