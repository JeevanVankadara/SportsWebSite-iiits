import { Router } from 'express';
import {
  createTournament,
  deleteTournament,
  getTournament,
  listTournaments,
  setWinners,
  updateTournament,
} from '../controllers/tournament.controller.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', listTournaments);
router.get('/:id', getTournament);
// Tournaments are the super admin's. Winners belong to one sport, so its admins may set them too.
router.post('/', requireSuperAdmin, createTournament);
router.patch('/:id', requireSuperAdmin, updateTournament);
router.put('/:id/winners', requireAdmin, setWinners);
router.delete('/:id', requireSuperAdmin, deleteTournament);

export default router;
