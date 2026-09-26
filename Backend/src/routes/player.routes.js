import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { searchPlayers } from '../controllers/admin/player.controller.js';
import { registerPlayer } from '../controllers/user/player.controller.js';
import { requireAdmin } from '../middleware/auth.js';

// Generous, because many students sign up from the same campus network (one shared IP).
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-ups from this network. Please try again in a few minutes.' },
});

const router = Router();

router.post('/register', registerLimiter, registerPlayer);
router.get('/', requireAdmin, searchPlayers);

export default router;
