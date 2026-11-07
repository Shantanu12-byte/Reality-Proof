import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { Task } from '../models/Task.js';
import { Verification } from '../models/Verification.js';
import { Activity } from '../models/Activity.js';
import { Worker } from '../models/Worker.js';
import { extractImageMetadata } from './metadataService.js';
import {
  detectDuplicateEvidence,
  registerEvidenceFingerprint,
} from './duplicateDetectionService.js';
import { getAIVisionProvider } from './aiService.js';
import { calculateRiskAssessment } from './riskAssessmentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to escape regex special characters
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Resolves an image buffer from available inputs: Buffer, local path,
 * relative upload URL, remote/data URI, or existing task thumbnails.
 */
const resolveImageBuffer = async ({ imageBuffer, imagePath, imageUrl, task }) => {
  if (imageBuffer && Buffer.isBuffer(imageBuffer) && imageBuffer.length > 0) {
    return { buffer: imageBuffer, resolvedUrl: imageUrl || '' };
  }

  const candidatePaths = [];
  if (imagePath) {
    candidatePaths.push(imagePath);
  }

  const urlsToTry = [
    imageUrl,
    ...(Array.isArray(task?.evidenceThumbnails) ? task.evidenceThumbnails : []),
  ].filter(Boolean);

  for (const rawUrl of urlsToTry) {
    if (typeof rawUrl !== 'string') continue;

    // Data URI
    if (rawUrl.startsWith('data:image/')) {
      const base64Data = rawUrl.split(',')[1];
      if (base64Data) {
        return { buffer: Buffer.from(base64Data, 'base64'), resolvedUrl: rawUrl };
      }
    }

    let cleanPath = rawUrl;
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      try {
        const parsed = new URL(cleanPath);
        cleanPath = parsed.pathname;
      } catch {
        // Fall back to cleanPath
      }
    }

    if (cleanPath.startsWith('/uploads/')) {
      candidatePaths.push(path.join(process.cwd(), 'backend', cleanPath));
      candidatePaths.push(path.join(process.cwd(), cleanPath));
      candidatePaths.push(path.resolve(__dirname, '..', cleanPath.replace(/^\//, '')));
    } else if (cleanPath.startsWith('uploads/')) {
      candidatePaths.push(path.join(process.cwd(), 'backend', cleanPath));
      candidatePaths.push(path.join(process.cwd(), cleanPath));
      candidatePaths.push(path.resolve(__dirname, '..', cleanPath));
    } else if (path.isAbsolute(cleanPath)) {
      candidatePaths.push(cleanPath);
    }
  }

  for (const testPath of candidatePaths) {
    try {
      const buf = await fs.readFile(testPath);
      if (buf && buf.length > 0) {
        const filename = path.basename(testPath);
        const relativeUrl = imageUrl || `/uploads/evidence/${filename}`;
        return { buffer: buf, resolvedUrl: relativeUrl };
      }
    } catch {
      // Continue to next candidate
    }
  }

  return { buffer: null, resolvedUrl: imageUrl || '' };
};

/**
 * Execute the complete 10-step Multi-Modal AI Verification Pipeline.
 * 
 * @param {object} params
 * @param {string} params.taskId ID of the task to verify (e.g. "RP-1001" or MongoDB _id)
 * @param {Buffer} [params.imageBuffer] Raw image buffer from file upload
 * @param {string} [params.imagePath] Local filesystem path to image
 * @param {string} [params.imageUrl] Public or hosted URL of image
 * @param {object} [params.fileMeta] Multer metadata { mimetype, size, originalname }
 * @returns {Promise<object>} Complete Verification document
 */
export const runVerificationPipeline = async ({
  taskId,
  imageBuffer = null,
  imagePath = null,
  imageUrl = null,
  fileMeta = null,
}) => {
  if (!taskId) {
    throw new Error('A valid Task ID is required to execute the verification pipeline.');
  }

  const safeTaskIdStr = String(taskId).trim();

  // -------------------------------------------------------------
  // Step 1 & 2: Retrieve the corresponding task and requirements
  // -------------------------------------------------------------
  const queryConditions = [
    { taskId: new RegExp(`^${escapeRegex(safeTaskIdStr)}$`, 'i') },
  ];
  if (mongoose.Types.ObjectId.isValid(safeTaskIdStr)) {
    queryConditions.push({ _id: safeTaskIdStr });
  }

  const task = await Task.findOne({ $or: queryConditions }).populate('assignedWorker');

  if (!task) {
    throw new Error(`Task with identifier "${safeTaskIdStr}" not found in database.`);
  }

  // -------------------------------------------------------------
  // Step 3: Retrieve submitted image buffer
  // -------------------------------------------------------------
  const { buffer, resolvedUrl } = await resolveImageBuffer({
    imageBuffer,
    imagePath,
    imageUrl,
    task,
  });

  if (!buffer || buffer.length === 0) {
    throw new Error(
      `No valid evidence image was provided or found for task "${task.taskId}". Please upload an inspection photograph first.`
    );
  }

  // -------------------------------------------------------------
  // Step 4: Extract available metadata (Type, Dimensions, Size, EXIF, GPS)
  // -------------------------------------------------------------
  const metadataFindings = await extractImageMetadata(buffer, task, fileMeta);

  // -------------------------------------------------------------
  // Step 5: Duplicate evidence detection (SHA-256, pHash, Hamming dist)
  // -------------------------------------------------------------
  const duplicateFindings = await detectDuplicateEvidence(buffer, task.taskId);

  // -------------------------------------------------------------
  // Step 6 & 7: Send image & requirements to Multimodal AI model & validate schema
  // -------------------------------------------------------------
  const aiProvider = getAIVisionProvider();
  let aiFindings;
  try {
    aiFindings = await aiProvider.analyzeEvidence({
      imageBuffer: buffer,
      mimeType: metadataFindings.fileType || 'image/jpeg',
      task,
      requirements: task.evidenceRequirements || [],
    });
  } catch (aiErr) {
    console.error(`[Pipeline] AI Vision analysis failed for task ${task.taskId}:`, aiErr.message);
    const failedVerification = await Verification.create({
      taskId: task.taskId,
      modelProvider:
        aiProvider.constructor.name === 'GroqVisionProvider'
          ? 'groq'
          : aiProvider.constructor.name === 'GeminiVisionProvider'
          ? 'google-gemini'
          : 'mock-engine',
      modelName: aiProvider.modelName,
      isMock: aiProvider.constructor.name === 'MockVisionProvider',
      analysisStatus: 'failed',
      overallAssessment: 'uncertain',
      summary: `AI verification encountered an operational error: ${aiErr.message}`,
      explanation: 'Analysis could not be completed. You can retry the verification.',
      metadataFindings,
      duplicateMatches: duplicateFindings,
      riskScore: 70,
      riskCategory: 'high',
      recommendation: 'manual_review',
      errorMessage: aiErr.message,
    });
    return failedVerification;
  }

  // -------------------------------------------------------------
  // Step 8 & 9: Combine findings and calculate transparent risk assessment
  // -------------------------------------------------------------
  const riskAssessment = calculateRiskAssessment({
    aiFindings,
    duplicateFindings,
    metadataFindings,
    task,
  });

  // -------------------------------------------------------------
  // Step 10: Save verification record and update task verification status
  // -------------------------------------------------------------
  const verificationDoc = await Verification.create({
    taskId: task.taskId,
    evidenceIds: resolvedUrl ? [resolvedUrl] : [],
    evidenceThumbnails: resolvedUrl ? [resolvedUrl] : task.evidenceThumbnails,
    modelProvider: aiFindings.modelProvider,
    modelName: aiFindings.modelName,
    isMock: aiFindings.isMock,
    analysisStatus: 'completed',
    overallAssessment: aiFindings.overallAssessment,
    summary: aiFindings.summary,
    explanation: riskAssessment.explanation,
    requirementResults: aiFindings.requirements,
    detectedObjects: aiFindings.detectedObjects,
    imageQuality: aiFindings.imageQuality,
    missingEvidence: aiFindings.missingEvidence,
    warnings: aiFindings.warnings,
    duplicateMatches: duplicateFindings,
    metadataFindings,
    riskScore: riskAssessment.riskScore,
    riskCategory: riskAssessment.riskCategory,
    recommendation: riskAssessment.recommendation,
    riskReasons: riskAssessment.riskReasons,
    rawAiResponse: aiFindings.rawAiResponse,
  });

  // Register fingerprint in database for future duplicate comparisons
  await registerEvidenceFingerprint({
    sha256: duplicateFindings.sha256,
    pHash: duplicateFindings.pHash,
    taskId: task.taskId,
    verificationId: verificationDoc._id,
    imageUrl: resolvedUrl,
    fileSize: metadataFindings.fileSize,
  });

  // Determine synchronized statuses
  const taskConfidence = Math.max(0, Math.min(100, 100 - riskAssessment.riskScore));
  let newVerificationStatus = 'Review Required';

  if (riskAssessment.recommendation === 'approve') {
    newVerificationStatus = 'Verified';
  } else if (riskAssessment.recommendation === 'reject') {
    newVerificationStatus = 'Failed';
  } else {
    newVerificationStatus = 'Review Required';
  }

  // Maintain 'Completed' if already completed, otherwise transition 'Pending' to 'Under Review'
  const newTaskStatus = task.status === 'Completed' ? 'Completed' : 'Under Review';

  const wasVerified = task.verificationStatus === 'Verified' || task.status === 'Completed';

  // Apply complete state update to Task
  task.verificationStatus = newVerificationStatus;
  task.status = newTaskStatus;
  task.confidenceScore = taskConfidence;
  task.submitted = task.submitted || 'Just now';
  const formatRiskReasons = (reasons) => {
    if (!Array.isArray(reasons) || reasons.length === 0) return '';
    return reasons
      .map((r) => (typeof r === 'string' ? r : r.description || r.factor || 'Flagged anomaly'))
      .join('; ');
  };

  task.exceptionReason =
    newVerificationStatus === 'Verified'
      ? ''
      : (formatRiskReasons(riskAssessment.riskReasons) || riskAssessment.explanation || 'Pending supervisor review');
  task.paymentStatus =
    newVerificationStatus === 'Verified' ? 'Completed' : 'Pending';

  // Add verified thumbnail to task if not already present
  if (resolvedUrl && !task.evidenceThumbnails.includes(resolvedUrl)) {
    task.evidenceThumbnails.unshift(resolvedUrl);
  }

  // Synchronize individual requirement status on task with smart matching
  if (Array.isArray(task.evidenceRequirements) && Array.isArray(aiFindings.requirements)) {
    task.evidenceRequirements = task.evidenceRequirements.map((req, reqIdx) => {
      const reqLabel = (req.label || '').toLowerCase().trim();

      // 1. Exact match
      let match = aiFindings.requirements.find(
        (r) => (r.requirement || '').toLowerCase().trim() === reqLabel
      );

      // 2. Substring match
      if (!match) {
        match = aiFindings.requirements.find((r) => {
          const rText = (r.requirement || '').toLowerCase().trim();
          return rText.includes(reqLabel) || reqLabel.includes(rText);
        });
      }

      // 3. Keyword token overlap
      if (!match) {
        const reqTokens = reqLabel.split(/\W+/).filter((w) => w.length > 3);
        match = aiFindings.requirements.find((r) => {
          const rText = (r.requirement || '').toLowerCase();
          return reqTokens.some((tok) => rText.includes(tok));
        });
      }

      // 4. Index-based alignment
      if (!match && aiFindings.requirements[reqIdx]) {
        match = aiFindings.requirements[reqIdx];
      }

      if (match) {
        return {
          label: req.label,
          status: match.result === 'pass' ? 'verified' : match.result === 'fail' ? 'failed' : 'flagged',
          description: match.observation || req.description,
        };
      }

      // If overall assessment passed and no specific failure found
      if (aiFindings.overallAssessment === 'pass') {
        return {
          label: req.label,
          status: 'verified',
          description: 'Satisfied by multimodal visual verification',
        };
      }

      return req;
    });
  }

  // Update AI Checks summary on task
  task.aiChecks = {
    perceptualHashMatch: duplicateFindings.perceptualMatchFound,
    exifVerified: metadataFindings.hasExif,
    geoFenceMatch: metadataFindings.geoFenceStatus === 'match',
    lightingAdequacy: !aiFindings.imageQuality.isTooDark,
    shelfFillRate: aiFindings.detectedObjects.find((o) => (o.object || '').toLowerCase().includes('product'))?.count
      ? `${aiFindings.detectedObjects.find((o) => (o.object || '').toLowerCase().includes('product')).count} units`
      : 'N/A',
    duplicateRiskScore: duplicateFindings.exactMatchFound
      ? 'CRITICAL_EXACT_MATCH'
      : duplicateFindings.perceptualMatchFound
      ? 'HIGH_SIMILARITY'
      : 'LOW',
    missingAssetsCount: aiFindings.missingEvidence.length,
    distanceMeters: metadataFindings.distanceMeters || 0,
  };

  await task.save();

  // Worker Metric Dynamic Propagation on successful verification
  if (newVerificationStatus === 'Verified' && !wasVerified && task.assignedWorker) {
    try {
      const workerIdToUpdate = task.assignedWorker._id || task.assignedWorker;
      const worker = await Worker.findById(workerIdToUpdate);
      if (worker) {
        worker.completedJobs = (worker.completedJobs || 0) + 1;
        worker.tasksToday = (worker.tasksToday || 0) + 1;
        const budgetToAdd =
          typeof task.budget === 'number'
            ? task.budget
            : parseFloat(String(task.budget).replace(/[^0-9.]/g, '')) || 35;
        worker.balance = Number(((worker.balance || 0) + budgetToAdd).toFixed(2));
        worker.recentTask = `${task.taskId} ${task.title}`.trim();

        // Calculate dynamic accuracy percentage based on actual tasks in MongoDB
        const [verifiedCount, totalCompletedCount] = await Promise.all([
          Task.countDocuments({
            assignedWorker: worker._id,
            verificationStatus: 'Verified',
          }),
          Task.countDocuments({
            assignedWorker: worker._id,
            $or: [{ status: 'Completed' }, { verificationStatus: { $in: ['Verified', 'Failed'] } }],
          }),
        ]);

        const effectiveVerified = Math.max(1, verifiedCount);
        const effectiveTotal = Math.max(effectiveVerified, totalCompletedCount);
        worker.accuracy = Number(((effectiveVerified / effectiveTotal) * 100).toFixed(1));

        await worker.save();
      }
    } catch (workerErr) {
      console.warn('[Pipeline] Worker metric propagation notice:', workerErr.message);
    }
  }

  // Audit activity log
  await Activity.create({
    taskId: task.taskId,
    activityType:
      newVerificationStatus === 'Verified'
        ? 'VERIFICATION_PASSED'
        : newVerificationStatus === 'Failed'
        ? 'VERIFICATION_FAILED'
        : 'VERIFICATION_FLAGGED',
    title: `AI Vision Verification: ${newVerificationStatus}`,
    description: `Task ${task.taskId} evaluated by ${aiFindings.modelProvider} (${aiFindings.modelName}). Risk Score: ${riskAssessment.riskScore} (${riskAssessment.riskCategory}). Recommendation: ${riskAssessment.recommendation}.`,
    actor: aiFindings.isMock
      ? 'MockVerificationEngine'
      : aiFindings.modelProvider === 'groq'
      ? 'GroqVisionEngine'
      : 'GeminiVisionEngine',
    level: newVerificationStatus === 'Verified' ? 'info' : newVerificationStatus === 'Failed' ? 'danger' : 'warning',
    source: 'VisionVerificationPipeline',
  });

  return verificationDoc;
};
