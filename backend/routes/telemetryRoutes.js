import express from 'express';
import { getTelemetryLocations } from '../controllers/telemetryController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/locations', getTelemetryLocations);

export default router;
