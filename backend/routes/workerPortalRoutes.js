import express from 'express';
import {
  workerLogin,
  getWorkerDemoList,
  getWorkerMe,
  getWorkerTasks,
  getWorkerTaskById,
  getWorkerSubmissions,
} from '../controllers/workerPortalController.js';
import { workerAuthMiddleware } from '../middleware/workerAuthMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public Worker Auth Routes with Rate Limiting
router.post('/login', authRateLimiter, workerLogin);
router.get('/demo-list', getWorkerDemoList);

// Protected Worker Portal Routes
router.get('/me', workerAuthMiddleware, getWorkerMe);
router.get('/tasks', workerAuthMiddleware, getWorkerTasks);
router.get('/tasks/:id', workerAuthMiddleware, getWorkerTaskById);
router.get('/submissions', workerAuthMiddleware, getWorkerSubmissions);

export default router;

