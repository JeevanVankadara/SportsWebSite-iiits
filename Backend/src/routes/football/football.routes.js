import { Router } from 'express';
import {
  createFixture,
  deleteFixture,
  setFixtureDecision,
  updateFixture,
} from '../../controllers/admin/football/fixture.controller.js';
import { getFixture, getStandings, listFixtures, streamFixture } from '../../controllers/user/football/football.controller.js';
import { requireAdmin } from '../../middleware/auth.js';

// Mounted at /api/football
const router = Router();

// Public
router.get('/tournaments/:tournamentId/fixtures', listFixtures);
router.get('/tournaments/:tournamentId/standings', getStandings);
router.get('/fixtures/:id', getFixture);
router.get('/fixtures/:id/stream', streamFixture);

// Admin
router.post('/tournaments/:tournamentId/fixtures', requireAdmin, createFixture);
router.patch('/fixtures/:id', requireAdmin, updateFixture);
router.delete('/fixtures/:id', requireAdmin, deleteFixture);
router.put('/fixtures/:id/decision', requireAdmin, setFixtureDecision);

export default router;
