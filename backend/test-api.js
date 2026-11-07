// Comprehensive dynamic API verification script for RealityProof Backend
const BASE_URL = 'http://localhost:5000/api';

let adminToken = null;
const origFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const headers = { ...(opts.headers || {}) };
  if (adminToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${adminToken}`;
  }
  return origFetch(url, { ...opts, headers });
};

async function runTests() {
  console.log('--- Starting RealityProof Dynamic Backend API Verification ---');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Health check & Admin Login
  await test('GET /health & POST /admin/login', async () => {
    const res = await origFetch(`${BASE_URL}/health`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok' || data.mongodb !== 'connected') {
      throw new Error(`Unexpected payload: ${JSON.stringify(data)}`);
    }

    const loginRes = await origFetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'AdminPassword123!' }),
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.token) {
      throw new Error('Admin authentication failed');
    }
    adminToken = loginData.token;
  });

  // 2. Workers list: verify preserved 8 authentic inspectors
  await test('GET /workers (preserves 8 authentic field workers)', async () => {
    const res = await fetch(`${BASE_URL}/workers`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data) || json.data.length < 8) {
      throw new Error(`Expected at least 8 workers, got ${json.data?.length}`);
    }
    const workerIds = json.data.map((w) => w.workerId);
    const requiredWorkers = ['WRK-401', 'WRK-402', 'WRK-403', 'WRK-404', 'WRK-405', 'WRK-406', 'WRK-407', 'WRK-408'];
    for (const reqId of requiredWorkers) {
      if (!workerIds.includes(reqId)) {
        throw new Error(`Missing expected worker: ${reqId}`);
      }
    }
  });

  // 3. Worker search & city filter
  await test('GET /workers?search=Neha&city=Pune (search and filter)', async () => {
    const res = await fetch(`${BASE_URL}/workers?search=Neha&city=Pune`);
    const json = await res.json();
    if (json.data.length === 0 || json.data[0].name !== 'Neha Joshi') {
      throw new Error('Worker search failed for Neha Joshi');
    }
  });

  // 4. Single worker details & history
  let initialNehaBalance = 0;
  let initialNehaJobs = 0;
  await test('GET /workers/WRK-401 (details & history)', async () => {
    const res = await fetch(`${BASE_URL}/workers/WRK-401`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (json.data.workerId !== 'WRK-401' || !Array.isArray(json.data.taskHistory)) {
      throw new Error('Worker profile or history missing');
    }
    initialNehaBalance = json.data.balance || 0;
    initialNehaJobs = json.data.completedJobs || 0;
  });

  // 5. Create Dynamic Task with Sequential ID & Assign to Neha Joshi
  let createdTaskId = null;
  let createdTaskMongoId = null;
  const testBudget = 55.0;

  await test('POST /tasks (dynamic task ID sequence & validation)', async () => {
    const payload = {
      title: 'Automated Dynamic Inspection',
      description: 'Validation inspection for live verification and telemetry engine',
      location: 'Pune',
      address: 'Viman Nagar Retail Hub 12',
      workerName: 'Neha Joshi',
      budget: testBudget,
      deadline: '2026-11-12 18:00',
      evidenceRequirements: [
        { label: 'Storefront Verification Photo', status: 'pending', description: 'Front view' },
        { label: 'GPS Geotag verification', status: 'pending', description: 'Within 100m of coordinates' },
      ],
    };

    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status !== 201) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Status ${res.status}: ${err.message || ''}`);
    }

    const json = await res.json();
    if (!json.success || !json.data.taskId || !json.data.taskId.startsWith('RP-')) {
      throw new Error(`Invalid created task payload: ${JSON.stringify(json)}`);
    }

    createdTaskId = json.data.taskId;
    createdTaskMongoId = json.data._id;
  });

  // 6. Tasks list contains created task
  await test('GET /tasks (live tasks array contains created task)', async () => {
    const res = await fetch(`${BASE_URL}/tasks`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error('Tasks response malformed');
    }
    const found = json.data.find((t) => t.taskId === createdTaskId);
    if (!found) {
      throw new Error(`Newly created task ${createdTaskId} not found in GET /tasks`);
    }
  });

  // 7. Search task by title keyword
  await test('GET /tasks?search=Dynamic (search by keyword)', async () => {
    const res = await fetch(`${BASE_URL}/tasks?search=Dynamic`);
    const json = await res.json();
    if (!json.data || json.data.length === 0) {
      throw new Error('Search returned no results for keyword "Dynamic"');
    }
    const match = json.data.some((t) => t.taskId === createdTaskId);
    if (!match) throw new Error(`Created task ${createdTaskId} missing in search result`);
  });

  // 8. Single task by taskId
  await test('GET /tasks/:id (retrieve single task by dynamic taskId)', async () => {
    const res = await fetch(`${BASE_URL}/tasks/${createdTaskId}`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (json.data.taskId !== createdTaskId || !json.data.assignedWorker) {
      throw new Error('Task retrieval mismatch or assignedWorker not populated');
    }
  });

  // 9. Update task & evaluate Dynamic Verification Engine
  await test('PUT /tasks/:id (dynamic verification engine & worker propagation)', async () => {
    if (!createdTaskId) throw new Error('No created task to verify');

    // Submit verification with GPS coordinates within tolerance (Pune coordinates: 18.5204, 73.8567)
    const updatePayload = {
      status: 'Completed',
      verificationStatus: 'Verified',
      submissionGps: { latitude: 18.5205, longitude: 73.8568 }, // <20m away from Pune center
      evidence: [
        { label: 'Storefront Verification Photo', type: 'photo', url: 'https://cdn.example.com/store.jpg' },
        { label: 'GPS Geotag verification', type: 'gps', gps: { latitude: 18.5205, longitude: 73.8568 } },
      ],
    };

    const res = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();

    if (json.data.verificationStatus !== 'Verified') {
      throw new Error(`Expected Verified status, got ${json.data.verificationStatus}`);
    }
    if (typeof json.data.confidenceScore !== 'number' || json.data.confidenceScore < 85) {
      throw new Error(`Expected confidence score >= 85, got ${json.data.confidenceScore}`);
    }
  });

  // 10. Verify Worker Metric Dynamic Propagation in MongoDB
  await test('GET /workers/WRK-401 (verifies completedJobs & balance incremented)', async () => {
    const res = await fetch(`${BASE_URL}/workers/WRK-401`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();

    const expectedBalance = Number((initialNehaBalance + testBudget).toFixed(2));
    const expectedJobs = initialNehaJobs + 1;

    if (json.data.completedJobs < expectedJobs) {
      throw new Error(`completedJobs did not increment: was ${initialNehaJobs}, now ${json.data.completedJobs}`);
    }
    if (json.data.balance < expectedBalance) {
      throw new Error(`balance was not credited: was $${initialNehaBalance}, expected at least $${expectedBalance}, got $${json.data.balance}`);
    }
    if (!json.data.recentTask || !json.data.recentTask.includes(createdTaskId)) {
      throw new Error(`recentTask not updated with taskId ${createdTaskId}: got "${json.data.recentTask}"`);
    }
  });

  // 11. Payments Summary API
  await test('GET /payments/summary (live escrow & payout metrics)', async () => {
    const res = await fetch(`${BASE_URL}/payments/summary`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!json.success || typeof json.data?.escrowBalance !== 'number') {
      throw new Error('Invalid payments summary response');
    }
    const { escrowBalance, pendingPayouts, completedPayouts, totalPaid } = json.data;
    if (typeof pendingPayouts !== 'number' || typeof completedPayouts !== 'number' || typeof totalPaid !== 'number') {
      throw new Error('Payments summary fields incomplete');
    }
  });

  // 12. Payments Transactions API
  await test('GET /payments/transactions (live mapped transactions)', async () => {
    const res = await fetch(`${BASE_URL}/payments/transactions`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error('Transactions response malformed');
    }
  });

  // 13. Payments Release API
  await test('POST /payments/release/:id (release escrow payment)', async () => {
    if (!createdTaskId) throw new Error('No created task for payment release');
    const res = await fetch(`${BASE_URL}/payments/release/${createdTaskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!json.success || json.data.paymentStatus !== 'Completed') {
      throw new Error('Payment release did not update paymentStatus to Completed');
    }
  });

  // 14. Telemetry Locations API
  await test('GET /telemetry/locations (aggregates GPS nodes for workers & tasks)', async () => {
    const res = await fetch(`${BASE_URL}/telemetry/locations`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
      throw new Error('Telemetry locations empty or malformed');
    }
    const sample = json.data[0];
    if (typeof sample.latitude !== 'number' || typeof sample.longitude !== 'number') {
      throw new Error('Telemetry node missing numeric GPS coordinates');
    }
  });

  // 15. Intelligence Summary API
  await test('GET /intelligence/summary (live anomaly rates & risk score)', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/summary`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!json.success || typeof json.data?.anomalyRate !== 'number' || typeof json.data?.riskScore !== 'number') {
      throw new Error('Intelligence summary metrics malformed');
    }
    if (!Array.isArray(json.data.clusters)) {
      throw new Error('Intelligence clusters missing');
    }
  });

  // 16. Dashboard Summary API
  await test('GET /dashboard/summary (live KPI aggregations)', async () => {
    const res = await fetch(`${BASE_URL}/dashboard/summary`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    const { totalTasks, verifiedTasks, outcomes, kpiMetrics, operationalZones } = json.data;
    if (typeof totalTasks !== 'number') throw new Error('totalTasks mismatch');
    if (!Array.isArray(outcomes) || outcomes.length !== 3) throw new Error('Outcomes array mismatch');
    if (!Array.isArray(kpiMetrics) || kpiMetrics.length !== 5) throw new Error('kpiMetrics mismatch');
    if (!Array.isArray(operationalZones)) throw new Error('operationalZones mismatch');
  });

  // 17. Dashboard Activity API
  await test('GET /dashboard/activity (recent audit records)', async () => {
    const res = await fetch(`${BASE_URL}/dashboard/activity`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.data)) throw new Error('Activity data malformed');
  });

  // 18. Dashboard Exceptions API
  await test('GET /dashboard/exceptions (review required tasks)', async () => {
    const res = await fetch(`${BASE_URL}/dashboard/exceptions`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.data)) throw new Error('Exceptions data malformed');
  });

  // 19. Negative test: 404 on invalid ID
  await test('GET /tasks/RP-99999 (returns 404)', async () => {
    const res = await fetch(`${BASE_URL}/tasks/RP-99999`);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  // 20. Negative test: 400 on missing required fields for task
  await test('POST /tasks with empty body (returns 400)', async () => {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 21. Negative test: 400 on negative budget
  await test('POST /tasks with negative budget (returns 400)', async () => {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Negative Budget Test',
        location: 'Pune',
        budget: -100,
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 22. Clean up created test task
  await test('DELETE /tasks/:id (clean up test task)', async () => {
    if (!createdTaskId) throw new Error('No task to delete');
    const res = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, { method: 'DELETE' });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);

    const checkRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`);
    if (checkRes.status !== 404) throw new Error('Deleted task still found');
  });

  console.log(`\n====================================================`);
  console.log(`--- Test Results: ${passed} passed, ${failed} failed ---`);
  console.log(`====================================================`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal error in test suite:', e);
  process.exit(1);
});
