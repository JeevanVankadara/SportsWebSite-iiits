import { signAdminToken } from '../middleware/auth.js';
import { Admin } from '../models/Admin.js';
import { HttpError } from '../utils/httpError.js';

export async function login(req, res) {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
    throw new HttpError(400, 'Enter your username and password');
  }

  const admin = await Admin.findOne({ username: username.trim().toLowerCase() }).select('+password_hash');
  // Same message for an unknown username and a wrong password, so the form never reveals which usernames exist.
  if (!admin || !(await admin.verifyPassword(password))) {
    throw new HttpError(401, 'Incorrect username or password');
  }

  res.json({ token: signAdminToken(admin), admin });
}

export function getCurrentAdmin(req, res) {
  res.json({ admin: req.admin });
}
