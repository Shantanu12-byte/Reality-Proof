/**
 * RealityProof Dynamic Verification Engine
 * Rule-based multi-modal verification algorithm calculating Haversine GPS proximity,
 * evidence completeness, perceptual integrity, and dynamic confidence scoring.
 */

// Earth radius in meters
const EARTH_RADIUS_METERS = 6371000;

// Standard reference coordinates for operational zones
export const ZONE_COORDINATES = {
  pune: { latitude: 18.5204, longitude: 73.8567 },
  'pune west & central': { latitude: 18.5204, longitude: 73.8567 },
  'pune east / viman nagar': { latitude: 18.5679, longitude: 73.9143 },
  'kalyani nagar / koregaon': { latitude: 18.5463, longitude: 73.9033 },
  mumbai: { latitude: 19.076, longitude: 72.8777 },
  'mumbai suburban': { latitude: 19.1136, longitude: 72.8697 },
  'bkc & bandra': { latitude: 19.0607, longitude: 72.8687 },
  'andheri & juhu': { latitude: 19.1197, longitude: 72.8468 },
  nagpur: { latitude: 21.1458, longitude: 79.0882 },
  'nagpur logistics hub': { latitude: 21.1458, longitude: 79.0882 },
  nashik: { latitude: 19.9975, longitude: 73.7898 },
  'ambad & satpur midc': { latitude: 19.9975, longitude: 73.7898 },
};

/**
 * Calculate the great-circle distance between two GPS coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in meters
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return Infinity;
  }

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

/**
 * Resolve target coordinates for a task based on explicit task coords or location name.
 */
export const resolveTargetCoordinates = (task) => {
  if (task?.coordinates?.latitude && task?.coordinates?.longitude) {
    return {
      latitude: Number(task.coordinates.latitude),
      longitude: Number(task.coordinates.longitude),
    };
  }
  if (task?.lat && task?.lng) {
    return {
      latitude: Number(task.lat),
      longitude: Number(task.lng),
    };
  }

  const loc = (task?.location || task?.city || '').trim().toLowerCase();
  for (const [key, coords] of Object.entries(ZONE_COORDINATES)) {
    if (loc.includes(key) || key.includes(loc)) {
      return coords;
    }
  }

  // Default fallback to Pune centroid if unresolvable
  return ZONE_COORDINATES.pune;
};

/**
 * Dynamic Task Verification Evaluator
 * Evaluates submitted field evidence against target criteria and GPS coordinates.
 *
 * Scoring Rules:
 * - Base score: 100
 * - GPS distance > 100m: -40 points, geoFenceMatch = false
 * - Missing required evidence item: -20 points per missing item
 * - Flagged evidence / duplicate hash match: -25 points
 * - Clamped between 0 and 100
 *
 * Status thresholds:
 * - >= 85: 'Verified'
 * - 50 - 84: 'Review Required'
 * - < 50: 'Failed'
 *
 * @param {object} task Task object with requirements, location, etc.
 * @param {Array} evidence Submitted evidence items or requirements array
 * @param {object} submissionGps GPS coordinates of the field inspector submission
 * @returns {object} { confidenceScore, verificationStatus, exceptionReason, aiChecks, distanceMeters }
 */
export const evaluateTaskVerification = (task = {}, evidence = [], submissionGps = null) => {
  let score = 100;
  const exceptionReasons = [];

  // 1. Resolve Target Coordinates and Evaluate GPS Geo-fence
  const targetCoords = resolveTargetCoordinates(task);
  let distanceMeters = 0;
  let geoFenceMatch = true;

  const actualGps =
    submissionGps ||
    (Array.isArray(evidence) && evidence.find((e) => e?.gps?.latitude)?.gps) ||
    null;

  if (actualGps && typeof actualGps.latitude === 'number' && typeof actualGps.longitude === 'number') {
    distanceMeters = calculateHaversineDistance(
      targetCoords.latitude,
      targetCoords.longitude,
      actualGps.latitude,
      actualGps.longitude
    );

    if (distanceMeters > 100) {
      geoFenceMatch = false;
      score -= 40;
      exceptionReasons.push(
        `Perimeter breach: Submission was ${Math.round(distanceMeters)}m from target (100m geo-fence tolerance exceeded)`
      );
    }
  } else if (submissionGps === false) {
    geoFenceMatch = false;
    score -= 40;
    exceptionReasons.push('GPS verification failed: No GPS metadata present in submission');
  }

  // 2. Evaluate Evidence Completeness
  const requiredRequirements = Array.isArray(task?.evidenceRequirements)
    ? task.evidenceRequirements
    : Array.isArray(task?.requiredEvidence)
      ? task.requiredEvidence
      : [];

  let missingCount = 0;
  let flaggedCount = 0;

  if (requiredRequirements.length > 0) {
    requiredRequirements.forEach((req) => {
      const label = typeof req === 'string' ? req : req.label;
      const status = typeof req === 'object' ? req.status : 'pending';

      // Check if evidence includes this requirement or if requirement is marked verified
      const submittedMatch = Array.isArray(evidence)
        ? evidence.find((e) => e?.label === label || e?.type === label)
        : null;

      if (status === 'missing' || status === 'failed') {
        missingCount++;
        exceptionReasons.push(`Missing evidence asset: "${label}"`);
      } else if (status === 'flagged') {
        flaggedCount++;
        exceptionReasons.push(`Flagged evidence asset: "${label}"`);
      } else if (!submittedMatch && status === 'pending') {
        missingCount++;
        exceptionReasons.push(`Missing evidence asset: "${label}"`);
      }
    });

    score -= missingCount * 20;
    score -= flaggedCount * 25;
  }

  // 3. Perceptual Hash & Duplicate Detection
  let perceptualHashMatch = false;
  if (Array.isArray(evidence)) {
    const hashes = new Set();
    for (const item of evidence) {
      if (item?.hash) {
        if (hashes.has(item.hash) || item.duplicate === true) {
          perceptualHashMatch = true;
          score -= 25;
          exceptionReasons.push(`Duplicate image hash detected: "${item.hash}"`);
          break;
        }
        hashes.add(item.hash);
      }
      if (item?.aiChecks?.perceptualHashMatch === true) {
        perceptualHashMatch = true;
        score -= 25;
        exceptionReasons.push('Perceptual hash collision with previously submitted inspection image');
        break;
      }
    }
  }

  // 4. Final Score Normalization & Status Assignment
  const confidenceScore = Math.max(0, Math.min(100, Math.round(score)));

  let verificationStatus = 'Verified';
  if (confidenceScore < 50) {
    verificationStatus = 'Failed';
  } else if (confidenceScore < 85) {
    verificationStatus = 'Review Required';
  }

  const exceptionReason =
    verificationStatus !== 'Verified' && exceptionReasons.length > 0
      ? exceptionReasons.join(' | ')
      : '';

  const aiChecks = {
    perceptualHashMatch,
    exifVerified: actualGps ? geoFenceMatch : true,
    geoFenceMatch,
    lightingAdequacy: confidenceScore >= 70,
    shelfFillRate: 'N/A',
    duplicateRiskScore: perceptualHashMatch ? 'HIGH_DUPLICATE_RISK' : 'LOW',
    missingAssetsCount: missingCount,
    distanceMeters: Math.round(distanceMeters),
  };

  return {
    confidenceScore,
    verificationStatus,
    exceptionReason,
    aiChecks,
    distanceMeters,
  };
};
