import { Router } from 'express';
import {
  createFixture,
  deleteFixture,
  setFixtureDecision,
  updateFixture,
} from '../../controllers/admin/badminton/fixture.controller.js';
import { removeMatchResult, saveMatchResult } from '../../controllers/admin/badminton/match.controller.js';
import { getFixture, getStandings, listFixtures, streamFixture } from '../../controllers/user/badminton/badminton.controller.js';
import { requireAdmin } from '../../middleware/auth.js';

// Mounted at /api/badminton
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
router.put('/matches/:id/result', requireAdmin, saveMatchResult);
router.delete('/matches/:id/result', requireAdmin, removeMatchResult);

export default router;
