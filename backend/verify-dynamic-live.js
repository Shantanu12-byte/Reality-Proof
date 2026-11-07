/**
 * RealityProof Automated E2E Dynamic Live Verification Suite
 *
 * Verifies live HTTP REST API endpoints, confirms responses reflect live MongoDB queries,
 * verifies complete eradication of dummy tasks (RP-1015 through RP-1024),
 * verifies preservation of authentic field worker data, and audits dynamic worker
 * state propagation upon task verification.
 *
 * Can execute against an active server or start an embedded instance automatically.
 * Exit code 0 on success, code 1 on failure.
 */

import http from 'http';
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

const PORT = process.env.PORT || 5000;
const DUMMY_TASK_IDS = [
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

async function runDynamicLiveVerification() {
  console.log('================================================================');
  console.log('      REALITYPROOF E2E DYNAMIC LIVE VERIFICATION SUITE          ');
  console.log('================================================================');
  console.log(`[Config] Target Host: http://127.0.0.1:${PORT}`);
  console.log(`[Config] Database:    ${process.env.DB_NAME || 'RealityProof'}`);
  console.log('----------------------------------------------------------------\n');

  let passed = 0;
  let failed = 0;
  const discoveredDefects = [];

  // Helper for running and logging verification steps
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
      discoveredDefects.push({ step: stepNumber, description, error: err.message });
      throw err;
    }
  }

  let serverInstance = null;
  let isExternalServer = false;
  const baseUrl = `http://127.0.0.1:${PORT}`;

  // Ensure Mongoose is connected for database-level assertions
  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realityproof';
    const dbName = process.env.DB_NAME || 'RealityProof';
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
  }

  // Probe whether backend server is already running externally
  try {
    const ping = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(2000) });
    if (ping.ok) {
      isExternalServer = true;
      console.log('[Runner] Detected active RealityProof server on port ' + PORT);
    }
  } catch (e) {
    isExternalServer = false;
  }

  // If server is not running, bootstrap Express app
  if (!isExternalServer) {
    console.log('[Runner] Bootstrapping embedded Express test server...');
    const serverModule = await import('./server.js');
    const app = serverModule.default;

    // Wait until server is reachable
    let serverReady = false;
    for (let attempt = 0; attempt < 25; attempt++) {
      try {
        const ping = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(1000) });
        if (ping.ok) {
          serverReady = true;
          break;
        }
      } catch (err) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (!serverReady) {
      throw new Error(`Failed to initialize embedded server at ${baseUrl} within timeout`);
    }
  }

  let createdTestTask = null;
  let initialWorkerState = null;

  try {
    // -------------------------------------------------------------
    // STEP 1: Live Health Check API Verification
    // -------------------------------------------------------------
    await step(1, 'Live Health Check API (GET /api/health)', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      if (!res.ok) {
        throw new Error(`Health check returned HTTP status ${res.status}`);
      }
      const data = await res.json();
      if (data.status !== 'ok') {
        throw new Error(`Health status expected 'ok', got '${data.status}'`);
      }
      if (data.mongodb !== 'connected') {
        throw new Error(`MongoDB status expected 'connected', got '${data.mongodb}'`);
      }
    });

    // -------------------------------------------------------------
    // STEP 2: Dummy Data Eradication Audit (Requirement F2 / R2)
    // -------------------------------------------------------------
    await step(2, 'Dummy Data Eradication Audit in API & Database', async () => {
      // 1. Audit HTTP API response
      const res = await fetch(`${baseUrl}/api/tasks`);
      if (!res.ok) {
        throw new Error(`GET /api/tasks returned HTTP status ${res.status}`);
      }
      const json = await res.json();
      const taskList = Array.isArray(json) ? json : json.data || [];

      const foundDummyInApi = taskList.filter((t) => DUMMY_TASK_IDS.includes(t.taskId || t.id));
      if (foundDummyInApi.length > 0) {
        const dummyIds = foundDummyInApi.map((t) => t.taskId || t.id).join(', ');
        throw new Error(`Static dummy tasks found in GET /api/tasks response: [${dummyIds}]`);
      }

      // 2. Audit MongoDB database directly
      const foundDummyInDb = await Task.find({ taskId: { $in: DUMMY_TASK_IDS } }).select('taskId');
      if (foundDummyInDb.length > 0) {
        const dummyDbIds = foundDummyInDb.map((t) => t.taskId).join(', ');
        throw new Error(`Static dummy tasks [${dummyDbIds}] still persist in MongoDB! Complete database sanitization required.`);
      }
    });

    // -------------------------------------------------------------
    // STEP 3: Authentic Worker Preservation Audit (Requirement F3 / R2)
    // -------------------------------------------------------------
    await step(3, 'Authentic Worker Preservation Audit (GET /api/workers)', async () => {
      const res = await fetch(`${baseUrl}/api/workers`);
      if (!res.ok) {
        throw new Error(`GET /api/workers returned HTTP status ${res.status}`);
      }
      const json = await res.json();
      const workers = Array.isArray(json) ? json : json.data || [];

      if (workers.length === 0) {
        throw new Error('GET /api/workers returned 0 workers. Worker data not preserved!');
      }

      // Check for expected authentic worker WRK-401 (Neha Joshi)
      const neha = workers.find((w) => (w.workerId || w.id) === 'WRK-401');
      if (!neha) {
        throw new Error('Authentic worker WRK-401 (Neha Joshi) not found in workers API');
      }

      // Validate numeric dynamic fields
      if (typeof neha.accuracy !== 'number' && typeof neha.verifiedRate !== 'string') {
        throw new Error('Worker accuracy/verifiedRate is missing or malformed');
      }
      if (typeof neha.completedJobs !== 'number' && typeof neha.tasksCompleted !== 'number') {
        throw new Error('Worker completedJobs/tasksCompleted is missing or malformed');
      }
      if (neha.balance === undefined) {
        throw new Error('Worker balance is undefined');
      }
    });

    // -------------------------------------------------------------
    // STEP 4: Live Dashboard Summary Calculation Audit (Requirement F5)
    // -------------------------------------------------------------
    await step(4, 'Live Dashboard Summary Calculation Audit', async () => {
      const res = await fetch(`${baseUrl}/api/dashboard/summary`);
      if (!res.ok) {
        throw new Error(`GET /api/dashboard/summary returned HTTP status ${res.status}`);
      }
      const json = await res.json();
      const summary = json.data || json;

      if (typeof summary.totalTasks !== 'number') {
        throw new Error('Dashboard summary totalTasks is not a number');
      }
      if (typeof summary.activeWorkers !== 'number' && typeof summary.activeInspectors !== 'number') {
        throw new Error('Dashboard summary activeWorkers/activeInspectors is not a number');
      }
    });

    // -------------------------------------------------------------
    // STEP 5: Dynamic Task Creation via HTTP REST API
    // -------------------------------------------------------------
    await step(5, 'Dynamic Task Creation (POST /api/tasks)', async () => {
      // Find authentic worker WRK-401 to capture baseline metrics
      const workerDoc = await Worker.findOne({ workerId: 'WRK-401' });
      if (!workerDoc) {
        throw new Error('Baseline worker WRK-401 not found in database');
      }
      initialWorkerState = {
        workerId: workerDoc.workerId,
        _id: workerDoc._id,
        completedJobs: workerDoc.completedJobs || 0,
        balance: workerDoc.balance || 0,
      };

      const taskPayload = {
        title: 'E2E Live Verification Dynamic Test',
        location: 'Pune',
        budget: 50.0,
        workerId: 'WRK-401',
        description: 'Automated test task for live verification & worker propagation',
        category: 'Visual Verification',
        evidenceRequirements: ['Storefront Verification Photo', 'GPS Geotag verification'],
      };

      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskPayload),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`POST /api/tasks returned HTTP ${res.status}: ${errBody}`);
      }

      const json = await res.json();
      createdTestTask = json.data || json;

      if (!createdTestTask || (!createdTestTask.taskId && !createdTestTask.id)) {
        throw new Error('Created task missing taskId/id in response');
      }

      const createdTaskId = createdTestTask.taskId || createdTestTask.id;
      if (DUMMY_TASK_IDS.includes(createdTaskId)) {
        throw new Error(`Newly created task received a deprecated dummy ID: ${createdTaskId}`);
      }
    });

    // -------------------------------------------------------------
    // STEP 6: Dynamic Task Retrieval via HTTP REST API
    // -------------------------------------------------------------
    await step(6, 'Dynamic Task Retrieval (GET /api/tasks/:id)', async () => {
      const taskId = createdTestTask.taskId || createdTestTask.id;
      const res = await fetch(`${baseUrl}/api/tasks/${taskId}`);
      if (!res.ok) {
        throw new Error(`GET /api/tasks/${taskId} returned HTTP ${res.status}`);
      }

      const json = await res.json();
      const fetched = json.data || json;

      if ((fetched.taskId || fetched.id) !== taskId) {
        throw new Error(`Retrieved task ID mismatch: expected ${taskId}, got ${fetched.taskId || fetched.id}`);
      }

      // Verify worker relation is populated
      const workerName = fetched.assignedWorker?.name || fetched.worker?.name;
      if (!workerName || !workerName.includes('Neha')) {
        throw new Error(`Expected populated worker name containing 'Neha', got '${workerName}'`);
      }
    });

    // -------------------------------------------------------------
    // STEP 7: Task Verification & Worker State Propagation Audit
    // -------------------------------------------------------------
    await step(7, 'Task Verification & Worker State Dynamic Propagation', async () => {
      const taskId = createdTestTask.taskId || createdTestTask.id;

      // Update task verification status to 'Verified' and payment to 'Completed'
      const updatePayload = {
        verificationStatus: 'Verified',
        confidenceScore: 98.5,
        status: 'Completed',
        paymentStatus: 'Completed',
      };

      const res = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`PUT /api/tasks/${taskId} returned HTTP ${res.status}: ${errBody}`);
      }

      const json = await res.json();
      const updated = json.data || json;

      if ((updated.verificationStatus || updated.aiResult) !== 'Verified') {
        throw new Error(`Task verificationStatus not updated to 'Verified', got '${updated.verificationStatus}'`);
      }

      // Audit Worker State Propagation in MongoDB
      const updatedWorker = await Worker.findById(initialWorkerState._id);
      if (!updatedWorker) {
        throw new Error('Assigned worker not found in database during propagation check');
      }

      // Check whether worker metrics were dynamically updated
      const expectedCompleted = initialWorkerState.completedJobs + 1;
      const expectedBalance = initialWorkerState.balance + 50.0;

      if (updatedWorker.completedJobs !== expectedCompleted || updatedWorker.balance !== expectedBalance) {
        const notice = `Worker propagation pending: completedJobs is ${updatedWorker.completedJobs} (expected ${expectedCompleted}), balance is ${updatedWorker.balance} (expected ${expectedBalance}).`;
        console.warn(`\n         [Implementation Notice] ${notice}`);
        // If M1 implementation of worker propagation is not yet merged, record defect
        throw new Error(notice);
      }
    });

    // -------------------------------------------------------------
    // STEP 8: Task Deletion & Idempotent Teardown via HTTP REST API
    // -------------------------------------------------------------
    await step(8, 'Task Deletion & Idempotent Teardown (DELETE /api/tasks/:id)', async () => {
      const taskId = createdTestTask.taskId || createdTestTask.id;

      const res = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(`DELETE /api/tasks/${taskId} returned HTTP ${res.status}`);
      }

      // Verify deletion from API
      const checkRes = await fetch(`${baseUrl}/api/tasks/${taskId}`);
      if (checkRes.status !== 404) {
        throw new Error(`Expected GET /api/tasks/${taskId} to return 404 after deletion, got ${checkRes.status}`);
      }

      // Verify deletion from MongoDB
      const checkDb = await Task.findOne({ taskId });
      if (checkDb) {
        throw new Error(`Task ${taskId} still exists in MongoDB after DELETE request`);
      }
    });

  } finally {
    // Teardown test task if still remaining
    if (createdTestTask) {
      const testTaskId = createdTestTask.taskId || createdTestTask.id;
      try {
        await Task.deleteOne({ taskId: testTaskId });
      } catch (e) {
        // ignore
      }
    }

    // Restore baseline worker stats if modified
    if (initialWorkerState) {
      try {
        await Worker.findByIdAndUpdate(initialWorkerState._id, {
          $set: {
            completedJobs: initialWorkerState.completedJobs,
            balance: initialWorkerState.balance,
          },
        });
      } catch (e) {
        // ignore
      }
    }

    // Safety purge of any test activities
    try {
      await Activity.deleteMany({ taskId: /^RP-TEST-/ });
    } catch (e) {
      // ignore
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('\n[MongoDB] Database connection closed.');
    }

    console.log('----------------------------------------------------------------');
    console.log(`E2E LIVE VERIFICATION SUMMARY: ${passed} Passed, ${failed} Failed`);
    if (discoveredDefects.length > 0) {
      console.log('\nDiscovered Implementation Issues to Escalate:');
      discoveredDefects.forEach((d) => {
        console.log(` - [Step ${d.step}] ${d.description}: ${d.error}`);
      });
    }
    console.log('================================================================');
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDynamicLiveVerification().catch((err) => {
  console.error('\n[FATAL] E2E Live Verification crashed:', err.message);
  process.exit(1);
});
