import mongoose from 'mongoose';
import { syncRegisteredWorkers } from '../seed/seedData.js';
import { logger } from '../services/logger.js';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realityproof';
  const dbName = process.env.DB_NAME || 'RealityProof';

  try {
    const conn = await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 25,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      family: 4,
    });

    logger.info('MongoDB', `Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    // Ensure authentic field workers are synchronized without injecting mock tasks or activities
    await syncRegisteredWorkers();

    return conn;
  } catch (error) {
    logger.error('MongoDB', `Connection failed: ${error.message}`);
    // Don't kill the process immediately in development so the API can return meaningful offline responses
    return null;
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB', 'Connection lost. Attempting reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB', 'Reconnected successfully.');
});


