/**
 * Unit Test Suite for RealityProof Dynamic Algorithms & Backend Services
 */

import {
  calculateHaversineDistance,
  evaluateTaskVerification,
  resolveTargetCoordinates,
  ZONE_COORDINATES,
} from './services/verificationService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ [FAIL] ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`✓ [PASS] ${message}`);
    passed++;
  }
}

console.log('====================================================');
console.log('Starting Algorithm & Verification Engine Unit Tests');
console.log('====================================================');

// Test 1: Haversine distance identical coordinates
const d0 = calculateHaversineDistance(18.5204, 73.8567, 18.5204, 73.8567);
assert(d0 === 0, `Zero distance for identical coordinates (got ${d0})`);

// Test 2: Haversine distance known offset (~111m for 0.001 deg latitude)
const d1 = calculateHaversineDistance(18.5204, 73.8567, 18.5214, 73.8567);
assert(d1 > 100 && d1 < 125, `0.001 deg lat distance is ~111m (got ${d1.toFixed(1)}m)`);

// Test 3: Haversine handles invalid inputs gracefully
const dInvalid = calculateHaversineDistance('invalid', null, 18.5, NaN);
assert(dInvalid === Infinity, 'Invalid inputs return Infinity');

// Test 4: Target coordinates resolution by city and zone
const puneCoords = resolveTargetCoordinates({ location: 'Pune West & Central' });
assert(puneCoords.latitude === ZONE_COORDINATES.pune.latitude, 'Resolves Pune zone correctly');

const mumbaiCoords = resolveTargetCoordinates({ location: 'BKC & Bandra Commercial Zone' });
assert(mumbaiCoords.latitude === ZONE_COORDINATES['bkc & bandra'].latitude, 'Resolves Mumbai BKC zone correctly');

// Test 5: Dynamic Verification - Perfect submission within 100m geo-fence
const taskValid = {
  location: 'Pune',
  evidenceRequirements: [
    { label: 'Storefront Verification Photo', status: 'pending' },
    { label: 'GPS Geotag verification', status: 'pending' },
  ],
};
const evidenceValid = [
  { label: 'Storefront Verification Photo', type: 'photo' },
  { label: 'GPS Geotag verification', type: 'gps', gps: { latitude: 18.5205, longitude: 73.8568 } }, // ~15m
];
const resultValid = evaluateTaskVerification(taskValid, evidenceValid, { latitude: 18.5205, longitude: 73.8568 });
assert(resultValid.confidenceScore >= 85, `Valid submission score >= 85 (got ${resultValid.confidenceScore})`);
assert(resultValid.verificationStatus === 'Verified', `Status is 'Verified' (got ${resultValid.verificationStatus})`);
assert(resultValid.aiChecks.geoFenceMatch === true, 'geoFenceMatch is true');

// Test 6: Dynamic Verification - Perimeter breach (> 100m geo-fence tolerance)
const resultBreach = evaluateTaskVerification(
  taskValid,
  evidenceValid,
  { latitude: 18.525, longitude: 73.8567 } // ~511m away
);
assert(resultBreach.aiChecks.geoFenceMatch === false, 'geoFenceMatch is false on breach');
assert(resultBreach.confidenceScore <= 60, `Score penalized for perimeter breach (got ${resultBreach.confidenceScore})`);
assert(resultBreach.verificationStatus !== 'Verified', 'Status is not Verified on perimeter breach');
assert(resultBreach.exceptionReason.includes('Perimeter breach'), 'exceptionReason explains perimeter breach');

// Test 7: Dynamic Verification - Missing required evidence
const taskMissing = {
  location: 'Pune',
  evidenceRequirements: [
    { label: 'Storefront Photo', status: 'missing' },
    { label: 'Cold Storage Temp Sensor', status: 'missing' },
  ],
};
const resultMissing = evaluateTaskVerification(taskMissing, [], { latitude: 18.5204, longitude: 73.8567 });
assert(resultMissing.confidenceScore === 60, `2 missing items deduct 40 pts (got ${resultMissing.confidenceScore})`);
assert(resultMissing.verificationStatus === 'Review Required', 'Status is Review Required');

// Test 8: Dynamic Verification - Duplicate image hash collision
const evidenceDuplicate = [
  { label: 'Storefront Photo', hash: 'a1b2c3d4' },
  { label: 'Shelf Photo', hash: 'a1b2c3d4' }, // Duplicate!
];
const resultDuplicate = evaluateTaskVerification(
  { location: 'Pune', evidenceRequirements: [{ label: 'Storefront Photo', status: 'verified' }] },
  evidenceDuplicate,
  { latitude: 18.5204, longitude: 73.8567 }
);
assert(resultDuplicate.aiChecks.perceptualHashMatch === true, 'perceptualHashMatch is true');
assert(resultDuplicate.exceptionReason.includes('Duplicate'), 'Duplicate hash explained in exceptionReason');

// Test 9: Task ID numeric sorting logic test (RP-99 vs RP-1000 collation safety)
const mockExistingTaskIds = ['RP-1000', 'RP-1005', 'RP-999', 'RP-1014'];
let maxNum = 1000;
mockExistingTaskIds.forEach((id) => {
  const match = id.match(/^RP-(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > maxNum) maxNum = num;
  }
});
const nextTaskId = `RP-${maxNum + 1}`;
assert(nextTaskId === 'RP-1015', `Numeric max logic correctly produces RP-1015, not misled by RP-999 string collation (got ${nextTaskId})`);

// Test 10: Dynamic Verification - Empty evidence array on pending requirements
const taskPendingEmptyEvidence = {
  location: 'Pune',
  evidenceRequirements: [
    { label: 'Storefront Verification Photo', status: 'pending' },
    { label: 'GPS Geotag verification', status: 'pending' },
  ],
};
const resultPendingEmpty = evaluateTaskVerification(taskPendingEmptyEvidence, []);
assert(resultPendingEmpty.confidenceScore <= 60, `Empty evidence on 2 pending requirements deducts at least 40 pts (got ${resultPendingEmpty.confidenceScore})`);
assert(resultPendingEmpty.verificationStatus !== 'Verified', `Status is not Verified when evidence is missing (got ${resultPendingEmpty.verificationStatus})`);
assert(resultPendingEmpty.aiChecks.shelfFillRate === 'N/A', `shelfFillRate is 'N/A' (got ${resultPendingEmpty.aiChecks.shelfFillRate})`);

console.log('====================================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All algorithm unit tests passed successfully!');
}
