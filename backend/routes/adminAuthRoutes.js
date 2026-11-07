import express from 'express';
import { adminLogin, getAdminMe } from '../controllers/adminAuthController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public Admin Login with Rate Limiting
router.post('/login', authRateLimiter, adminLogin);

// Protected Admin Me
router.get('/me', authenticate, requireAdmin, getAdminMe);

export default router;
