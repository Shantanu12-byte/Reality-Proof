import express from 'express';
import { handlePayPalWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Route: POST /api/webhooks/paypal
router.post('/paypal', handlePayPalWebhook);

export default router;

