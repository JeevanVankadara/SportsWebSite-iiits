import { Router } from 'express';
import {
  createFixture,
  deleteFixture,
  setFixtureDecision,
  updateFixture,
} from '../../controllers/admin/cricket/fixture.controller.js';
import { getFixture, getStandings, listFixtures } from '../../controllers/user/cricket/cricket.controller.js';
import { requireAdmin } from '../../middleware/auth.js';

// Mounted at /api/cricket
const router = Router();

// Public
router.get('/tournaments/:tournamentId/fixtures', listFixtures);
router.get('/tournaments/:tournamentId/standings', getStandings);
router.get('/fixtures/:id', getFixture);

// Admin
router.post('/tournaments/:tournamentId/fixtures', requireAdmin, createFixture);
router.patch('/fixtures/:id', requireAdmin, updateFixture);
router.delete('/fixtures/:id', requireAdmin, deleteFixture);
router.put('/fixtures/:id/decision', requireAdmin, setFixtureDecision);

export default router;
