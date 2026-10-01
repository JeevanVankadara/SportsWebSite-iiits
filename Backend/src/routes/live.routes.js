import { Router } from 'express';
import { liveFixtures } from '../controllers/user/live.controller.js';

// Mounted at /api/live. Public.
const router = Router();

router.get('/fixtures', liveFixtures);

export default router;
