import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { Worker } from '../models/Worker.js';
import { Activity } from '../models/Activity.js';
import { Payment } from '../models/Payment.js';
import { evaluateTaskVerification } from '../services/verificationService.js';
import { logger } from '../services/logger.js';

// Helper to escape special characters in user queries for regex safety
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Extract true numeric maximum suffix for RP-xxxx task IDs to avoid
 * string regex collation sorting bugs.
 */
export const getNextTaskId = async () => {
  const existingTasks = await Task.find({ taskId: /^RP-\d+$/i }, 'taskId').lean();
  let maxIdNum = 1000;
  for (const t of existingTasks) {
    if (t.taskId) {
      const match = t.taskId.match(/^RP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxIdNum) {
          maxIdNum = num;
        }
      }
    }
  }
  return `RP-${maxIdNum + 1}`;
};

// @desc    Get all tasks with optional search & filter
// @route   GET /api/tasks
// @access  Public
export const getTasks = async (req, res, next) => {
  try {
    const { search, q, status, verificationStatus, city, location } = req.query;
    const andConditions = [];

    // Filter by verification status / status
    const targetStatus = status || verificationStatus;
    if (targetStatus && targetStatus !== 'All') {
      if (['Verified', 'Review Required', 'Failed', 'Pending', 'Rejected'].includes(targetStatus)) {
        andConditions.push({ verificationStatus: targetStatus });
      } else if (targetStatus === 'Under Review') {
        andConditions.push({
          $or: [{ verificationStatus: 'Review Required' }, { status: 'Under Review' }],
        });
      } else {
        andConditions.push({ status: targetStatus });
      }
    }

    // Filter by city / zone
    const targetCity = (city || location || '').trim();
    if (targetCity && targetCity !== 'All') {
      andConditions.push({ location: { $regex: new RegExp(`^${escapeRegex(targetCity)}$`, 'i') } });
    }

    // Search query across ID, title, location, description, worker name
    const searchTerm = (search || q || '').trim();
    if (searchTerm) {
      const safeTerm = escapeRegex(searchTerm);
      // Find matching workers first to include their tasks
      const matchingWorkers = await Worker.find({
        name: { $regex: safeTerm, $options: 'i' },
      }).select('_id').lean();
      const workerIds = matchingWorkers.map((w) => w._id);

      const searchOrConditions = [
        { taskId: { $regex: safeTerm, $options: 'i' } },
        { title: { $regex: safeTerm, $options: 'i' } },
        { location: { $regex: safeTerm, $options: 'i' } },
        { description: { $regex: safeTerm, $options: 'i' } },
      ];
      if (workerIds.length > 0) {
        searchOrConditions.push({ assignedWorker: { $in: workerIds } });
      }

      andConditions.push({ $or: searchOrConditions });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const tasks = await Task.find(query)
      .populate('assignedWorker', 'workerId name avatar rating phone accuracy completedJobs city')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task by taskId or MongoDB _id
// @route   GET /api/tasks/:id
// @access  Public
export const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let task = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      task = await Task.findById(id).populate('assignedWorker');
    }

    if (!task) {
      task = await Task.findOne({
        taskId: { $regex: new RegExp(`^${escapeRegex(id)}$`, 'i') },
      }).populate('assignedWorker');
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task with identifier "${id}" not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Public
export const createTask = async (req, res, next) => {
  try {
    const {
      title,
      name, // Frontend may submit title or name
      description,
      location,
      address,
      workerName,
      workerId,
      assignedWorker,
      budget,
      deadline,
      evidenceRequirements,
      requiredEvidence,
      category,
    } = req.body;

    const taskTitle = (title || name || '').trim();
    if (!taskTitle) {
      return res.status(400).json({
        success: false,
        message: 'Task title / name is required',
      });
    }

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location / operational zone is required',
      });
    }

    // Auto-generate sequential Task ID using reliable numeric max
    const newTaskId = await getNextTaskId();

    // Resolve assigned worker
    let workerDoc = null;
    if (assignedWorker && mongoose.Types.ObjectId.isValid(assignedWorker)) {
      workerDoc = await Worker.findById(assignedWorker);
    } else if (workerId) {
      workerDoc = await Worker.findOne({ workerId: new RegExp(`^${escapeRegex(workerId)}$`, 'i') });
    } else if (workerName) {
      workerDoc = await Worker.findOne({ name: new RegExp(`^${escapeRegex(workerName)}$`, 'i') });
    }

    // Normalize budget: validate and reject negative budgets
    let numericBudget = 35.0;
    if (budget !== undefined && budget !== null) {
      const strVal = String(budget).trim();
      if (strVal.startsWith('-') || Number(budget) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Budget cannot be negative',
        });
      }
      const parsed = parseFloat(strVal.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed >= 0) {
        numericBudget = parsed;
      }
    }

    // Normalize evidence requirements
    const rawEvidence = evidenceRequirements || requiredEvidence || [];
    const formattedEvidence = Array.isArray(rawEvidence)
      ? rawEvidence.map((item) => {
          if (typeof item === 'string') {
            return {
              label: item,
              status: 'pending',
              description: 'Awaiting field inspector upload',
            };
          }
          return {
            label: item.label || 'Evidence Item',
            status: item.status || 'pending',
            description: item.description || '',
          };
        })
      : [
          { label: 'Storefront Verification Photo', status: 'pending', description: 'Clear frontal aspect' },
          { label: 'GPS Geotag verification', status: 'pending', description: 'Within 50m of coordinates' },
        ];

    const newTask = new Task({
      taskId: newTaskId,
      title: taskTitle,
      description: (description || '').trim(),
      category: category || 'Visual Verification',
      location: location.trim(),
      address: (address || `${location} Commercial Zone`).trim(),
      assignedWorker: workerDoc ? workerDoc._id : null,
      budget: numericBudget,
      deadline: deadline || '2026-11-06 18:00',
      status: 'Pending',
      verificationStatus: 'Pending',
      paymentStatus: 'Pending',
      confidenceScore: 0,
      evidenceRequirements: formattedEvidence,
      aiChecks: {
        perceptualHashMatch: false,
        exifVerified: false,
        geoFenceMatch: false,
        lightingAdequacy: null,
        shelfFillRate: 'Pending',
      },
      evidenceThumbnails: [],
      submitted: 'Just now',
      date: new Date().toISOString().split('T')[0],
    });

    const savedTask = await newTask.save();
    await savedTask.populate('assignedWorker', 'workerId name avatar rating phone accuracy completedJobs city');

    // Initialize Phase 6 PayPal Payment Ledger Record
    try {
      const paymentId = await Payment.getNextPaymentId();
      const newPayment = await Payment.create({
        paymentId,
        taskId: newTaskId,
        taskRef: savedTask._id,
        workerId: workerDoc ? workerDoc._id : null,
        workerIdStr: workerDoc ? workerDoc.workerId : '',
        amount: numericBudget,
        currency: process.env.PAYPAL_CURRENCY || 'USD',
        paymentStatus: 'CREATED',
        authorizationStatus: 'PENDING',
        captureStatus: 'NONE',
        payoutStatus: 'NOT_APPLICABLE',
      });
      savedTask.paymentId = newPayment.paymentId;
      savedTask.paymentRef = newPayment._id;
      await savedTask.save();
    } catch (payInitErr) {
      logger.warn('TaskCreate', `Payment record initialization notice: ${payInitErr.message}`);
    }

    // Create Activity log
    await Activity.create({
      taskId: newTaskId,
      activityType: 'TASK_CREATED',
      title: 'New Verification Task Dispatched',
      description: `Task ${newTaskId} ("${taskTitle}") dispatched to ${workerDoc ? workerDoc.name : 'Unassigned worker'} in ${location}.`,
      actor: 'Dispatcher',
      level: 'info',
      source: 'DispatchControlCenter',
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: savedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task information, run dynamic verification & propagate worker metrics
// @route   PUT /api/tasks/:id
// @access  Public
export const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    let task = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      task = await Task.findById(id);
    }
    if (!task) {
      task = await Task.findOne({
        taskId: { $regex: new RegExp(`^${escapeRegex(id)}$`, 'i') },
      });
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task with identifier "${id}" not found`,
      });
    }

    const wasVerifiedOrCompleted =
      task.verificationStatus === 'Verified' || task.status === 'Completed';

    const {
      title,
      name,
      description,
      location,
      address,
      budget,
      deadline,
      status,
      verificationStatus,
      aiResult,
      confidenceScore,
      paymentStatus,
      evidenceRequirements,
      requiredEvidence,
      assignedWorker,
      workerId,
      exceptionReason,
      evidence,
      submissionGps,
      runVerification,
    } = req.body;

    if (title || name) task.title = (title || name).trim();
    if (description !== undefined) task.description = description.trim();
    if (location) task.location = location.trim();
    if (address !== undefined) task.address = address.trim();

    if (budget !== undefined) {
      const strVal = String(budget).trim();
      if (strVal.startsWith('-') || Number(budget) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Budget cannot be negative',
        });
      }
      const parsed = parseFloat(strVal.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed >= 0) task.budget = parsed;
    }

    if (deadline !== undefined) task.deadline = deadline;
    if (status !== undefined) task.status = status;

    const rawEvidence = evidenceRequirements || requiredEvidence;
    if (rawEvidence && Array.isArray(rawEvidence)) {
      task.evidenceRequirements = rawEvidence;
    }

    // Dynamic Verification Engine Evaluation
    if (evidence || submissionGps !== undefined || runVerification) {
      const evalResult = evaluateTaskVerification(task, evidence, submissionGps);
      task.confidenceScore = evalResult.confidenceScore;
      task.verificationStatus = evalResult.verificationStatus;
      task.exceptionReason = evalResult.exceptionReason;
      task.aiChecks = evalResult.aiChecks;
    } else {
      const newVerification = verificationStatus || aiResult;
      if (newVerification !== undefined) {
        task.verificationStatus = newVerification;
        if (newVerification === 'Verified') {
          if (confidenceScore !== undefined && Number(confidenceScore) > 0) {
            task.confidenceScore = Number(confidenceScore);
          } else if (!task.confidenceScore || task.confidenceScore === 0) {
            // Dynamic evaluation based on task requirements
            const evalResult = evaluateTaskVerification(task, task.evidenceRequirements);
            task.confidenceScore = evalResult.confidenceScore;
            task.verificationStatus = evalResult.verificationStatus;
            task.exceptionReason = evalResult.exceptionReason;
            task.aiChecks = evalResult.aiChecks;
          }
        }
      }

      if (confidenceScore !== undefined) {
        task.confidenceScore = Number(confidenceScore);
      }
      if (exceptionReason !== undefined) {
        task.exceptionReason = exceptionReason;
      }
    }

    if (paymentStatus !== undefined) task.paymentStatus = paymentStatus;

    if (assignedWorker && mongoose.Types.ObjectId.isValid(assignedWorker)) {
      task.assignedWorker = assignedWorker;
    } else if (workerId) {
      const foundWorker = await Worker.findOne({ workerId });
      if (foundWorker) task.assignedWorker = foundWorker._id;
    }

    const updatedTask = await task.save();
    await updatedTask.populate('assignedWorker', 'workerId name avatar rating phone accuracy completedJobs city balance');

    const isNowVerifiedOrCompleted =
      updatedTask.verificationStatus === 'Verified' || updatedTask.status === 'Completed';

    // Worker Metric Dynamic Propagation on verification or completion
    if (!wasVerifiedOrCompleted && isNowVerifiedOrCompleted && updatedTask.assignedWorker) {
      const workerIdToUpdate = updatedTask.assignedWorker._id || updatedTask.assignedWorker;
      const worker = await Worker.findById(workerIdToUpdate);

      if (worker) {
        worker.completedJobs = (worker.completedJobs || 0) + 1;
        worker.tasksToday = (worker.tasksToday || 0) + 1;

        const budgetToAdd = typeof updatedTask.budget === 'number' ? updatedTask.budget : 0;
        worker.balance = Number(((worker.balance || 0) + budgetToAdd).toFixed(2));
        worker.recentTask = `${updatedTask.taskId} ${updatedTask.title}`.trim();

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

        // Authentic Activity log for state propagation
        await Activity.create({
          taskId: updatedTask.taskId,
          activityType: 'VERIFICATION_PASSED',
          title: 'Verification Passed & Worker Credited',
          description: `Task ${updatedTask.taskId} verified (Score: ${updatedTask.confidenceScore}%). Credited $${budgetToAdd.toFixed(2)} to ${worker.name} (${worker.workerId}). Total jobs: ${worker.completedJobs}.`,
          actor: 'VerificationEngine',
          level: 'success',
          source: 'VerificationEngine',
        });
      }
    } else if (verificationStatus || aiResult || paymentStatus) {
      // General status update Activity log
      await Activity.create({
        taskId: updatedTask.taskId,
        activityType: 'TASK_STATUS_UPDATED',
        title: 'Task Status Updated',
        description: `Task ${updatedTask.taskId} updated. Verification: "${updatedTask.verificationStatus}", Status: "${updatedTask.status}", Payment: "${updatedTask.paymentStatus}".`,
        actor: 'Dispatcher',
        level:
          updatedTask.verificationStatus === 'Verified'
            ? 'success'
            : updatedTask.verificationStatus === 'Failed'
              ? 'danger'
              : 'warning',
        source: 'OperationsConsole',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Public
export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    let task = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      task = await Task.findById(id);
    }
    if (!task) {
      task = await Task.findOne({
        taskId: { $regex: new RegExp(`^${escapeRegex(id)}$`, 'i') },
      });
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task with identifier "${id}" not found`,
      });
    }

    const deletedTaskId = task.taskId;
    await Task.deleteOne({ _id: task._id });

    // Log activity
    await Activity.create({
      taskId: deletedTaskId,
      activityType: 'TASK_DELETED',
      title: 'Task Removed',
      description: `Task ${deletedTaskId} was deleted from database.`,
      actor: 'Admin',
      level: 'warning',
      source: 'OperationsConsole',
    });

    res.status(200).json({
      success: true,
      message: `Task ${deletedTaskId} successfully deleted`,
      taskId: deletedTaskId,
    });
  } catch (error) {
    next(error);
  }
};
