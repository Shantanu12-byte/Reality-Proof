/**
 * RealityProof Programmatic MongoDB Verification Suite
 *
 * Validates active connection, collection existence, full CRUD operations across
 * Worker, Task, and Activity collections, schema validation/constraints,
 * live aggregation pipelines, and idempotent zero-residue teardown.
 *
 * Exit code 0 on success, code 1 on failure.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

import { Worker } from './models/Worker.js';
import { Task } from './models/Task.js';
import { Activity } from './models/Activity.js';

const TIMESTAMP = Date.now();
const TEST_WORKER_ID = `VERIFY-WRK-${TIMESTAMP}`;
const TEST_TASK_ID = `VERIFY-RP-${TIMESTAMP}`;
const TEST_EMAIL = `verify.${TIMESTAMP}@fieldforce.io`;

async function runDatabaseVerification() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realityproof';
  const expectedDbName = process.env.DB_NAME || 'RealityProof';

  console.log('================================================================');
  console.log('      REALITYPROOF PROGRAMMATIC MONGODB VERIFICATION SUITE      ');
  console.log('================================================================');
  console.log(`[Config] Target URI: ${uri.replace(/\/\/[^@]+@/, '//***:***@')}`);
  console.log(`[Config] Expected DB: ${expectedDbName}`);
  console.log(`[Config] Test Worker: ${TEST_WORKER_ID}`);
  console.log(`[Config] Test Task:   ${TEST_TASK_ID}`);
  console.log('----------------------------------------------------------------\n');

  let passed = 0;
  let failed = 0;
  const errors = [];

  async function step(stepNumber, description, testFn) {
    process.stdout.write(`[Step ${stepNumber}] ${description.padEnd(52, '.')} `);
    try {
      await testFn();
      console.log('PASSED ✓');
      passed++;
    } catch (err) {
      console.log('FAILED ✗');
      console.error(`         └─ Error: ${err.message}`);
      failed++;
      errors.push({ step: stepNumber, description, error: err.message });
      throw err; // Stop on first critical failure
    }
  }

  let createdWorkerDoc = null;
  let createdTaskDoc = null;
  let createdActivityDoc = null;

  try {
    // -------------------------------------------------------------
    // STEP 1: Active MongoDB Connectivity & DB Name Validation
    // -------------------------------------------------------------
    await step(1, 'Active MongoDB Connection & DB Name Validation', async () => {
      await mongoose.connect(uri, {
        dbName: expectedDbName,
        serverSelectionTimeoutMS: 10000,
        family: 4,
      });

      if (mongoose.connection.readyState !== 1) {
        throw new Error(`MongoDB connection readyState is ${mongoose.connection.readyState} (expected 1: connected)`);
      }

      const activeDbName = mongoose.connection.name;
      if (activeDbName.toLowerCase() !== expectedDbName.toLowerCase()) {
        throw new Error(`Connected database "${activeDbName}" does not match expected "${expectedDbName}"`);
      }
    });

    // -------------------------------------------------------------
    // STEP 2: Database Admin Ping Response
    // -------------------------------------------------------------
    await step(2, 'Database Admin Ping (Connectivity Latency)', async () => {
      const pingResult = await mongoose.connection.db.admin().ping();
      if (!pingResult || pingResult.ok !== 1) {
        throw new Error(`Admin ping returned unexpected response: ${JSON.stringify(pingResult)}`);
      }
    });

    // -------------------------------------------------------------
    // STEP 3: Required Collections Existence & Model Binding
    // -------------------------------------------------------------
    await step(3, 'Collection Existence & Model Registration', async () => {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map((c) => c.name);

      console.log(`\n         [Catalog] Discovered collections: [${collectionNames.join(', ')}]`);

      // Ensure models are registered in Mongoose
      if (!mongoose.models.Worker || !mongoose.models.Task || !mongoose.models.Activity) {
        throw new Error('Mongoose models Worker, Task, or Activity are not properly registered');
      }

      // If collections exist in DB, verify expected collections are present
      const required = ['workers', 'tasks', 'activities'];
      const missing = required.filter((r) => !collectionNames.includes(r));
      if (missing.length > 0) {
        console.log(`         [Notice] Collections [${missing.join(', ')}] will be automatically provisioned on document creation.`);
      }
    });

    // -------------------------------------------------------------
    // STEP 4: Full CRUD Cycle on Worker Collection
    // -------------------------------------------------------------
    await step(4, 'Worker Collection: Create & Validate Schema Fields', async () => {
      createdWorkerDoc = await Worker.create({
        workerId: TEST_WORKER_ID,
        name: 'Automated Test Verifier',
        email: TEST_EMAIL,
        phone: '+91 98888 77777',
        city: 'Pune',
        zone: 'Pune Verification Core',
        rating: 5.0,
        accuracy: 99.5,
        completedJobs: 0,
        tasksToday: 0,
        balance: 0.0,
        status: 'Active',
        reliabilityScore: 98,
        paypalStatus: 'Linked & Verified',
      });

      if (!createdWorkerDoc || createdWorkerDoc.workerId !== TEST_WORKER_ID) {
        throw new Error('Worker document creation failed or workerId mismatch');
      }

      // Verify auto-generated avatar initials pre-save hook
      if (createdWorkerDoc.avatar !== 'AT') {
        throw new Error(`Worker avatar initials mismatch: expected 'AT', got '${createdWorkerDoc.avatar}'`);
      }
    });

    await step(5, 'Worker Collection: Read, Virtuals & Index Lookup', async () => {
      const foundWorker = await Worker.findOne({ workerId: TEST_WORKER_ID });
      if (!foundWorker) {
        throw new Error(`Worker with workerId ${TEST_WORKER_ID} not found in database`);
      }

      const jsonObj = foundWorker.toJSON();
      if (jsonObj.id !== TEST_WORKER_ID) {
        throw new Error(`Worker virtual 'id' mismatch: expected ${TEST_WORKER_ID}, got ${jsonObj.id}`);
      }
      if (jsonObj.location !== 'Pune') {
        throw new Error(`Worker virtual 'location' mismatch: expected 'Pune', got '${jsonObj.location}'`);
      }
      if (jsonObj.verifiedRate !== '99.5%') {
        throw new Error(`Worker virtual 'verifiedRate' mismatch: expected '99.5%', got '${jsonObj.verifiedRate}'`);
      }
    });

    await step(6, 'Worker Collection: Atomic Update & Metric Persistence', async () => {
      const updatedWorker = await Worker.findOneAndUpdate(
        { workerId: TEST_WORKER_ID },
        {
          $set: {
            completedJobs: 15,
            balance: 245.5,
            tasksToday: 2,
            recentTask: 'RP-TEST-VERIFIED',
          },
        },
        { new: true }
      );

      if (!updatedWorker) {
        throw new Error('Worker update failed');
      }
      if (updatedWorker.completedJobs !== 15 || updatedWorker.balance !== 245.5 || updatedWorker.tasksToday !== 2) {
        throw new Error(`Worker metrics failed to persist correctly: completedJobs=${updatedWorker.completedJobs}, balance=${updatedWorker.balance}`);
      }

      const json = updatedWorker.toJSON();
      if (json.formattedBalance !== '$245.50') {
        throw new Error(`Worker virtual 'formattedBalance' mismatch: expected '$245.50', got '${json.formattedBalance}'`);
      }
    });

    // -------------------------------------------------------------
    // STEP 7: Full CRUD Cycle on Task Collection with Relation
    // -------------------------------------------------------------
    await step(7, 'Task Collection: Create with Worker Relation', async () => {
      createdTaskDoc = await Task.create({
        taskId: TEST_TASK_ID,
        title: 'Programmatic Verification Inspection',
        description: 'Verifying automated database task pipeline integrity',
        category: 'Visual Verification',
        location: 'Pune',
        address: 'Pune Tech Zone, Phase 1',
        assignedWorker: createdWorkerDoc._id,
        budget: 65.0,
        deadline: '2026-11-06 18:00',
        status: 'Pending',
        verificationStatus: 'Pending',
        confidenceScore: 0,
        evidenceRequirements: [
          { label: 'Storefront Frontal View', status: 'pending', description: 'Clear unobstructed view' },
          { label: 'Shelf Stock Geotag', status: 'pending', description: 'GPS verified' },
        ],
        aiChecks: {
          perceptualHashMatch: false,
          exifVerified: true,
          geoFenceMatch: true,
        },
      });

      if (!createdTaskDoc || createdTaskDoc.taskId !== TEST_TASK_ID) {
        throw new Error('Task document creation failed');
      }
    });

    await step(8, 'Task Collection: Read & Populate Worker Relation', async () => {
      const fetchedTask = await Task.findOne({ taskId: TEST_TASK_ID }).populate('assignedWorker');
      if (!fetchedTask) {
        throw new Error(`Task with taskId ${TEST_TASK_ID} not found`);
      }
      if (!fetchedTask.assignedWorker || fetchedTask.assignedWorker.workerId !== TEST_WORKER_ID) {
        throw new Error('Task assignedWorker population failed or workerId mismatch');
      }

      const jsonTask = fetchedTask.toJSON();
      if (jsonTask.id !== TEST_TASK_ID) {
        throw new Error(`Task virtual 'id' mismatch: expected ${TEST_TASK_ID}, got ${jsonTask.id}`);
      }
      if (jsonTask.worker.id !== TEST_WORKER_ID) {
        throw new Error(`Task populated worker alias 'worker.id' mismatch: expected ${TEST_WORKER_ID}, got ${jsonTask.worker.id}`);
      }
    });

    await step(9, 'Task Collection: Update Status & Verification Scoring', async () => {
      const updatedTask = await Task.findOneAndUpdate(
        { taskId: TEST_TASK_ID },
        {
          $set: {
            status: 'Completed',
            verificationStatus: 'Verified',
            confidenceScore: 98.4,
            paymentStatus: 'Completed',
            exceptionReason: '',
          },
        },
        { new: true }
      );

      if (!updatedTask) {
        throw new Error('Task update failed');
      }
      if (updatedTask.verificationStatus !== 'Verified' || updatedTask.confidenceScore !== 98.4 || updatedTask.paymentStatus !== 'Completed') {
        throw new Error('Task update fields did not persist correctly');
      }
    });

    // -------------------------------------------------------------
    // STEP 10: Full CRUD Cycle on Activity Collection
    // -------------------------------------------------------------
    await step(10, 'Activity Collection: Create, Read & Format Audit Trail', async () => {
      createdActivityDoc = await Activity.create({
        taskId: TEST_TASK_ID,
        activityType: 'VERIFICATION_TEST',
        title: 'Programmatic Verification Activity Event',
        description: `Verified task ${TEST_TASK_ID} successfully persisted`,
        actor: 'VerificationAutomator',
        level: 'info',
        source: 'VerifyDBScript',
      });

      if (!createdActivityDoc || !createdActivityDoc._id) {
        throw new Error('Activity creation failed');
      }

      const fetchedActivity = await Activity.findById(createdActivityDoc._id);
      if (!fetchedActivity || fetchedActivity.taskId !== TEST_TASK_ID) {
        throw new Error('Activity read failed or taskId mismatch');
      }

      const jsonAct = fetchedActivity.toJSON();
      if (!jsonAct.id || !jsonAct.formattedTime) {
        throw new Error('Activity JSON transform virtuals (id, formattedTime) missing');
      }
    });

    // -------------------------------------------------------------
    // STEP 11: Schema Constraints & Validation Rejection Tests
    // -------------------------------------------------------------
    await step(11, 'Schema Constraint: Duplicate Unique Worker Key Rejection', async () => {
      let duplicateCaught = false;
      try {
        await Worker.create({
          workerId: TEST_WORKER_ID, // Duplicate workerId
          name: 'Duplicate Attempter',
          email: `unique.${Date.now()}@fieldforce.io`,
          city: 'Pune',
        });
      } catch (err) {
        if (err.code === 11000 || err.name === 'MongoServerError') {
          duplicateCaught = true;
        }
      }

      if (!duplicateCaught) {
        throw new Error('Expected duplicate workerId to be rejected with error 11000, but creation succeeded');
      }
    });

    await step(12, 'Schema Constraint: Missing Required Fields Rejection', async () => {
      let validationCaught = false;
      try {
        await Worker.create({
          // missing workerId, name, email, city
          phone: '+91 00000 00000',
        });
      } catch (err) {
        if (err.name === 'ValidationError') {
          validationCaught = true;
        }
      }

      if (!validationCaught) {
        throw new Error('Expected missing required fields to trigger ValidationError, but creation succeeded');
      }
    });

    await step(13, 'Schema Constraint: Invalid Enum Value Rejection', async () => {
      let enumCaught = false;
      try {
        await Task.create({
          taskId: `INVALID-ENUM-${Date.now()}`,
          title: 'Invalid Enum Test Task',
          location: 'Pune',
          budget: 50.0,
          verificationStatus: 'NonExistentStatus', // Invalid enum
        });
      } catch (err) {
        if (err.name === 'ValidationError') {
          enumCaught = true;
        }
      }

      if (!enumCaught) {
        throw new Error('Expected invalid enum value to trigger ValidationError, but creation succeeded');
      }
    });

    await step(14, 'Schema Constraint: Negative Budget Boundary Rejection', async () => {
      let budgetCaught = false;
      try {
        await Task.create({
          taskId: `INVALID-BUDGET-${Date.now()}`,
          title: 'Negative Budget Test Task',
          location: 'Pune',
          budget: -100.0, // Below min: 0
        });
      } catch (err) {
        if (err.name === 'ValidationError') {
          budgetCaught = true;
        }
      }

      if (!budgetCaught) {
        throw new Error('Expected negative budget to trigger ValidationError (min: 0), but creation succeeded');
      }
    });

    // -------------------------------------------------------------
    // STEP 15: Dynamic Aggregation Pipelines ($facet & $group)
    // -------------------------------------------------------------
    await step(15, 'Dynamic Aggregation Pipeline ($facet on Tasks)', async () => {
      const facetResult = await Task.aggregate([
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: '$verificationStatus',
                  count: { $sum: 1 },
                },
              },
            ],
            pendingPayment: [
              { $match: { paymentStatus: 'Pending' } },
              {
                $group: {
                  _id: null,
                  totalAmount: { $sum: '$budget' },
                  count: { $sum: 1 },
                },
              },
            ],
            zones: [
              {
                $group: {
                  _id: '$location',
                  totalTasks: { $sum: 1 },
                },
              },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);

      if (!facetResult || !facetResult[0] || !Array.isArray(facetResult[0].statusCounts)) {
        throw new Error('Task $facet aggregation returned unexpected structure');
      }
    });

    await step(16, 'Dynamic Aggregation Pipeline ($group on Workers)', async () => {
      const workerGroupResult = await Worker.aggregate([
        { $match: { status: 'Active' } },
        {
          $group: {
            _id: { $toLower: '$city' },
            activeWorkers: { $sum: 1 },
          },
        },
      ]);

      if (!Array.isArray(workerGroupResult)) {
        throw new Error('Worker $group aggregation did not return an array');
      }
    });

    // -------------------------------------------------------------
    // STEP 17: Idempotent Teardown & Zero Residual Test Data
    // -------------------------------------------------------------
    await step(17, 'Teardown: Clean Removal of Test Documents', async () => {
      await Task.deleteOne({ taskId: TEST_TASK_ID });
      await Worker.deleteOne({ workerId: TEST_WORKER_ID });
      if (createdActivityDoc) {
        await Activity.deleteOne({ _id: createdActivityDoc._id });
      }

      // Verify deletion
      const remainingTask = await Task.findOne({ taskId: TEST_TASK_ID });
      const remainingWorker = await Worker.findOne({ workerId: TEST_WORKER_ID });
      const remainingActivity = createdActivityDoc
        ? await Activity.findById(createdActivityDoc._id)
        : null;

      if (remainingTask || remainingWorker || remainingActivity) {
        throw new Error('Test documents failed to delete cleanly during teardown');
      }
    });

    await step(18, 'Zero Residual Data Verification (Regex Audit)', async () => {
      const residualTasks = await Task.countDocuments({ taskId: /^VERIFY-/ });
      const residualWorkers = await Worker.countDocuments({ workerId: /^VERIFY-/ });
      const residualActivities = await Activity.countDocuments({ activityType: 'VERIFICATION_TEST' });

      if (residualTasks > 0 || residualWorkers > 0 || residualActivities > 0) {
        throw new Error(`Residual test data detected: ${residualTasks} tasks, ${residualWorkers} workers, ${residualActivities} activities`);
      }
    });

  } finally {
    // Safety cleanup in case an earlier step threw
    try {
      await Task.deleteMany({ taskId: /^VERIFY-/ });
      await Worker.deleteMany({ workerId: /^VERIFY-/ });
      await Activity.deleteMany({ activityType: 'VERIFICATION_TEST' });
    } catch (cleanupErr) {
      console.warn('Notice: Emergency safety cleanup encountered:', cleanupErr.message);
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('\n[MongoDB] Connection safely closed.');
    }

    console.log('----------------------------------------------------------------');
    console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================');
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDatabaseVerification().catch((err) => {
  console.error('\n[FATAL] Verification suite crashed:', err.message);
  process.exit(1);
});
