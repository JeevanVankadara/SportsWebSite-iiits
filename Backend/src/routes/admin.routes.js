import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getCurrentAdmin, login } from '../controllers/admin/admin.controller.js';
import { createAdmin, deleteAdmin, listAdmins, updateAdmin } from '../controllers/admin/admins.controller.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth.js';

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

// The super admin adds admins and picks the sports each one manages.
router.get('/admins', requireSuperAdmin, listAdmins);
router.post('/admins', requireSuperAdmin, createAdmin);
router.patch('/admins/:id', requireSuperAdmin, updateAdmin);
router.delete('/admins/:id', requireSuperAdmin, deleteAdmin);

export default router;
