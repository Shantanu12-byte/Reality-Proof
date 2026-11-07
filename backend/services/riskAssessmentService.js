/**
 * RealityProof Deterministic Risk Assessment Engine
 * 
 * Evaluates:
 * 1. AI requirement outcomes (pass / fail / uncertain)
 * 2. Missing required evidence assets
 * 3. Image quality factors (blur, darkness, obstruction)
 * 4. Duplicate evidence detection (exact SHA-256 and perceptual pHash)
 * 5. GPS geo-fence proximity (only when GPS metadata is reliably present)
 * 6. EXIF timestamp anomalies (only when timestamp metadata is present)
 * 
 * Adheres strictly to the verification philosophy:
 * - Missing GPS or EXIF metadata is NOT treated as proof of fraud.
 * - Perceptual similarity is NOT auto-labeled as fraud (account for legitimate angles).
 * - AI findings are recommendations, not unquestionable facts.
 */

/**
 * Calculate deterministic risk score, category, reasons, and recommendation.
 * 
 * @param {object} params
 * @param {object} params.aiFindings Output from AI vision provider
 * @param {object} params.duplicateFindings Output from duplicate detection service
 * @param {object} params.metadataFindings Output from metadata extraction service
 * @param {object} params.task Target task document
 * @returns {object} { riskScore, riskCategory, riskReasons, recommendation, explanation }
 */
export const calculateRiskAssessment = ({
  aiFindings = {},
  duplicateFindings = {},
  metadataFindings = {},
  task = {},
}) => {
  let score = 0;
  const riskReasons = [];

  const requirements = aiFindings.requirements || [];
  const imageQuality = aiFindings.imageQuality || {};
  const missingEvidence = aiFindings.missingEvidence || [];

  let failedReqCount = 0;
  let uncertainReqCount = 0;

  // 1. Evaluate Failed & Uncertain AI Requirements
  for (const req of requirements) {
    if (req.result === 'fail') {
      failedReqCount++;
      const impact = 30;
      score += impact;
      riskReasons.push({
        factor: 'FAILED_REQUIREMENT',
        scoreImpact: impact,
        description: `Task requirement failed: "${req.requirement}". AI Observation: ${req.observation || 'Requirement not met.'}`,
      });
    } else if (req.result === 'uncertain') {
      uncertainReqCount++;
      const impact = 10;
      score += impact;
      riskReasons.push({
        factor: 'UNCERTAIN_REQUIREMENT',
        scoreImpact: impact,
        description: `Uncertain requirement: "${req.requirement}". Insufficient visual clarity to confirm.`,
      });
    }
  }

  // 2. Evaluate Missing Evidence Items
  if (missingEvidence.length > 0) {
    for (const missing of missingEvidence) {
      const impact = 20;
      score += impact;
      riskReasons.push({
        factor: 'MISSING_EVIDENCE',
        scoreImpact: impact,
        description: `Required evidence element missing from inspection: "${missing}".`,
      });
    }
  }

  // 3. Evaluate Image Quality Deficiencies
  if (imageQuality.isBlurry) {
    const impact = 15;
    score += impact;
    riskReasons.push({
      factor: 'IMAGE_BLURRY',
      scoreImpact: impact,
      description: 'Image blur detected. Fine details or text cannot be definitively validated.',
    });
  }

  if (imageQuality.isTooDark) {
    const impact = 15;
    score += impact;
    riskReasons.push({
      factor: 'IMAGE_DARK',
      scoreImpact: impact,
      description: 'Under-exposure / poor lighting. Critical features may be hidden in shadows.',
    });
  }

  if (imageQuality.isObstructed) {
    const impact = 20;
    score += impact;
    riskReasons.push({
      factor: 'IMAGE_OBSTRUCTED',
      scoreImpact: impact,
      description: 'Visual obstruction detected obscuring key parts of the target.',
    });
  }

  if (imageQuality.qualityAssessment === 'poor') {
    const impact = 15;
    score += impact;
    riskReasons.push({
      factor: 'LOW_IMAGE_QUALITY',
      scoreImpact: impact,
      description: 'Overall visual quality assessed as poor, impeding reliable validation.',
    });
  }

  // 4. Evaluate Duplicate Evidence Matches
  if (duplicateFindings.exactMatchFound) {
    const impact = 45;
    score += impact;
    const matchedTaskIds = duplicateFindings.matches
      ?.filter((m) => m.matchType === 'exact')
      ?.map((m) => m.matchedTaskId)
      ?.join(', ') || 'historical task';
    riskReasons.push({
      factor: 'EXACT_DUPLICATE_IMAGE',
      scoreImpact: impact,
      description: `Exact byte-level duplicate image (SHA-256 match) previously submitted for ${matchedTaskIds}.`,
    });
  } else if (duplicateFindings.perceptualMatchFound) {
    // Note: Do NOT auto-label similar images as fraud. Legitimate similar angles happen.
    const highestSim = duplicateFindings.matches?.length > 0
      ? duplicateFindings.matches[0].similarity
      : 85;
    const impact = 18;
    score += impact;
    riskReasons.push({
      factor: 'PERCEPTUAL_SIMILARITY',
      scoreImpact: impact,
      description: `Perceptually similar image detected (${highestSim}% similarity). May be a repeated shot of the same site or recycled asset.`,
    });
  }

  // 5. Evaluate Location Inconsistencies (ONLY if GPS metadata exists)
  // Rule: Do NOT treat missing GPS metadata as proof of fraud.
  if (metadataFindings.hasGps) {
    if (metadataFindings.geoFenceStatus === 'breach') {
      const impact = 25;
      score += impact;
      riskReasons.push({
        factor: 'GEOFENCE_BREACH',
        scoreImpact: impact,
        description: `Submission GPS was ${metadataFindings.distanceMeters}m from target site (exceeds 100m geofence tolerance).`,
      });
    }
  }

  // 6. Evaluate Timestamp Inconsistencies (ONLY if reliable EXIF timestamp exists)
  if (metadataFindings.hasExif && metadataFindings.exifTimestamp) {
    const captureTime = new Date(metadataFindings.exifTimestamp).getTime();
    const now = Date.now();
    const futureToleranceMs = 2 * 60 * 60 * 1000; // 2 hours drift tolerance

    if (captureTime > now + futureToleranceMs) {
      const impact = 20;
      score += impact;
      riskReasons.push({
        factor: 'FUTURE_TIMESTAMP_ANOMALY',
        scoreImpact: impact,
        description: 'EXIF timestamp indicates capture date in the future.',
      });
    } else {
      // Check if image is excessively old (> 30 days)
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (now - captureTime > thirtyDaysMs) {
        const impact = 15;
        score += impact;
        riskReasons.push({
          factor: 'HISTORICAL_IMAGE_TIMESTAMP',
          scoreImpact: impact,
          description: `EXIF timestamp indicates image was captured over 30 days ago (${new Date(captureTime).toLocaleDateString()}).`,
        });
      }
    }
  }

  // Normalize score between 0 and 100
  const riskScore = Math.max(0, Math.min(100, Math.round(score)));

  // Categorize risk
  let riskCategory = 'low';
  if (riskScore >= 80) {
    riskCategory = 'critical';
  } else if (riskScore >= 55) {
    riskCategory = 'high';
  } else if (riskScore >= 25) {
    riskCategory = 'medium';
  } else {
    riskCategory = 'low';
  }

  // Determine Recommendation
  let recommendation = 'manual_review';
  if (
    riskScore <= 25 &&
    failedReqCount === 0 &&
    !duplicateFindings.exactMatchFound &&
    aiFindings.overallAssessment === 'pass'
  ) {
    recommendation = 'approve';
  } else if (
    riskScore >= 75 ||
    (duplicateFindings.exactMatchFound && failedReqCount >= 1) ||
    failedReqCount >= 2
  ) {
    recommendation = 'reject';
  } else {
    recommendation = 'manual_review';
  }

  // Generate clear summary explanation
  let explanation = '';
  if (recommendation === 'approve') {
    explanation = `Automated verification passed with low risk score (${riskScore}/100). All task requirements confirmed with high confidence.`;
  } else if (recommendation === 'reject') {
    explanation = `High risk detected (${riskScore}/100). ${riskReasons.length} factor(s) flagged including ${failedReqCount > 0 ? `${failedReqCount} failed requirement(s)` : 'integrity anomalies'}. Rejection recommended.`;
  } else {
    explanation = `Manual review required (Risk Score: ${riskScore}/100, ${riskCategory.toUpperCase()}). ${riskReasons.length} advisory factor(s) noted for human inspection.`;
  }

  return {
    riskScore,
    riskCategory,
    riskReasons,
    recommendation,
    explanation,
  };
};
