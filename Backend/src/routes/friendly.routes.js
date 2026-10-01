import { Router } from 'express';
import { createFriendly, listFriendlies } from '../controllers/admin/friendly.controller.js';
import { requireSuperAdmin } from '../middleware/auth.js';

// Mounted at /api/friendlies. Friendly matches are the super admin's. Once made, a friendly's match is
// changed, decided or deleted through its sport's fixture routes, and the whole friendly through
// DELETE /api/tournaments/:id, like any tournament.
const router = Router();

router.get('/', requireSuperAdmin, listFriendlies);
router.post('/', requireSuperAdmin, createFriendly);

export default router;
