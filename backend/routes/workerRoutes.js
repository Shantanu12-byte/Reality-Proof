import express from 'express';
import {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
} from '../controllers/workerController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.route('/')
  .get(getWorkers)
  .post(createWorker);

router.route('/:id')
  .get(getWorkerById)
  .put(updateWorker);

export default router;

