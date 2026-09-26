import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { HttpError } from '../utils/httpError.js';
import { isObjectId } from '../utils/validation.js';

export function signAdminToken(admin) {
  return jwt.sign({ role: 'admin' }, env.jwtSecret, {
    subject: admin.id,
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

// Guards write routes. Expects "Authorization: Bearer <token>" and sets req.admin.
export async function requireAdmin(req, res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Please sign in to continue');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }
  if (payload.role !== 'admin') {
    throw new HttpError(403, 'Only admins can do this');
  }

  const admin = isObjectId(payload.sub) ? await Admin.findById(payload.sub) : null;
  if (!admin) {
    throw new HttpError(401, 'Your session is no longer valid. Please sign in again.');
  }

  req.admin = admin;
  next();
}
