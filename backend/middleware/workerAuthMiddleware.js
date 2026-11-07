import { authenticate, requireWorker } from './authMiddleware.js';

/**
 * Worker Authentication Middleware (Backward-compatible wrapper)
 * Verifies signed JWT token and enforces worker role
 */
export const workerAuthMiddleware = (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    requireWorker(req, res, next);
  });
};

export default workerAuthMiddleware;
