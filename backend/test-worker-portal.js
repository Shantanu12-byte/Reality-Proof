/**
 * RealityProof Worker Portal Test Suite
 * Validates the complete mobile-first worker flow and backend security:
 * 
 * 1. Demo worker listing (GET /api/worker/demo-list)
 * 2. Worker Login & JWT/Session issue (POST /api/worker/login)
 * 3. Worker Profile & Stats (/api/worker/me)
 * 4. Worker Task List Isolation (/api/worker/tasks - only assigned tasks returned)
 * 5. Worker Task Details & Checklist (/api/worker/tasks/:id)
 * 6. Strict Backend Ownership Enforcement (403 when requesting other worker's task)
 * 7. Evidence Photo Upload (POST /api/evidence/upload)
 * 8. Evidence Submission & Pipeline Trigger (POST /api/evidence/submit)
 * 9. Duplicate rapid submission protection (429 / idempotent handling)
 * 10. Worker Submission History & Verification Reports (GET /api/worker/submissions)
 * 11. Forbidden Submission on Other Worker's Task (403 enforcement)
 */

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { connectDB } from './config/db.js';
import { Task } from './models/Task.js';
import { Worker } from './models/Worker.js';
import { Verification } from './models/Verification.js';
import workerPortalRoutes from './routes/workerPortalRoutes.js';
import evidenceRoutes from './routes/evidenceRoutes.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ✗ [FAIL] ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`  ✓ [PASS] ${message}`);
    passed++;
  }
}

async function createTestImageBuffer() {
  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#6C5DD3"/>
      <rect x="50" y="50" width="300" height="80" fill="#ffffff" rx="10"/>
      <text x="200" y="100" font-family="sans-serif" font-size="20" font-weight="bold" fill="#333333" text-anchor="middle">
        PROMO SIGNAGE 50% OFF
      </text>
      <circle cx="100" cy="200" r="30" fill="#10B981"/>
      <text x="100" y="206" font-family="sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">$19.99</text>
      <circle cx="200" cy="200" r="30" fill="#F59E0B"/>
      <text x="200" y="206" font-family="sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">$19.99</text>
      <circle cx="300" cy="200" r="30" fill="#EF4444"/>
      <text x="300" y="206" font-family="sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">$19.99</text>
    </svg>
  `;
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('   REALITYPROOF WORKER PORTAL — AUTOMATED VERIFICATION SUITE   ');
  console.log('===============================================================\n');

  // 1. Connect to Database
  console.log('[Setup] Connecting to MongoDB...');
  await connectDB();

  // 2. Setup isolated test Express app on port 5098
  const testApp = express();
  testApp.use(express.json());
  testApp.use(express.urlencoded({ extended: true }));
  testApp.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  testApp.use('/api/worker', workerPortalRoutes);
  testApp.use('/api/evidence', evidenceRoutes);

  const TEST_PORT = 5098;
  const server = testApp.listen(TEST_PORT);
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  try {
    // Ensure worker WRK-401 and WRK-402 exist
    let worker1 = await Worker.findOne({ workerId: 'WRK-401' });
    if (!worker1) {
      worker1 = await Worker.create({
        workerId: 'WRK-401',
        name: 'Neha Joshi',
        email: 'neha.joshi@fieldforce.realityproof.ai',
        city: 'Mumbai',
        zone: 'BKC / Bandra West',
        rating: 4.9,
        accuracy: 98.4,
        completedJobs: 142,
        balance: 1420.0,
        status: 'Active',
      });
    }

    let worker2 = await Worker.findOne({ workerId: 'WRK-402' });
    if (!worker2) {
      worker2 = await Worker.create({
        workerId: 'WRK-402',
        name: 'Marcus Vance',
        email: 'marcus.vance@fieldforce.realityproof.ai',
        city: 'Chicago',
        zone: 'West Loop',
        rating: 4.8,
        accuracy: 97.5,
        completedJobs: 98,
        balance: 850.0,
        status: 'Active',
      });
    }

    // Ensure task RP-1002 is assigned to worker1 and RP-1001 is assigned to worker2
    let task1 = await Task.findOne({ taskId: 'RP-1002' });
    if (!task1) {
      task1 = await Task.create({
        taskId: 'RP-1002',
        title: 'Retail Promotional Display Inspection',
        description: 'Inspect endcap promo signage, price accuracy, and product count.',
        location: 'Mumbai Central Mall, Bay 4',
        budget: '$75.00',
        payoutAmount: 75.0,
        deadline: 'Tomorrow, 5:00 PM',
        status: 'Pending',
        assignedWorker: worker1._id,
        evidenceRequirements: [
          { label: 'Full display photograph', status: 'pending', description: 'Show whole endcap display' },
          { label: 'Promotional signage photograph', status: 'pending', description: 'Promo banner and discounts' },
          { label: 'Price label photograph', status: 'pending', description: 'Readable price tag' },
          { label: 'Product arrangement close-up', status: 'pending', description: 'Product tiers and packaging' },
        ],
      });
    } else {
      task1.assignedWorker = worker1._id;
      task1.status = 'Pending';
      await task1.save();
    }

    let taskOther = await Task.findOne({ taskId: 'RP-1001' });
    if (!taskOther) {
      taskOther = await Task.create({
        taskId: 'RP-1001',
        title: 'Supermarket Shelf Compliance',
        location: 'Chicago Downtown Market',
        budget: '$60.00',
        payoutAmount: 60.0,
        deadline: 'Today, 6:00 PM',
        status: 'Pending',
        assignedWorker: worker2._id,
      });
    } else {
      taskOther.assignedWorker = worker2._id;
      await taskOther.save();
    }

    // -------------------------------------------------------------
    // TEST 1: GET /api/worker/demo-list
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Fetch Demo Workers List ---');
    const demoRes = await fetch(`${BASE_URL}/api/worker/demo-list`);
    const demoData = await demoRes.json();
    assert(demoRes.status === 200, 'Demo list returned status 200');
    assert(demoData.success === true, 'Response marked success');
    assert(Array.isArray(demoData.data) && demoData.data.length > 0, `Returned ${demoData.data.length} demo workers`);
    const foundW1 = demoData.data.find((w) => w.workerId === 'WRK-401');
    assert(foundW1 !== undefined, 'Found WRK-401 (Neha Joshi) in demo list');

    // -------------------------------------------------------------
    // TEST 2: POST /api/worker/login
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Worker Login Authentication ---');
    const loginRes = await fetch(`${BASE_URL}/api/worker/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerId: 'WRK-401', password: 'testing123' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Worker login returned status 200');
    assert(loginData.success === true, 'Login response success=true');
    const workerToken = loginData.token || loginData.data?.token || loginData.data?.workerId;
    assert(workerToken !== undefined && workerToken.length > 0, 'Session token issued');
    const workerObj = loginData.data?.worker || loginData.data;
    assert(workerObj.workerId === 'WRK-401', 'Worker ID is WRK-401');

    // -------------------------------------------------------------
    // TEST 3: GET /api/worker/me
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Authenticated Worker Profile & Balances ---');
    const meRes = await fetch(`${BASE_URL}/api/worker/me`, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Worker /me returned 200');
    assert(meData.data.name === 'Neha Joshi', 'Authenticated user matches Neha Joshi');
    assert(meData.data.stats !== undefined, 'Stats object is present');
    assert(typeof meData.data.stats.availableBalance === 'number', 'Available balance is numeric');

    // -------------------------------------------------------------
    // TEST 4: GET /api/worker/tasks (Worker Task Isolation)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Worker Task List Isolation ---');
    const tasksRes = await fetch(`${BASE_URL}/api/worker/tasks`, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
    });
    const tasksData = await tasksRes.json();
    assert(tasksRes.status === 200, 'Tasks endpoint returned 200');
    assert(Array.isArray(tasksData.data), 'Tasks data is array');
    const hasOnlyOwnTasks = tasksData.data.every((t) => t.taskId !== 'RP-1001');
    assert(hasOnlyOwnTasks, 'Tasks assigned to other workers (RP-1001) are strictly excluded');
    const hasAssignedTask = tasksData.data.some((t) => t.taskId === 'RP-1002');
    assert(hasAssignedTask, 'Worker sees their assigned task RP-1002');

    // -------------------------------------------------------------
    // TEST 5: GET /api/worker/tasks/:id (Task Detail & Requirements)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Worker Task Detail & Requirements Checklist ---');
    const taskDetailRes = await fetch(`${BASE_URL}/api/worker/tasks/RP-1002`, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
    });
    const taskDetailData = await taskDetailRes.json();
    assert(taskDetailRes.status === 200, 'Task detail returned 200');
    assert(taskDetailData.data.taskId === 'RP-1002', 'Task ID is RP-1002');
    assert(
      Array.isArray(taskDetailData.data.evidenceRequirements) &&
        taskDetailData.data.evidenceRequirements.length === 4,
      'Contains 4 required evidence checklist items'
    );

    // -------------------------------------------------------------
    // TEST 6: Strict Backend Ownership Enforcement on Task Details
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Strict Backend Ownership Enforcement (403 on RP-1001) ---');
    const forbiddenRes = await fetch(`${BASE_URL}/api/worker/tasks/RP-1001`, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
    });
    assert(forbiddenRes.status === 403, 'Forbidden 403 returned when accessing another worker task');
    const forbiddenData = await forbiddenRes.json();
    assert(forbiddenData.success === false, 'success is false');
    assert(forbiddenData.message.includes('Access denied'), 'Error message states access denied');

    // -------------------------------------------------------------
    // TEST 7: POST /api/evidence/upload (Multipart Image Upload)
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Multipart Evidence Photo Upload ---');
    const imageBuffer = await createTestImageBuffer();
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('images', blob, 'field_inspection_display.png');

    const uploadRes = await fetch(`${BASE_URL}/api/evidence/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201, 'Upload returned 201 Created');
    assert(uploadData.success === true, 'Upload response success=true');
    assert(Array.isArray(uploadData.data) && uploadData.data.length === 1, '1 asset recorded');
    const uploadedAsset = uploadData.data[0];
    assert(uploadedAsset.url && uploadedAsset.url.startsWith('/uploads/evidence/'), 'Asset saved to /uploads/evidence/');
    console.log(`    Uploaded asset URL: ${uploadedAsset.url}`);

    // -------------------------------------------------------------
    // TEST 8: POST /api/evidence/submit (Submit Evidence & Transition Status)
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Submit Evidence with Metadata & Pipeline Trigger ---');
    const submitPayload = {
      taskId: 'RP-1002',
      evidenceList: [
        {
          id: '1',
          url: uploadedAsset.url,
          filename: uploadedAsset.filename,
          requirementLabel: 'Full display photograph',
          notes: 'Captured live front-facing view of endcap',
        },
      ],
      submissionMetadata: {
        submissionTimestamp: new Date().toISOString(),
        device: {
          userAgent: 'FieldInspectorApp/2.4 (Android 14; Pixel 8 Pro)',
          platform: 'Mobile',
        },
        gps: {
          latitude: 19.0760,
          longitude: 72.8777,
          accuracy: 5.2,
        },
      },
    };

    const submitRes = await fetch(`${BASE_URL}/api/evidence/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify(submitPayload),
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 200, 'Submit returned 200');
    assert(submitData.success === true, 'Evidence submission accepted');
    assert(submitData.submissionId, `Submission ID generated: ${submitData.submissionId}`);
    const updatedTask = submitData.data?.task || submitData.task;
    assert(updatedTask.status === 'Under Review', 'Task status transitioned to Under Review');

    // -------------------------------------------------------------
    // TEST 9: Duplicate Rapid Submission Throttling
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Rapid Duplicate Submission Throttling ---');
    const dupRes = await fetch(`${BASE_URL}/api/evidence/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify(submitPayload),
    });
    // Should be rate limited / duplicate protected (429)
    assert(dupRes.status === 429, 'Instant duplicate submission blocked with status 429');

    // -------------------------------------------------------------
    // TEST 10: GET /api/worker/submissions (Submission History)
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Worker Submission History & Verification Reports ---');
    const historyRes = await fetch(`${BASE_URL}/api/worker/submissions`, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
      },
    });
    const historyData = await historyRes.json();
    assert(historyRes.status === 200, 'Submissions history returned 200');
    assert(historyData.success === true, 'Submissions response success=true');
    assert(Array.isArray(historyData.data), 'Submissions list is array');
    console.log(`    Total submissions found: ${historyData.data.length}`);
    const foundSubmission = historyData.data.find((s) => s.taskId === 'RP-1002');
    assert(foundSubmission !== undefined, 'RP-1002 submission is present in history');

    // -------------------------------------------------------------
    // TEST 11: Forbidden Submission on Other Worker's Task
    // -------------------------------------------------------------
    console.log('\n--- Test 11: Submission Blocked on Another Worker Task (RP-1001) ---');
    const badSubmitRes = await fetch(`${BASE_URL}/api/evidence/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({
        taskId: 'RP-1001',
        evidenceList: [{ url: uploadedAsset.url, label: 'Sign' }],
      }),
    });
    assert(badSubmitRes.status === 403, 'Forbidden 403 returned on unauthorized task submission');

    console.log('\n===============================================================');
    console.log(`   ALL TESTS PASSED! (${passed} checks passed, ${failed} failed)`);
    console.log('===============================================================\n');
  } catch (err) {
    console.error('\nTest Suite execution failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.connection.close();
    console.log('[Cleanup] Test server and database connections closed cleanly.');
  }
}

runTestSuite();
