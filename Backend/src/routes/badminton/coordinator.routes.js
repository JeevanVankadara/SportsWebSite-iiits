import { Router } from 'express';
import {
  decideFixture,
  getMyFixture,
  listMyFixtures,
  setMatchOrder,
  setSlip,
  addGuest,
} from '../../controllers/co-ordinators/badminton/fixture.controller.js';
import { abandon, editSet, finish, nextSet, score, start } from '../../controllers/co-ordinators/badminton/match.controller.js';
import { requireCoordinator } from '../../middleware/auth.js';

// Mounted at /api/coordinator/badminton. Every route is for a signed-in co-ordinator,
// and only works on fixtures they referee.
const router = Router();
router.use(requireCoordinator);

router.get('/fixtures', listMyFixtures);
router.get('/fixtures/:id', getMyFixture);
router.post('/fixtures/:id/guests', addGuest);
router.put('/fixtures/:id/order', setMatchOrder);
router.put('/fixtures/:id/slips/:team', setSlip);
router.put('/fixtures/:id/decision', decideFixture);

router.post('/matches/:id/start', start);
router.post('/matches/:id/score', score);
router.post('/matches/:id/next-set', nextSet);
router.post('/matches/:id/finish', finish);
router.post('/matches/:id/abandon', abandon);

router.put('/sets/:id', editSet);

export default router;
