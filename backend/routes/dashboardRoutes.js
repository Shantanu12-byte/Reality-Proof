import express from 'express';
import {
  getDashboardSummary,
  getDashboardActivity,
  getDashboardExceptions,
} from '../controllers/dashboardController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/summary', getDashboardSummary);
router.get('/activity', getDashboardActivity);
router.get('/exceptions', getDashboardExceptions);

export default router;

