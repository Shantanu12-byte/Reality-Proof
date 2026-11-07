import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('\n===============================================================');
  console.log('   REALITYPROOF: GPS MAP & CRITICAL FLAG REMOVAL TEST SUITE    ');
  console.log('===============================================================\n');

  const mongooseModule = await import('mongoose');
  const mongoose = mongooseModule.default || mongooseModule;
  await mongoose.connect(process.env.MONGODB_URI);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Authenticate as Admin
  console.log('--- Step 1: Admin Authentication ---');
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'AdminPassword123!',
    }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200 && loginData.token, 'Admin logged in successfully and received JWT');
  const adminToken = loginData.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // --------------------------------------------------------------------------
  // REQUIREMENT 1: GPS Map Removal when Task is Done + Payment Settled/Released
  // --------------------------------------------------------------------------
  console.log('\n--- Requirement 1: GPS Map Task Removal on Completion & Settlement ---');

  // Create a new task in Pune
  const taskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Store Inventory GPS Check',
      description: 'Physical inventory audit at FC Road',
      location: 'Pune',
      address: 'FC Road, Pune, Maharashtra',
      budget: 45.0,
      assignedWorkerId: 'WRK001',
    }),
  });
  const taskData = await taskRes.json();
  const testTaskId = taskData.data?.taskId || taskData.taskId;
  assert(taskRes.status === 201 && testTaskId, `Created test task ${testTaskId}`);

  // Fetch telemetry before completion: Task MUST be on the GPS map
  let mapRes = await fetch(`${BASE_URL}/api/telemetry/locations`, { headers: authHeaders });
  let mapData = await mapRes.json();
  let foundOnMap = (mapData.data || []).some((node) => node.taskId === testTaskId);
  assert(foundOnMap, `Task ${testTaskId} is present on the GPS telemetry map while in progress`);

  // Now mark the task as done (Completed) and settle its payment / release payment
  const completeRes = await fetch(`${BASE_URL}/api/tasks/${testTaskId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      status: 'Completed',
      verificationStatus: 'Verified',
      paymentStatus: 'Completed',
    }),
  });
  assert(completeRes.status === 200, `Task ${testTaskId} marked Completed and payment Released/Settled`);

  // Fetch telemetry again: Task MUST BE REMOVED from the GPS map
  mapRes = await fetch(`${BASE_URL}/api/telemetry/locations`, { headers: authHeaders });
  mapData = await mapRes.json();
  foundOnMap = (mapData.data || []).some((node) => node.taskId === testTaskId);
  assert(!foundOnMap, `Task ${testTaskId} is successfully REMOVED from the GPS map once done and payment released`);

  // --------------------------------------------------------------------------
  // REQUIREMENT 2: Critical Task Removed from Flag IF AND ONLY IF Rejected
  // --------------------------------------------------------------------------
  console.log('\n--- Requirement 2: Critical Task Removed from Flag If and Only If Rejected ---');

  // Create a critical flagged task
  const criticalTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Perimeter Security Breach Check',
      description: 'Audit report flagged spoofed GPS and anomalous image',
      location: 'Mumbai',
      address: 'Bandra West, Mumbai',
      budget: 65.0,
      assignedWorkerId: 'WRK003',
    }),
  });
  const criticalTaskData = await criticalTaskRes.json();
  const critTaskId = criticalTaskData.data?.taskId || criticalTaskData.taskId;
  assert(criticalTaskRes.status === 201 && critTaskId, `Created task ${critTaskId}`);

  // Set it to Failed (Critical flag)
  await fetch(`${BASE_URL}/api/tasks/${critTaskId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      verificationStatus: 'Failed',
      exceptionReason: 'Critical geo-fence breach: 12.4km offset from site',
    }),
  });

  // Verify it appears in exceptions and counts as flagged
  let exRes = await fetch(`${BASE_URL}/api/dashboard/exceptions`, { headers: authHeaders });
  let exData = await exRes.json();
  let inExceptions = (exData.data || []).some((e) => e.taskId === critTaskId);
  assert(inExceptions, `Task ${critTaskId} is initially flagged and present in Exceptions`);

  // Create a Verification record for this critical task
  const { Verification } = await import('./models/Verification.js');
  const verifDoc = await Verification.create({
    taskId: critTaskId,
    riskScore: 85,
    riskCategory: 'critical',
    recommendation: 'reject',
    summary: 'Critical spoofing anomaly detected',
    overallAssessment: 'fail',
  });

  // Test non-reject decision first: requesting evidence or review required does NOT remove from flag
  await fetch(`${BASE_URL}/api/verifications/${verifDoc._id}/review`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      decision: 'request_evidence',
      notes: 'Please submit additional perimeter photo',
    }),
  });

  exRes = await fetch(`${BASE_URL}/api/dashboard/exceptions`, { headers: authHeaders });
  exData = await exRes.json();
  inExceptions = (exData.data || []).some((e) => e.taskId === critTaskId);
  assert(inExceptions, `Task ${critTaskId} REMAINS flagged when decision is request_evidence (not rejected)`);

  // Now REJECT the critical task: it must be removed from the flag
  const rejectRes = await fetch(`${BASE_URL}/api/verifications/${verifDoc._id}/review`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      decision: 'reject',
      notes: 'Fraudulent evidence confirmed. Task formally rejected.',
    }),
  });
  const rejectData = await rejectRes.json();
  assert(rejectRes.status === 200, `Recorded human review decision: REJECT on task ${critTaskId}`);
  assert(rejectData.data?.humanReview?.decision === 'rejected', 'Verification decision recorded as rejected');

  // Verify task status and verificationStatus in backend
  const checkTaskRes = await fetch(`${BASE_URL}/api/tasks/${critTaskId}`, { headers: authHeaders });
  const checkTaskData = await checkTaskRes.json();
  const taskState = checkTaskData.data || checkTaskData;
  assert(taskState.verificationStatus === 'Rejected', `Task verificationStatus is now "Rejected" (got "${taskState.verificationStatus}")`);
  assert(taskState.status === 'Rejected', `Task status is now "Rejected" (got "${taskState.status}")`);

  // Verify it is REMOVED from the Exceptions Panel
  exRes = await fetch(`${BASE_URL}/api/dashboard/exceptions`, { headers: authHeaders });
  exData = await exRes.json();
  inExceptions = (exData.data || []).some((e) => e.taskId === critTaskId);
  assert(!inExceptions, `Task ${critTaskId} is successfully REMOVED from Exceptions once rejected`);

  // Also verify it is NOT on the GPS map
  mapRes = await fetch(`${BASE_URL}/api/telemetry/locations`, { headers: authHeaders });
  mapData = await mapRes.json();
  foundOnMap = (mapData.data || []).some((node) => node.taskId === critTaskId);
  assert(!foundOnMap, `Rejected task ${critTaskId} is NOT rendered on the GPS map`);

  console.log('\n===============================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================\n');

  await mongoose.disconnect();
  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
