import { Router } from 'express';
import {
  createFixture,
  deleteFixture,
  setFixtureDecision,
  updateFixture,
} from '../../controllers/admin/badminton/fixture.controller.js';
import { removeMatchResult, saveMatchResult } from '../../controllers/admin/badminton/match.controller.js';
import { getFixture, getStandings, listFixtures, streamFixture } from '../../controllers/user/badminton/badminton.controller.js';
import { requireSportAdmin } from '../../middleware/auth.js';

// Mounted at /api/badminton
const router = Router();
// The super admin, or an admin the super admin gave badminton to.
const sportAdmin = requireSportAdmin('badminton');

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
router.put('/matches/:id/result', sportAdmin, saveMatchResult);
router.delete('/matches/:id/result', sportAdmin, removeMatchResult);

export default router;
