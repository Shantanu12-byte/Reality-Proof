import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import { Verification } from '../models/Verification.js';
import { Task } from '../models/Task.js';
import { Activity } from '../models/Activity.js';
import { Worker } from '../models/Worker.js';
import { runVerificationPipeline } from '../services/verificationPipeline.js';

// Helper to escape regex
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @desc    Start AI Vision Analysis for a task's submitted evidence
 * @route   POST /api/verifications/:taskId/analyze
 * @access  Public
 */
export const analyzeTaskEvidence = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    let imageBuffer = null;
    let imagePath = null;
    let imageUrl = null;
    let fileMeta = null;

    // Handle file upload from multer
    if (req.file) {
      imageBuffer = req.file.buffer || (await fs.readFile(req.file.path));
      imagePath = req.file.path;
      fileMeta = {
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname,
      };
      // Relative URL for frontend client display
      imageUrl = `/uploads/evidence/${path.basename(req.file.path)}`;
    } else if (req.body?.imageUrl) {
      imageUrl = req.body.imageUrl;
    } else if (req.body?.imageBase64) {
      const base64Str = req.body.imageBase64.includes(',')
        ? req.body.imageBase64.split(',')[1]
        : req.body.imageBase64;
      imageBuffer = Buffer.from(base64Str, 'base64');
      imageUrl = req.body.imageBase64.startsWith('data:')
        ? req.body.imageBase64
        : `data:image/jpeg;base64,${base64Str}`;
    }

    const verificationResult = await runVerificationPipeline({
      taskId,
      imageBuffer,
      imagePath,
      imageUrl,
      fileMeta,
    });

    res.status(200).json({
      success: true,
      message: 'Evidence analysis completed successfully',
      data: verificationResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retrieve the latest verification result for a task
 * @route   GET /api/verifications/:taskId
 * @access  Public
 */
export const getLatestVerification = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const verification = await Verification.findOne({
      taskId: new RegExp(`^${escapeRegex(taskId)}$`, 'i'),
    }).sort({ createdAt: -1 });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: `No verification record found for task "${taskId}"`,
      });
    }

    res.status(200).json({
      success: true,
      data: verification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retrieve historical verification results for a task
 * @route   GET /api/verifications/:taskId/history
 * @access  Public
 */
export const getVerificationHistory = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const history = await Verification.find({
      taskId: new RegExp(`^${escapeRegex(taskId)}$`, 'i'),
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retrieve verification records with filtering
 * @route   GET /api/verifications
 * @access  Public
 */
export const getVerifications = async (req, res, next) => {
  try {
    const {
      status,
      recommendation,
      riskCategory,
      overallAssessment,
      isMock,
      search,
      limit = 50,
      page = 1,
    } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.analysisStatus = status;
    }
    if (recommendation && recommendation !== 'All') {
      query.recommendation = recommendation;
    }
    if (riskCategory && riskCategory !== 'All') {
      query.riskCategory = riskCategory;
    }
    if (overallAssessment && overallAssessment !== 'All') {
      query.overallAssessment = overallAssessment;
    }
    if (isMock !== undefined) {
      query.isMock = isMock === 'true';
    }

    if (search) {
      const safeTerm = escapeRegex(search.trim());
      query.$or = [
        { taskId: { $regex: safeTerm, $options: 'i' } },
        { summary: { $regex: safeTerm, $options: 'i' } },
        { explanation: { $regex: safeTerm, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const [verifications, total] = await Promise.all([
      Verification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Verification.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      count: verifications.length,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
      data: verifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retry a failed or previous analysis
 * @route   POST /api/verifications/:id/retry
 * @access  Public
 */
export const retryVerification = async (req, res, next) => {
  try {
    const { id } = req.params;

    let existing = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      existing = await Verification.findById(id);
    }
    if (!existing) {
      existing = await Verification.findOne({
        taskId: new RegExp(`^${escapeRegex(id)}$`, 'i'),
      }).sort({ createdAt: -1 });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Verification record with ID "${id}" not found.`,
      });
    }

    const imageUrl =
      existing.evidenceIds?.[0] || existing.evidenceThumbnails?.[0] || null;

    let imagePath = null;
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      imagePath = path.join(process.cwd(), 'backend', imageUrl);
    }

    const retryResult = await runVerificationPipeline({
      taskId: existing.taskId,
      imageUrl,
      imagePath,
    });

    res.status(200).json({
      success: true,
      message: 'Verification retry executed successfully',
      data: retryResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Allow an authorized reviewer to approve, reject or request additional evidence.
 *          Stores human decision separately from AI recommendation.
 * @route   POST /api/verifications/:id/review
 * @access  Public
 */
export const reviewVerification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, notes, reviewerName } = req.body;

    const validDecisions = ['approve', 'reject', 'request_evidence'];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: `Invalid review decision. Must be one of: ${validDecisions.join(', ')}`,
      });
    }

    let verification = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      verification = await Verification.findById(id);
    }
    if (!verification) {
      verification = await Verification.findOne({
        taskId: new RegExp(`^${escapeRegex(id)}$`, 'i'),
      }).sort({ createdAt: -1 });
    }

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: `Verification record with ID "${id}" not found.`,
      });
    }

    // Map human decision to database representation
    const decisionEnumMap = {
      approve: 'approved',
      reject: 'rejected',
      request_evidence: 'evidence_requested',
    };

    const reviewer = reviewerName || 'Authorized Field Supervisor';

    // Store human decision separately from AI recommendation
    verification.humanDecision = decisionEnumMap[decision];
    verification.reviewerId = reviewer;
    verification.humanReview = {
      reviewed: true,
      decision: decisionEnumMap[decision],
      reviewer,
      notes: notes || '',
      reviewedAt: new Date(),
    };

    await verification.save();

    // Synchronize Task state with human reviewer override
    const task = await Task.findOne({
      taskId: new RegExp(`^${escapeRegex(verification.taskId)}$`, 'i'),
    });

    if (task) {
      const prevStatus = task.verificationStatus;
      if (decision === 'approve') {
        task.verificationStatus = 'Verified';
        task.confidenceScore = Math.max(task.confidenceScore || 0, 95);
        task.exceptionReason = '';
      } else if (decision === 'reject') {
        task.verificationStatus = 'Rejected';
        task.status = 'Rejected';
        task.paymentStatus = 'Not Eligible';
        task.confidenceScore = Math.min(task.confidenceScore || 100, 20);
        task.exceptionReason = notes || 'Rejected by human reviewer override. Critical flag resolved.';
      } else if (decision === 'request_evidence') {
        task.verificationStatus = 'Review Required';
        task.exceptionReason = notes || 'Additional evidence requested by reviewer.';
      }

      await task.save();

      // If approved, update worker metrics
      if (decision === 'approve' && prevStatus !== 'Verified' && task.assignedWorker) {
        const worker = await Worker.findById(task.assignedWorker);
        if (worker) {
          worker.completedJobs = (worker.completedJobs || 0) + 1;
          worker.balance = Number(((worker.balance || 0) + (task.budget || 35)).toFixed(2));
          worker.recentTask = task.taskId;
          await worker.save();
        }
      }

      // Record Activity Audit Log
      await Activity.create({
        taskId: task.taskId,
        activityType: 'HUMAN_REVIEW_OVERRIDE',
        title: `Human Reviewer Override: ${decisionEnumMap[decision].toUpperCase()}`,
        description: `Reviewer "${reviewer}" recorded decision "${decisionEnumMap[decision]}" for task ${task.taskId}. Notes: ${notes || 'None'}. (AI Recommendation was: ${verification.recommendation}).`,
        actor: reviewer,
        level: decision === 'approve' ? 'info' : decision === 'reject' ? 'danger' : 'warning',
        source: 'ReviewerAuditConsole',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Human review decision recorded successfully',
      data: verification,
    });
  } catch (error) {
    next(error);
  }
};
