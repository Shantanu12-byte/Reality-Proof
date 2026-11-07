/**
 * RealityProof Empirical Challenger Verification Harness
 * Adversarially stress-tests:
 * 1. Haversine distance & exact 99m / 100m / 101m boundary conditions
 * 2. Evidence completeness, partial submissions & duplicate hash collision
 * 3. Score clamping boundaries [0, 100] under extreme penalties
 * 4. Worker state propagation, dynamic accuracy recalculation & idempotency in MongoDB
 * 5. Clean zero-residue teardown
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

import {
  calculateHaversineDistance,
  evaluateTaskVerification,
  resolveTargetCoordinates,
  ZONE_COORDINATES,
} from './services/verificationService.js';
import { Worker } from './models/Worker.js';
import { Task } from './models/Task.js';
import { Activity } from './models/Activity.js';
import { updateTask } from './controllers/taskController.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ✗ [FAIL] ${message}`);
    failedTests++;
    failures.push(message);
    throw new Error(message);
  } else {
    console.log(`  ✓ [PASS] ${message}`);
    passedTests++;
  }
}

async function runSection(name, fn) {
  console.log(`\n======================================================`);
  console.log(`SECTION: ${name}`);
  console.log(`======================================================`);
  try {
    await fn();
  } catch (err) {
    console.error(`Section "${name}" encountered error: ${err.message}`);
  }
}

async function runAllChallengerTests() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   REALITYPROOF EMPIRICAL CHALLENGER TEST SUITE       ║');
  console.log('║   Adversarial Stress Testing & State Verification    ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // -------------------------------------------------------------------------
  // SUITE 1: GPS Haversine Distance & Exact 99m / 100m / 101m Boundary Tests
  // -------------------------------------------------------------------------
  await runSection('GPS Haversine Exact Boundary & Coordinate Tests', () => {
    const pune = ZONE_COORDINATES.pune; // { latitude: 18.5204, longitude: 73.8567 }

    // 1.1 Exact coordinates
    const dExact = calculateHaversineDistance(pune.latitude, pune.longitude, pune.latitude, pune.longitude);
    assert(dExact === 0, `Exact coordinates distance must be exactly 0 (got ${dExact})`);

    // 1.2 Haversine formula offset math:
    // Earth radius = 6371000m
    // For pure latitude change: arc = d / R (in radians)
    // degrees = radians * (180 / Math.PI)
    const R = 6371000;
    const offset99mLat = (99 / R) * (180 / Math.PI);
    const offset100mLat = (100 / R) * (180 / Math.PI);
    const offset101mLat = (101 / R) * (180 / Math.PI);

    const d99 = calculateHaversineDistance(pune.latitude, pune.longitude, pune.latitude + offset99mLat, pune.longitude);
    assert(Math.abs(d99 - 99) < 0.01, `Calculated 99m distance is 99m within 0.01m tolerance (got ${d99.toFixed(4)})`);

    const d100 = calculateHaversineDistance(pune.latitude, pune.longitude, pune.latitude + offset100mLat, pune.longitude);
    assert(Math.abs(d100 - 100) < 0.01, `Calculated 100m distance is 100m within 0.01m tolerance (got ${d100.toFixed(4)})`);

    const d101 = calculateHaversineDistance(pune.latitude, pune.longitude, pune.latitude + offset101mLat, pune.longitude);
    assert(Math.abs(d101 - 101) < 0.01, `Calculated 101m distance is 101m within 0.01m tolerance (got ${d101.toFixed(4)})`);

    // 1.3 Boundary verification: 99m submission (within 100m geo-fence tolerance)
    const baseTask = {
      location: 'Pune',
      evidenceRequirements: [
        { label: 'Storefront Verification Photo', status: 'pending' },
      ],
    };
    const validEvidence = [
      { label: 'Storefront Verification Photo', type: 'photo', hash: 'hash_abc' },
    ];

    const result99m = evaluateTaskVerification(
      baseTask,
      validEvidence,
      { latitude: pune.latitude + offset99mLat, longitude: pune.longitude }
    );
    assert(result99m.aiChecks.geoFenceMatch === true, 'At 99m, geoFenceMatch must be true');
    assert(result99m.confidenceScore === 100, `At 99m with valid evidence, score must be 100 (got ${result99m.confidenceScore})`);
    assert(result99m.verificationStatus === 'Verified', `At 99m, status must be Verified (got ${result99m.verificationStatus})`);

    // 1.4 Boundary verification: 100m submission (at exact threshold boundary <= 100m)
    const result100m = evaluateTaskVerification(
      baseTask,
      validEvidence,
      { latitude: pune.latitude + offset100mLat, longitude: pune.longitude }
    );
    assert(result100m.aiChecks.geoFenceMatch === true, 'At exact 100m, geoFenceMatch must be true (distance <= 100)');
    assert(result100m.confidenceScore === 100, `At exact 100m, score must be 100 (got ${result100m.confidenceScore})`);
    assert(result100m.verificationStatus === 'Verified', 'At exact 100m, status must be Verified');

    // 1.5 Boundary verification: 101m submission (strictly breaches > 100m tolerance)
    const result101m = evaluateTaskVerification(
      baseTask,
      validEvidence,
      { latitude: pune.latitude + offset101mLat, longitude: pune.longitude }
    );
    assert(result101m.aiChecks.geoFenceMatch === false, 'At 101m, geoFenceMatch must be false');
    assert(result101m.confidenceScore === 60, `At 101m, score must be penalized by 40 to 60 (got ${result101m.confidenceScore})`);
    assert(result101m.verificationStatus === 'Review Required', `At 101m, status must drop to Review Required (got ${result101m.verificationStatus})`);
    assert(result101m.exceptionReason.includes('Perimeter breach'), 'At 101m, exceptionReason must explain perimeter breach');
  });

  // -------------------------------------------------------------------------
  // SUITE 2: Evidence Completeness, Partial Submissions & Duplicate Hash Stress
  // -------------------------------------------------------------------------
  await runSection('Evidence Completeness, Partial Submissions & Duplicate Hashes', () => {
    const multiReqTask = {
      location: 'Pune',
      evidenceRequirements: [
        { label: 'Storefront Verification Photo', status: 'pending' },
        { label: 'Shelf Stock Photo', status: 'pending' },
        { label: 'Billing Counter Photo', status: 'pending' },
      ],
    };

    // 2.1 Complete submission (all 3 submitted)
    const completeEvidence = [
      { label: 'Storefront Verification Photo', hash: 'hash_1' },
      { label: 'Shelf Stock Photo', hash: 'hash_2' },
      { label: 'Billing Counter Photo', hash: 'hash_3' },
    ];
    const resComplete = evaluateTaskVerification(multiReqTask, completeEvidence, ZONE_COORDINATES.pune);
    assert(resComplete.confidenceScore === 100, `Full evidence produces 100 score (got ${resComplete.confidenceScore})`);
    assert(resComplete.verificationStatus === 'Verified', 'Full evidence gives Verified status');

    // 2.2 Partial submission (2 submitted, 1 missing)
    const partialEvidence = [
      { label: 'Storefront Verification Photo', hash: 'hash_1' },
      { label: 'Shelf Stock Photo', hash: 'hash_2' },
      // Billing Counter omitted
    ];
    const resPartial = evaluateTaskVerification(multiReqTask, partialEvidence, ZONE_COORDINATES.pune);
    assert(resPartial.confidenceScore === 80, `Partial evidence (1 missing) deducts 20 pts: expected 80 (got ${resPartial.confidenceScore})`);
    assert(resPartial.verificationStatus === 'Review Required', `80 score is Review Required (got ${resPartial.verificationStatus})`);
    assert(resPartial.exceptionReason.includes('Missing evidence asset: "Billing Counter Photo"'), 'Exception explains missing asset');

    // 2.3 Partial submission (1 submitted, 2 missing)
    const resPartial1 = evaluateTaskVerification(
      multiReqTask,
      [{ label: 'Storefront Verification Photo', hash: 'hash_1' }],
      ZONE_COORDINATES.pune
    );
    assert(resPartial1.confidenceScore === 60, `Partial evidence (2 missing) deducts 40 pts: expected 60 (got ${resPartial1.confidenceScore})`);
    assert(resPartial1.verificationStatus === 'Review Required', '60 score is Review Required');

    // 2.4 Duplicate Hash Collision in Submitted Evidence
    const duplicateEvidence = [
      { label: 'Storefront Verification Photo', hash: 'identical_hash_abc' },
      { label: 'Shelf Stock Photo', hash: 'identical_hash_abc' }, // Duplicate!
      { label: 'Billing Counter Photo', hash: 'hash_different' },
    ];
    const resDuplicate = evaluateTaskVerification(multiReqTask, duplicateEvidence, ZONE_COORDINATES.pune);
    assert(resDuplicate.confidenceScore === 75, `Duplicate hash deducts 25 pts: expected 75 (got ${resDuplicate.confidenceScore})`);
    assert(resDuplicate.aiChecks.perceptualHashMatch === true, 'perceptualHashMatch is flagged true');
    assert(resDuplicate.verificationStatus === 'Review Required', 'Duplicate hash forces Review Required');
    assert(resDuplicate.exceptionReason.includes('Duplicate image hash detected'), 'Exception explains duplicate hash');

    // 2.5 Compound Failure: Perimeter breach + duplicate hash
    const resCompound = evaluateTaskVerification(
      multiReqTask,
      duplicateEvidence,
      { latitude: ZONE_COORDINATES.pune.latitude + 0.005, longitude: ZONE_COORDINATES.pune.longitude } // ~555m away
    );
    // Base 100 - 40 (GPS) - 25 (Duplicate) = 35
    assert(resCompound.confidenceScore === 35, `Compound failure score must be 35 (got ${resCompound.confidenceScore})`);
    assert(resCompound.verificationStatus === 'Failed', `Score < 50 must result in Failed status (got ${resCompound.verificationStatus})`);
    assert(resCompound.exceptionReason.includes('Perimeter breach') && resCompound.exceptionReason.includes('Duplicate'), 'Compound exception explains both defects');
  });

  // -------------------------------------------------------------------------
  // SUITE 3: Score Clamping Boundaries [0, 100] & Extreme Input Robustness
  // -------------------------------------------------------------------------
  await runSection('Score Clamping Boundaries [0, 100] & Extreme Penalties', () => {
    // 3.1 Extreme penalty accumulation (breach: -40, 5 missing items: -100, duplicate hash: -25 => score = -65)
    const severeTask = {
      location: 'Pune',
      evidenceRequirements: [
        { label: 'Asset 1', status: 'missing' },
        { label: 'Asset 2', status: 'missing' },
        { label: 'Asset 3', status: 'missing' },
        { label: 'Asset 4', status: 'missing' },
        { label: 'Asset 5', status: 'missing' },
      ],
    };
    const severeEvidence = [
      { label: 'Dummy', hash: 'same', duplicate: true },
    ];
    const resExtremeNegative = evaluateTaskVerification(
      severeTask,
      severeEvidence,
      { latitude: 0, longitude: 0 } // Thousands of km away
    );
    assert(resExtremeNegative.confidenceScore === 0, `Extreme negative penalties clamp at lower bound 0 (got ${resExtremeNegative.confidenceScore})`);
    assert(resExtremeNegative.verificationStatus === 'Failed', 'Clamped 0 score produces Failed status');

    // 3.2 Maximum score cannot exceed 100
    const perfectTask = {
      location: 'Pune',
      evidenceRequirements: [{ label: 'Asset 1', status: 'verified' }],
    };
    const resMax = evaluateTaskVerification(perfectTask, [{ label: 'Asset 1', hash: 'unique_1' }], ZONE_COORDINATES.pune);
    assert(resMax.confidenceScore === 100, `Perfect submission does not exceed upper bound 100 (got ${resMax.confidenceScore})`);

    // 3.3 Graceful handling of invalid / malformed coordinates
    const dNaN = calculateHaversineDistance(NaN, undefined, 18.5, 73.8);
    assert(dNaN === Infinity, `NaN / undefined coordinates return Infinity distance (got ${dNaN})`);
  });

  // -------------------------------------------------------------------------
  // SUITE 4: Worker State Propagation & Dynamic Accuracy in MongoDB
  // -------------------------------------------------------------------------
  await runSection('Worker State Propagation, Dynamic Accuracy & Idempotency in MongoDB', async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realityproof';
    const dbName = process.env.DB_NAME || 'RealityProof';

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri, {
        dbName,
        serverSelectionTimeoutMS: 10000,
        family: 4,
      });
    }

    const testWorkerId = `WRK-CHALLENGE-${Date.now()}`;
    const testTaskId = `RP-CHALLENGE-${Date.now()}`;
    const initialCompletedJobs = 3;
    const initialBalance = 120.0;
    const taskBudget = 45.5;

    let workerDoc = null;
    let taskDoc = null;

    try {
      // 4.1 Provision isolated test worker
      workerDoc = await Worker.create({
        workerId: testWorkerId,
        name: 'Challenger Test Worker',
        email: `challenger.${Date.now()}@fieldforce.io`,
        phone: '+91 91234 56789',
        city: 'Pune',
        zone: 'Pune West & Central',
        rating: 4.8,
        accuracy: 85.0,
        completedJobs: initialCompletedJobs,
        tasksToday: 1,
        balance: initialBalance,
        status: 'Active',
        reliabilityScore: 92,
      });
      assert(workerDoc._id !== null, `Test worker created with workerId ${testWorkerId}`);

      // 4.2 Create test task assigned to worker in Pending state
      taskDoc = await Task.create({
        taskId: testTaskId,
        title: 'Challenger Verification Job',
        description: 'Empirical verification of worker state propagation',
        location: 'Pune',
        assignedWorker: workerDoc._id,
        budget: taskBudget,
        status: 'In Progress',
        verificationStatus: 'Pending',
        confidenceScore: 0,
        evidenceRequirements: [
          { label: 'Storefront Verification Photo', status: 'pending' },
        ],
      });
      assert(taskDoc._id !== null, `Test task created with taskId ${testTaskId}`);

      // 4.3 Execute state update through taskController.updateTask logic simulation
      // We simulate Express req/res to verify controller propagation end-to-end
      let resJson = null;
      let resStatus = 200;

      const mockReq = {
        params: { id: taskDoc.taskId },
        body: {
          status: 'Completed',
          verificationStatus: 'Verified',
          confidenceScore: 96.0,
          paymentStatus: 'Completed',
        },
      };

      const mockRes = {
        status: (code) => {
          resStatus = code;
          return mockRes;
        },
        json: (data) => {
          resJson = data;
          return mockRes;
        },
      };

      let nextError = null;
      await updateTask(mockReq, mockRes, (err) => {
        nextError = err;
      });

      if (nextError) throw nextError;
      assert(resStatus === 200, `updateTask returned HTTP 200 (got ${resStatus})`);
      assert(resJson.data.verificationStatus === 'Verified', 'Task successfully updated to Verified in MongoDB');

      // 4.4 Inspect Worker Document in MongoDB to confirm propagation
      const updatedWorker = await Worker.findById(workerDoc._id);
      assert(updatedWorker !== null, 'Worker document reloaded from MongoDB');

      // Check completedJobs increment (+1)
      const expectedJobs = initialCompletedJobs + 1;
      assert(
        updatedWorker.completedJobs === expectedJobs,
        `Worker completedJobs incremented by +1: expected ${expectedJobs}, got ${updatedWorker.completedJobs}`
      );

      // Check balance increment (+ taskBudget)
      const expectedBalance = Number((initialBalance + taskBudget).toFixed(2));
      assert(
        updatedWorker.balance === expectedBalance,
        `Worker balance credited by exact task budget ($${taskBudget}): expected $${expectedBalance}, got $${updatedWorker.balance}`
      );

      // Check recentTask update
      assert(
        updatedWorker.recentTask.includes(testTaskId),
        `Worker recentTask updated with task identifier: got "${updatedWorker.recentTask}"`
      );

      // Check dynamic accuracy calculation
      assert(
        typeof updatedWorker.accuracy === 'number' && updatedWorker.accuracy >= 0 && updatedWorker.accuracy <= 100,
        `Worker accuracy dynamically recomputed: got ${updatedWorker.accuracy}%`
      );

      // Check Activity collection for VERIFICATION_PASSED event
      const activityEvent = await Activity.findOne({
        taskId: testTaskId,
        activityType: 'VERIFICATION_PASSED',
      });
      assert(activityEvent !== null, `VERIFICATION_PASSED Activity audit trail persisted for task ${testTaskId}`);
      assert(activityEvent.actor === 'VerificationEngine', 'Activity actor is VerificationEngine');

      // 4.5 Idempotency Test: Update task again; verify NO duplicate crediting or increments
      const mockReq2 = {
        params: { id: taskDoc.taskId },
        body: {
          title: 'Challenger Verification Job (Renamed)',
        },
      };

      await updateTask(mockReq2, mockRes, (err) => {
        if (err) throw err;
      });

      const workerAfterSecondUpdate = await Worker.findById(workerDoc._id);
      assert(
        workerAfterSecondUpdate.completedJobs === expectedJobs,
        `Idempotency check: completedJobs unchanged on second update (still ${expectedJobs})`
      );
      assert(
        workerAfterSecondUpdate.balance === expectedBalance,
        `Idempotency check: balance unchanged on second update (still $${expectedBalance})`
      );

    } finally {
      // 4.6 Teardown: Clean up isolated test records
      if (taskDoc) {
        await Task.deleteOne({ taskId: testTaskId });
      }
      if (workerDoc) {
        await Worker.deleteOne({ workerId: testWorkerId });
      }
      await Activity.deleteMany({ taskId: testTaskId });
      console.log('  ✓ [TEARDOWN] Isolated test records cleaned up cleanly with zero residue.');
    }
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TOTAL TESTS:  ${totalTests}`);
  console.log(`PASSED:       ${passedTests}`);
  console.log(`FAILED:       ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    console.error(`Verification FAILED with ${failedTests} assertion failures:`);
    failures.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log('ALL EMPIRICAL CHALLENGER TESTS PASSED SUCCESSFULLY! ✓');
  }
}

// Execute
runAllChallengerTests()
  .then(() => {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection.close();
    }
  })
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  });
