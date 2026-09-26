import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getCurrentAdmin, login } from '../controllers/admin.controller.js';
import { requireAdmin } from '../middleware/auth.js';

// Only failed attempts count towards the limit.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please wait 15 minutes and try again.' },
});

const router = Router();

router.post('/login', loginLimiter, login);
router.get('/me', requireAdmin, getCurrentAdmin);

export default router;
