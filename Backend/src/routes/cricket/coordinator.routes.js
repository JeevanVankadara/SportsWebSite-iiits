import { Router } from 'express';
import {
  beginInnings,
  decideFixture,
  finishAsTie,
  getMyFixture,
  listMyFixtures,
  setSetup,
  setToss,
} from '../../controllers/co-ordinators/cricket/fixture.controller.js';
import { ball, batter, bowler, end, swap, undo } from '../../controllers/co-ordinators/cricket/innings.controller.js';
import { requireCoordinator } from '../../middleware/auth.js';

// Mounted at /api/coordinator/cricket. Only works on fixtures the signed-in co-ordinator referees.
const router = Router();
router.use(requireCoordinator);

router.get('/fixtures', listMyFixtures);
router.get('/fixtures/:id', getMyFixture);
router.put('/fixtures/:id/setup', setSetup);
router.put('/fixtures/:id/toss', setToss);
router.post('/fixtures/:id/innings', beginInnings);
router.post('/fixtures/:id/accept-tie', finishAsTie);
router.put('/fixtures/:id/decision', decideFixture);

router.post('/innings/:id/balls', ball);
router.post('/innings/:id/undo', undo);
router.put('/innings/:id/batter', batter);
router.put('/innings/:id/bowler', bowler);
router.post('/innings/:id/swap-strike', swap);
router.post('/innings/:id/end', end);

export default router;
