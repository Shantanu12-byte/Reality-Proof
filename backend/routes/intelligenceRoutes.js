import express from 'express';
import { getIntelligenceSummary } from '../controllers/intelligenceController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/summary', getIntelligenceSummary);

export default router;
