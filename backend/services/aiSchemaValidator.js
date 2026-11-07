/**
 * Schema validation and sanitization for AI Multimodal Verification outputs.
 * Enforces the contract defined in Phase 4 specification.
 */

export class AISchemaValidationError extends Error {
  constructor(message, validationDetails = []) {
    super(message);
    this.name = 'AISchemaValidationError';
    this.validationDetails = validationDetails;
  }
}

/**
 * Validate and sanitize structured AI verification output.
 * @param {any} data Raw parsed JSON from AI model
 * @param {Array<string>} expectedRequirements List of expected requirement labels from task
 * @returns {object} Validated and normalized verification payload
 */
export const validateAndNormalizeAIResponse = (data, expectedRequirements = []) => {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new AISchemaValidationError('AI output must be a non-null JSON object', ['Invalid root type']);
  }

  // 1. Validate overallAssessment
  const validAssessments = ['pass', 'fail', 'uncertain'];
  let overallAssessment = (data.overallAssessment || '').toLowerCase().trim();
  if (!validAssessments.includes(overallAssessment)) {
    if (overallAssessment.includes('pass')) overallAssessment = 'pass';
    else if (overallAssessment.includes('fail')) overallAssessment = 'fail';
    else overallAssessment = 'uncertain';
  }

  // 2. Validate summary
  const summary = typeof data.summary === 'string' && data.summary.trim()
    ? data.summary.trim()
    : 'Automated AI visual inspection completed.';

  // 3. Validate requirements
  const validResults = ['pass', 'fail', 'uncertain'];
  let requirements = [];

  if (Array.isArray(data.requirements)) {
    requirements = data.requirements.map((item, idx) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Requirement at index ${idx} is not an object.`);
        return {
          requirement: `Requirement #${idx + 1}`,
          result: 'uncertain',
          observation: 'Unstructured requirement response from AI model.',
          confidence: 0.5,
        };
      }

      let reqResult = (item.result || '').toLowerCase().trim();
      if (!validResults.includes(reqResult)) {
        reqResult = 'uncertain';
      }

      let conf = Number(item.confidence);
      if (isNaN(conf) || conf < 0) conf = 0.5;
      if (conf > 1) {
        // If provided as 0-100 percentage, scale to 0-1
        if (conf <= 100) conf = conf / 100;
        else conf = 1.0;
      }

      return {
        requirement: String(item.requirement || `Requirement #${idx + 1}`).trim(),
        result: reqResult,
        observation: String(item.observation || '').trim(),
        confidence: Math.round(conf * 100) / 100,
      };
    });
  }

  // Ensure all expected requirements from the task are represented
  if (Array.isArray(expectedRequirements) && expectedRequirements.length > 0) {
    for (const expected of expectedRequirements) {
      const expLabel = typeof expected === 'string' ? expected : expected?.label;
      if (!expLabel) continue;

      const found = requirements.find(
        (r) => r.requirement.toLowerCase() === expLabel.toLowerCase()
      );

      if (!found) {
        requirements.push({
          requirement: expLabel,
          result: 'uncertain',
          observation: 'Requirement was not evaluated by the model in the primary pass.',
          confidence: 0.5,
        });
      }
    }
  }

  // 4. Validate detectedObjects
  let detectedObjects = [];
  if (Array.isArray(data.detectedObjects)) {
    detectedObjects = data.detectedObjects
      .filter((obj) => obj && typeof obj === 'object' && obj.object)
      .map((obj) => {
        let count = parseInt(obj.count, 10);
        if (isNaN(count) || count < 0) count = 1;

        let conf = Number(obj.confidence);
        if (isNaN(conf) || conf < 0) conf = 0.5;
        if (conf > 1) {
          if (conf <= 100) conf = conf / 100;
          else conf = 1.0;
        }

        return {
          object: String(obj.object).trim(),
          count,
          confidence: Math.round(conf * 100) / 100,
        };
      });
  }

  // 5. Validate imageQuality
  const rawQuality = data.imageQuality || {};
  const validQualities = ['good', 'acceptable', 'poor', 'uncertain'];
  let qualityAssessment = (rawQuality.qualityAssessment || 'good').toLowerCase().trim();
  if (!validQualities.includes(qualityAssessment)) {
    qualityAssessment = 'acceptable';
  }

  const imageQuality = {
    isBlurry: Boolean(rawQuality.isBlurry),
    isTooDark: Boolean(rawQuality.isTooDark),
    isObstructed: Boolean(rawQuality.isObstructed),
    qualityAssessment,
  };

  // 6. Validate missingEvidence and warnings
  const missingEvidence = Array.isArray(data.missingEvidence)
    ? data.missingEvidence.filter((m) => typeof m === 'string' && m.trim()).map((m) => m.trim())
    : [];

  const warnings = Array.isArray(data.warnings)
    ? data.warnings.filter((w) => typeof w === 'string' && w.trim()).map((w) => w.trim())
    : [];

  if (errors.length > 3) {
    throw new AISchemaValidationError('AI output failed schema validation', errors);
  }

  return {
    overallAssessment,
    summary,
    requirements,
    detectedObjects,
    imageQuality,
    missingEvidence,
    warnings,
  };
};
