import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Worker } from '../models/Worker.js';
import { Admin } from '../models/Admin.js';
import { logger } from '../services/logger.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'realityproof-hackathon-secure-jwt-secret-2026';

/**
 * Generate signed JWT for Admin
 */
export const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id || admin.id,
      email: admin.email,
      username: admin.username,
      role: 'admin',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Generate signed JWT for Worker
 */
export const generateWorkerToken = (worker) => {
  return jwt.sign(
    {
      id: worker._id || worker.id,
      workerId: worker.workerId,
      name: worker.name,
      role: 'worker',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Central Authentication Middleware
 * Validates JWT Bearer token and verifies user identity and role
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required. Please sign in.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token. Please sign in again.',
      });
    }

    req.user = decoded;

    // Attach role-specific entity
    if (decoded.role === 'admin') {
      req.admin = {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
        role: 'admin',
      };
      return next();
    }

    if (decoded.role === 'worker') {
      const cleanIdentifier = decoded.workerId || decoded.id;
      const query = mongoose.Types.ObjectId.isValid(cleanIdentifier)
        ? { $or: [{ _id: cleanIdentifier }, { workerId: cleanIdentifier }] }
        : { workerId: new RegExp(`^${cleanIdentifier}$`, 'i') };

      const worker = await Worker.findOne(query);
      if (!worker) {
        return res.status(401).json({
          success: false,
          message: 'Worker account associated with token was not found.',
        });
      }

      req.worker = worker;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Unknown role privileges.',
    });
  } catch (error) {
    logger.error('AuthMiddleware', 'Internal authentication error:', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error validating credentials.',
    });
  }
};

/**
 * RBAC: Strictly require Admin role
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin role privileges required.',
    });
  }
  next();
};

/**
 * RBAC: Strictly require Worker role
 */
export const requireWorker = (req, res, next) => {
  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Worker role privileges required.',
    });
  }
  next();
};
