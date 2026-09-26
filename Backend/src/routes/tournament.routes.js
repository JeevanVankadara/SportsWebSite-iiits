import { Router } from 'express';
import {
  createTournament,
  deleteTournament,
  getTournament,
  listTournaments,
  updateTournament,
} from '../controllers/tournament.controller.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', listTournaments);
router.get('/:id', getTournament);
router.post('/', requireAdmin, createTournament);
router.patch('/:id', requireAdmin, updateTournament);
router.delete('/:id', requireAdmin, deleteTournament);

export default router;
