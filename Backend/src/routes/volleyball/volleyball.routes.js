import { Router } from 'express';
import {
  createFixture,
  deleteFixture,
  setFixtureDecision,
  updateFixture,
} from '../../controllers/admin/volleyball/fixture.controller.js';
import { getFixture, getStandings, listFixtures } from '../../controllers/user/volleyball/volleyball.controller.js';
import { requireAdmin } from '../../middleware/auth.js';

// Mounted at /api/volleyball
const router = Router();

// Public
router.get('/tournaments/:tournamentId/fixtures', listFixtures);
router.get('/tournaments/:tournamentId/standings', getStandings);
router.get('/fixtures/:id', getFixture);

// Admin: like every other sport, the admin only manages the fixture and the final decision.
// The match itself (rules, lineups and scoring) is run by the assigned referee.
router.post('/tournaments/:tournamentId/fixtures', requireAdmin, createFixture);
router.patch('/fixtures/:id', requireAdmin, updateFixture);
router.delete('/fixtures/:id', requireAdmin, deleteFixture);
router.put('/fixtures/:id/decision', requireAdmin, setFixtureDecision);

export default router;
