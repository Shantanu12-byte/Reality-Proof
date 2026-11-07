import express from 'express';
import {
  getPayPalPublicConfig,
  createTaskOrder,
  authorizePayment,
  getPaymentById,
  getPayments,
  capturePayment,
  refundPayment,
  getTaskPayment,
  settleWorkerPayout,
  getPaymentSummary,
  getPaymentTransactions,
  releasePayment,
} from '../controllers/paymentController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configuration & Metrics
router.get('/config', getPayPalPublicConfig);

// Admin-only Payment Management Endpoints
router.use(authenticate, requireAdmin);

router.get('/summary', getPaymentSummary);
router.get('/transactions', getPaymentTransactions);

// Task-centric payment workflows
router.post('/tasks/:taskId/create-order', createTaskOrder);
router.get('/tasks/:taskId', getTaskPayment);

// Payment lifecycle operations
router.post('/:paymentId/authorize', authorizePayment);
router.post('/:paymentId/capture', capturePayment);
router.post('/:paymentId/refund', refundPayment);
router.post('/:paymentId/payout', settleWorkerPayout);
router.post('/release/:id', releasePayment);

// Payment details and querying
router.get('/:paymentId', getPaymentById);
router.get('/', getPayments);

export default router;
