import path from 'path';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { Verification } from '../models/Verification.js';
import { Activity } from '../models/Activity.js';
import { runVerificationPipeline } from '../services/verificationPipeline.js';
import { logger } from '../services/logger.js';

// Helper to escape regex
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @desc    Upload evidence photo(s) to server storage
 * @route   POST /api/evidence/upload
 * @access  Public (or Worker authenticated)
 */
export const uploadEvidenceFiles = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please select or capture an inspection photograph.',
      });
    }

    const uploadedAssets = files.map((file) => {
      const filename = path.basename(file.path);
      const relativeUrl = `/uploads/evidence/${filename}`;
      return {
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: relativeUrl,
      };
    });

    res.status(201).json({
      success: true,
      message: `${uploadedAssets.length} evidence asset(s) saved successfully.`,
      data: uploadedAssets,
      // Convenience field for single uploads
      url: uploadedAssets[0].url,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit evidence for a task and trigger verification pipeline
 * @route   POST /api/evidence/submit
 * @access  Worker Protected
 */
export const submitTaskEvidence = async (req, res, next) => {
  try {
    const worker = req.worker;
    const { taskId, evidenceList = [], images = [], submissionMetadata = {} } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required for evidence submission.',
      });
    }

    // 1. Locate task in database
    const task = await Task.findOne({
      taskId: new RegExp(`^${escapeRegex(taskId)}$`, 'i'),
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task "${taskId}" not found.`,
      });
    }

    // 2. Strict Backend Ownership Check
    if (task.assignedWorker && !task.assignedWorker.equals(worker._id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot submit evidence for a task assigned to another inspector.',
      });
    }

    // 3. Prevent accidental duplicate rapid submissions
    if (task.status === 'Under Review' && task.submitted === 'Just now' && task.evidenceThumbnails?.length > 0) {
      // Allow re-submission only if explicitly updating or 3 seconds have elapsed
      const lastUpdateSecs = (Date.now() - new Date(task.updatedAt).getTime()) / 1000;
      if (lastUpdateSecs < 3) {
        return res.status(429).json({
          success: false,
          message: 'Evidence submission already processing. Please wait a moment before re-submitting.',
        });
      }
    }

    // 4. Normalize evidence asset URLs
    const assetUrls = [];
    if (Array.isArray(evidenceList)) {
      evidenceList.forEach((item) => {
        if (typeof item === 'string') assetUrls.push(item);
        else if (item?.url) assetUrls.push(item.url);
      });
    }
    if (Array.isArray(images)) {
      images.forEach((img) => {
        if (typeof img === 'string') assetUrls.push(img);
        else if (img?.url) assetUrls.push(img.url);
      });
    }

    const uniqueAssetUrls = [...new Set(assetUrls)].filter(Boolean);

    if (uniqueAssetUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid photographic evidence asset must be included.',
      });
    }

    // 5. Update Task document
    // Merge new thumbnails with existing thumbnails
    task.evidenceThumbnails = [...new Set([...uniqueAssetUrls, ...(task.evidenceThumbnails || [])])];
    task.status = 'Under Review';
    task.submitted = 'Just now';
    task.date = new Date().toISOString().split('T')[0];

    // Mark matched requirements as pending evaluation
    if (Array.isArray(task.evidenceRequirements) && Array.isArray(evidenceList)) {
      task.evidenceRequirements = task.evidenceRequirements.map((req) => {
        const matchingSubmission = evidenceList.find(
          (e) => (e.requirementLabel || e.label)?.toLowerCase() === req.label.toLowerCase()
        );
        if (matchingSubmission) {
          return {
            label: req.label,
            status: 'pending',
            description: matchingSubmission.notes || req.description || 'Evidence uploaded by inspector',
          };
        }
        return req;
      });
    }

    // Attach device metadata and GPS if provided
    if (submissionMetadata.gps && typeof submissionMetadata.gps.latitude === 'number') {
      task.aiChecks = {
        ...(task.aiChecks || {}),
        geoFenceMatch: true, // Will be verified in pipeline
      };
    }

    await task.save();

    // 6. Record Activity Audit Trail
    await Activity.create({
      taskId: task.taskId,
      activityType: 'EVIDENCE_SUBMITTED',
      title: 'Field Evidence Submitted',
      description: `Field Inspector ${worker.name} submitted ${uniqueAssetUrls.length} photographic asset(s) for task ${task.taskId}.`,
      actor: worker.name,
      level: 'info',
      source: 'WorkerMobilePortal',
    });

    // 7. Trigger the Real AI Verification Pipeline on the primary evidence asset
    let verificationResult = null;
    try {
      const primaryImageUrl = uniqueAssetUrls[0];
      let imageBuffer = null;
      let imagePath = null;

      if (primaryImageUrl.startsWith('/uploads/')) {
        imagePath = path.join(process.cwd(), 'backend', primaryImageUrl);
        try {
          imageBuffer = await fs.readFile(imagePath);
        } catch (readErr) {
          logger.warn('EvidenceSubmit', `Could not read file from disk for direct pipeline: ${readErr.message}`);
        }
      }

      verificationResult = await runVerificationPipeline({
        taskId: task.taskId,
        imageBuffer,
        imagePath,
        imageUrl: primaryImageUrl,
      });
    } catch (pipelineErr) {
      logger.warn('EvidenceSubmit', `Automatic pipeline trigger notice: ${pipelineErr.message}`);
      // Non-fatal for submission: the submission itself succeeded and task is Under Review
    }

    res.status(200).json({
      success: true,
      message: 'Evidence submitted successfully! Analysis pipeline triggered.',
      submissionId: `SUB-${Date.now().toString(36).toUpperCase()}`,
      data: {
        task,
        verification: verificationResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

