import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import taskRoutes from './routes/taskRoutes.js';
import workerRoutes from './routes/workerRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import telemetryRoutes from './routes/telemetryRoutes.js';
import intelligenceRoutes from './routes/intelligenceRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import workerPortalRoutes from './routes/workerPortalRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by origin'));
    },
    credentials: true,
  })
);

// Body parsing middleware (preserves raw buffer for cryptographic webhook signature verification)
app.use(
  express.json({
    limit: '20mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static file serving for uploaded evidence assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    service: 'RealityProof Backend API',
    version: '1.0.0',
    mongodb: mongoStatus,
    timestamp: new Date().toISOString(),
  });
});

// Mount Resource API Routes
app.use('/api/admin', adminAuthRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/worker', workerPortalRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Start Server
const server = app.listen(PORT, () => {
  console.log(`[RealityProof API] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[RealityProof API] Health check available at http://localhost:${PORT}/api/health`);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n[RealityProof API] Shutting down gracefully...');
  await mongoose.connection.close();
  server.close(() => {
    console.log('[RealityProof API] Server terminated.');
    process.exit(0);
  });
});

export default app;

