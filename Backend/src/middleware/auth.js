import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { Player } from '../models/Player.js';
import { HttpError } from '../utils/httpError.js';
import { isObjectId } from '../utils/validation.js';

function signToken(role, id) {
  return jwt.sign({ role }, env.jwtSecret, {
    subject: id,
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

// Reads "Authorization: Bearer <token>" and returns the token's payload if it has the expected role.
function verifyToken(req, role, forbiddenMessage) {
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
  if (payload.role !== role) throw new HttpError(403, forbiddenMessage);
  return payload;
}

export function signAdminToken(admin) {
  return signToken('admin', admin.id);
}

// Co-ordinators (referees) are players who sign in to run the fixtures they are assigned to.
export function signCoordinatorToken(player) {
  return signToken('coordinator', player.id);
}

// The admin is read from the database on every request, so a removed admin or a changed list of
// sports takes effect at once.
async function loadAdmin(req) {
  const payload = verifyToken(req, 'admin', 'Only admins can do this');
  const admin = isObjectId(payload.sub) ? await Admin.findById(payload.sub) : null;
  if (!admin) {
    throw new HttpError(401, 'Your session is no longer valid. Please sign in again.');
  }
  req.admin = admin;
  return admin;
}

// Guards admin routes (any admin) and sets req.admin.
export async function requireAdmin(req, res, next) {
  await loadAdmin(req);
  next();
}

// Guards what only the super admin may do: tournaments and the list of admins.
export async function requireSuperAdmin(req, res, next) {
  const admin = await loadAdmin(req);
  if (!admin.isSuperAdmin()) throw new HttpError(403, 'Only the super admin can do this');
  next();
}

// Guards one sport's admin routes: the super admin, or an admin given that sport. sport: 'cricket', ...
export function requireSportAdmin(sport) {
  return async (req, res, next) => {
    const admin = await loadAdmin(req);
    if (!admin.canManageSport(sport)) {
      throw new HttpError(403, `You do not have permission to manage ${sport}. Ask the super admin.`);
    }
    next();
  };
}

// Guards co-ordinator routes and sets req.player. Which fixtures they may touch is checked per route.
export async function requireCoordinator(req, res, next) {
  const payload = verifyToken(req, 'coordinator', 'Only co-ordinators can do this');
  const player = isObjectId(payload.sub) ? await Player.findById(payload.sub) : null;
  if (!player || player.is_guest) {
    throw new HttpError(401, 'Your session is no longer valid. Please sign in again.');
  }

  req.player = player;
  next();
}
