import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Worker } from '../models/Worker.js';
import { Task } from '../models/Task.js';
import { Activity } from '../models/Activity.js';
import { logger } from '../services/logger.js';
import { Admin } from '../models/Admin.js';

// Designated test workers and preserved field force workers
export const registeredWorkers = [
  // Primary seeded hackathon testing accounts: WRK001, WRK002, WRK003, WRK004
  {
    workerId: 'WRK001',
    name: 'Neha Joshi',
    email: 'wrk001@fieldforce.realityproof.ai',
    phone: '+91 98230 11984',
    city: 'Pune',
    zone: 'Pune West & Central',
    rating: 5.0,
    accuracy: 99.4,
    status: 'Active',
    reliabilityScore: 99,
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK002',
    name: 'Rahul Sharma',
    email: 'wrk002@fieldforce.realityproof.ai',
    phone: '+91 98201 44521',
    city: 'Pune',
    zone: 'Pune East / Viman Nagar',
    rating: 4.9,
    accuracy: 98.2,
    status: 'Active',
    reliabilityScore: 97,
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK003',
    name: 'Kavita Deshmukh',
    email: 'wrk003@fieldforce.realityproof.ai',
    phone: '+91 98450 66201',
    city: 'Mumbai',
    zone: 'Mumbai Suburban',
    rating: 4.9,
    accuracy: 97.8,
    status: 'Active',
    reliabilityScore: 96,
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK004',
    name: 'Aman Verma',
    email: 'wrk004@fieldforce.realityproof.ai',
    phone: '+91 99112 77410',
    city: 'Nagpur',
    zone: 'Nagpur Logistics Hub',
    rating: 4.8,
    accuracy: 96.5,
    status: 'Active',
    reliabilityScore: 95,
    paypalStatus: 'Linked & Verified',
  },
  // Preserved legacy inspector accounts (WRK-401 to WRK-409)
  {
    workerId: 'WRK-401',
    name: 'Neha Joshi',
    email: 'neha.joshi@fieldforce.io',
    phone: '+91 98230 11984',
    city: 'Pune',
    zone: 'Pune West & Central',
    rating: 5.0,
    accuracy: 99.4,
    status: 'Active',
    reliabilityScore: 99,
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK-402',
    name: 'Rahul Sharma',
    email: 'rahul.s@fieldforce.io',
    phone: '+91 98201 44521',
    city: 'Pune',
    zone: 'Pune East / Viman Nagar',
    rating: 4.9,
    accuracy: 98.2,
    status: 'Active',
    reliabilityScore: 97,
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK-403',
    name: 'Kavita Deshmukh',
    email: 'kavita.d@fieldforce.io',
    phone: '+91 98450 66201',
    city: 'Mumbai',
    zone: 'Mumbai Suburban',
    rating: 4.9,
    accuracy: 97.8,
    status: 'Active',
    reliabilityScore: 96,
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK-404',
    name: 'Aman Verma',
    email: 'aman.verma@fieldforce.io',
    phone: '+91 99112 77410',
    city: 'Nagpur',
    zone: 'Nagpur Logistics Hub',
    rating: 4.8,
    accuracy: 96.5,
    status: 'Active',
    reliabilityScore: 95,
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK-405',
    name: 'Rohan Gupta',
    email: 'rohan.g@fieldforce.io',
    phone: '+91 99876 54321',
    city: 'Mumbai',
    zone: 'BKC & Bandra',
    rating: 4.8,
    accuracy: 95.9,
    status: 'Idle',
    reliabilityScore: 94,
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK-406',
    name: 'Priya Patel',
    email: 'priya.patel@fieldforce.io',
    phone: '+91 98192 33109',
    city: 'Mumbai',
    zone: 'Andheri & Juhu',
    rating: 4.7,
    accuracy: 91.2,
    status: 'Under Review',
    reliabilityScore: 82,
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK-407',
    name: 'Sneha Rao',
    email: 'sneha.rao@fieldforce.io',
    phone: '+91 97312 90114',
    city: 'Pune',
    zone: 'Kalyani Nagar /恢复',
    rating: 4.6,
    accuracy: 92.0,
    status: 'Active',
    reliabilityScore: 88,
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK-408',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@fieldforce.io',
    phone: '+91 97654 88712',
    city: 'Nashik',
    zone: 'Ambad & Satpur MIDC',
    rating: 4.2,
    accuracy: 84.1,
    status: 'Suspended (Review)',
    reliabilityScore: 71,
    paypalStatus: 'Payout Hold',
  },
  {
    workerId: 'WRK-409',
    name: 'tukaram munde',
    email: 'tukamrammunde@gmail.com',
    phone: '+91 98192 331209',
    city: 'Mumbai',
    zone: 'Andheri & Juhu',
    rating: 4.0,
    accuracy: 91.2,
    status: 'Under Review',
    reliabilityScore: 22,
    paypalStatus: 'Linked & Verified',
  },
];

/**
 * Purge legacy mock tasks and invalid activities
 */
export const purgeLegacyDummyData = async () => {
  const legacyTaskIds = [
    'RP-1015', 'RP-1016', 'RP-1017', 'RP-1018',
    'RP-1019', 'RP-1020', 'RP-1021', 'RP-1022',
    'RP-1023', 'RP-1024',
  ];
  try {
    const taskResult = await Task.deleteMany({
      $or: [
        { taskId: { $in: legacyTaskIds } },
        { date: '2026-11-04', submitted: { $regex: /ago/i } },
      ],
    });
    const activityResult = await Activity.deleteMany({
      $or: [
        { taskId: { $in: legacyTaskIds } },
        { details: { $regex: /demo/i } },
      ],
    });
    return { tasksDeleted: taskResult.deletedCount, activitiesDeleted: activityResult.deletedCount };
  } catch (err) {
    console.warn('[DB SANITIZATION] Notice during legacy dummy purge:', err.message);
    return { tasksDeleted: 0, activitiesDeleted: 0 };
  }
};

/**
 * Seed or update the demo Admin account
 */
export const syncAdminAccount = async () => {
  const adminEmail = 'admin@realityproof.ai';
  const adminUsername = 'admin';
  const adminPassword = 'AdminPassword123!';

  const existingAdmin = await Admin.findOne({
    $or: [{ email: adminEmail }, { username: adminUsername }],
  }).select('+password');

  if (existingAdmin) {
    existingAdmin.password = adminPassword;
    existingAdmin.name = 'Operations Administrator';
    existingAdmin.role = 'admin';
    existingAdmin.avatar = 'AD';
    await existingAdmin.save();
    console.log('[ADMIN SYNC] Demo Admin credentials updated: admin@realityproof.ai (username: admin)');
    return existingAdmin;
  } else {
    const newAdmin = await Admin.create({
      email: adminEmail,
      username: adminUsername,
      name: 'Operations Administrator',
      role: 'admin',
      password: adminPassword,
      avatar: 'AD',
    });
    console.log('[ADMIN SYNC] Created new demo Admin account: admin@realityproof.ai');
    return newAdmin;
  }
};

/**
 * Synchronize registered field workers in MongoDB.
 * Hashes password 'testing123' for each seeded worker account.
 * Preserves dynamic runtime progress (completedJobs, balance, tasksToday, recentTask).
 */
export const syncRegisteredWorkers = async () => {
  await purgeLegacyDummyData();

  // Pre-calculate hash for the standard testing password
  const salt = await bcrypt.genSalt(10);
  const defaultWorkerPasswordHash = await bcrypt.hash('testing123', salt);

  let syncedCount = 0;
  for (const w of registeredWorkers) {
    const staticFields = {
      name: w.name,
      email: w.email,
      phone: w.phone,
      city: w.city,
      zone: w.zone,
      rating: w.rating,
      accuracy: w.accuracy,
      status: w.status,
      reliabilityScore: w.reliabilityScore,
      paypalStatus: w.paypalStatus,
      password: defaultWorkerPasswordHash, // testing123
    };

    const dynamicFieldsOnInsert = {
      completedJobs: 0,
      balance: 0.0,
      tasksToday: 0,
      recentTask: '',
    };

    await Worker.findOneAndUpdate(
      { workerId: w.workerId },
      {
        $set: staticFields,
        $setOnInsert: dynamicFieldsOnInsert,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    syncedCount++;
  }

  // Ensure testing tasks are assigned for WRK001 and WRK002 to prove isolation
  const worker1 = await Worker.findOne({ workerId: 'WRK001' });
  const worker2 = await Worker.findOne({ workerId: 'WRK002' });

  if (worker1) {
    await Task.findOneAndUpdate(
      { taskId: 'RP-1002' },
      {
        $set: {
          assignedWorker: worker1._id,
        },
      }
    );
  }

  if (worker2) {
    await Task.findOneAndUpdate(
      { taskId: 'RP-1001' },
      {
        $set: {
          assignedWorker: worker2._id,
        },
      }
    );
  }

  console.log(`[WORKER SYNC] Successfully preserved & synchronized ${syncedCount} field workers with hashed credentials.`);
  return { success: true, count: syncedCount };
};

export const autoSeedIfEmpty = async () => {
  await syncAdminAccount();
  return await syncRegisteredWorkers();
};

export const seedDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realityproof';
  const dbName = process.env.DB_NAME || 'RealityProof';
  const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');

  logger.info('SEED', `Connecting to target database: ${dbName} (URI: ${sanitizedUri})`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      dbName,
    });

    const admin = await syncAdminAccount();
    const result = await syncRegisteredWorkers();

    logger.info('SEED', `SUCCESS: Admin (${admin.email}) and ${result.count} workers synchronized.`);
  } catch (error) {
    logger.error('SEED', `ERROR during synchronization: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('SEED', 'Database connection closed.');
  }
};

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('seedData.js')) {
  seedDatabase().then(() => process.exit(0));
}
