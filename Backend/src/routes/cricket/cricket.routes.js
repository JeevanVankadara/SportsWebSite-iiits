import { Router } from 'express';
import {
  createFixture,
  deleteFixture,
  setFixtureDecision,
  updateFixture,
} from '../../controllers/admin/cricket/fixture.controller.js';
import { getFixture, getStandings, listFixtures, streamFixture } from '../../controllers/user/cricket/cricket.controller.js';
import { requireSportAdmin } from '../../middleware/auth.js';

// Mounted at /api/cricket
const router = Router();
// The super admin, or an admin the super admin gave cricket to.
const sportAdmin = requireSportAdmin('cricket');

// Public
router.get('/tournaments/:tournamentId/fixtures', listFixtures);
router.get('/tournaments/:tournamentId/standings', getStandings);
router.get('/fixtures/:id', getFixture);
router.get('/fixtures/:id/stream', streamFixture);

// Admin
router.post('/tournaments/:tournamentId/fixtures', sportAdmin, createFixture);
router.patch('/fixtures/:id', sportAdmin, updateFixture);
router.delete('/fixtures/:id', sportAdmin, deleteFixture);
router.put('/fixtures/:id/decision', sportAdmin, setFixtureDecision);

export default router;
