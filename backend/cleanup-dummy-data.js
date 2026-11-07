import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { Task } from './models/Task.js';
import { Worker } from './models/Worker.js';
import { Activity } from './models/Activity.js';
import { syncRegisteredWorkers } from './seed/seedData.js';

export const cleanupDummyData = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realityproof';
  const dbName = process.env.DB_NAME || 'RealityProof';

  console.log('====================================================');
  console.log('[DATABASE CLEANUP] Sanitizing MongoDB Collections');
  console.log(`[DATABASE CLEANUP] Target: ${uri}`);
  console.log(`[DATABASE CLEANUP] DB Name: ${dbName}`);
  console.log('====================================================');

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      dbName,
    });

    console.log('[DATABASE CLEANUP] MongoDB connected successfully.');

    // 1. Purge legacy static mock tasks (RP-1015 through RP-1024)
    const legacyTaskIds = [
      'RP-1015',
      'RP-1016',
      'RP-1017',
      'RP-1018',
      'RP-1019',
      'RP-1020',
      'RP-1021',
      'RP-1022',
      'RP-1023',
      'RP-1024',
    ];

    const taskDeleteResult = await Task.deleteMany({
      $or: [
        { taskId: { $in: legacyTaskIds } },
        { date: '2026-11-04', submitted: { $regex: /ago/i } },
      ],
    });
    console.log(`[DATABASE CLEANUP] Purged ${taskDeleteResult.deletedCount} legacy mock task(s).`);

    // 2. Purge fake legacy activities
    const activityDeleteResult = await Activity.deleteMany({
      $or: [
        { taskId: { $in: legacyTaskIds } },
        { taskId: { $exists: false } },
        { details: { $regex: /demo/i } },
      ],
    });
    console.log(`[DATABASE CLEANUP] Purged ${activityDeleteResult.deletedCount} legacy activity record(s).`);

    // 3. Ensure the 8 authenticated field worker profiles are preserved and intact
    await syncRegisteredWorkers();

    const currentWorkers = await Worker.find({}, 'workerId name city status completedJobs balance').sort({ workerId: 1 }).lean();
    const remainingTasksCount = await Task.countDocuments();
    const remainingActivitiesCount = await Activity.countDocuments();

    console.log('====================================================');
    console.log(`[DATABASE CLEANUP] Remaining Tasks: ${remainingTasksCount}`);
    console.log(`[DATABASE CLEANUP] Remaining Activities: ${remainingActivitiesCount}`);
    console.log(`[DATABASE CLEANUP] Verified Field Workers (${currentWorkers.length}):`);
    currentWorkers.forEach((w) => {
      console.log(`  - [${w.workerId}] ${w.name} (${w.city}) | Status: ${w.status} | Jobs: ${w.completedJobs} | Balance: $${w.balance}`);
    });
    console.log('====================================================');
    console.log('[DATABASE CLEANUP] SUCCESS: MongoDB Atlas sanitization complete.');

    return {
      purgedTasks: taskDeleteResult.deletedCount,
      purgedActivities: activityDeleteResult.deletedCount,
      remainingTasks: remainingTasksCount,
      remainingActivities: remainingActivitiesCount,
      workersCount: currentWorkers.length,
      workers: currentWorkers,
    };
  } catch (error) {
    console.error('[DATABASE CLEANUP] ERROR during sanitization:', error.message);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('[DATABASE CLEANUP] MongoDB connection closed.');
    }
  }
};

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('cleanup-dummy-data.js')) {
  cleanupDummyData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
