import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getCurrentCoordinator, googleLogin, searchPlayers } from '../controllers/co-ordinators/auth.controller.js';
import { requireCoordinator } from '../middleware/auth.js';

// Only failed attempts count towards the limit.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please wait 15 minutes and try again.' },
});

// Mounted at /api/coordinator. Each sport adds its own routes under /api/coordinator/<sport>.
const router = Router();

router.post('/google', loginLimiter, googleLogin);
router.get('/me', requireCoordinator, getCurrentCoordinator);
router.get('/players', requireCoordinator, searchPlayers);

export default router;
