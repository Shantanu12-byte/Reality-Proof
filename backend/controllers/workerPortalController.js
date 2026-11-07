import mongoose from 'mongoose';
import { Worker } from '../models/Worker.js';
import { Task } from '../models/Task.js';
import { Verification } from '../models/Verification.js';
import { generateWorkerToken } from '../middleware/authMiddleware.js';

// Helper to escape regex
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @desc    Worker login for Worker Portal
 * @route   POST /api/worker/login
 * @access  Public
 */
export const workerLogin = async (req, res, next) => {
  try {
    const { workerId, email, password } = req.body;
    const identifier = (workerId || email || '').trim();

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required.',
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }

    const worker = await Worker.findOne({
      $or: [
        { workerId: new RegExp(`^${escapeRegex(identifier)}$`, 'i') },
        { email: new RegExp(`^${escapeRegex(identifier)}$`, 'i') },
      ],
    }).select('+password');

    if (!worker) {
      return res.status(401).json({
        success: false,
        message: `Invalid Worker ID or credentials for "${identifier}".`,
      });
    }

    const isMatch = await worker.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Worker ID or password.',
      });
    }

    const token = generateWorkerToken(worker);

    res.status(200).json({
      success: true,
      token,
      data: worker,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List available demo workers for development 1-click login
 * @route   GET /api/worker/demo-list
 * @access  Public
 */
export const getWorkerDemoList = async (req, res, next) => {
  try {
    const workers = await Worker.find()
      .select('workerId name city zone rating accuracy status completedJobs balance avatar phone email')
      .sort({ workerId: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: workers.length,
      data: workers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get authenticated worker profile and dynamic stats
 * @route   GET /api/worker/me
 * @access  Worker Protected
 */
export const getWorkerMe = async (req, res, next) => {
  try {
    const worker = req.worker;

    // Concurrently aggregate worker's task counts
    const taskCounts = await Task.aggregate([
      { $match: { assignedWorker: worker._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const verificationCounts = await Task.aggregate([
      { $match: { assignedWorker: worker._id } },
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    taskCounts.forEach((t) => {
      if (t._id) countMap[t._id] = t.count;
    });

    const vMap = {};
    verificationCounts.forEach((v) => {
      if (v._id) vMap[v._id] = v.count;
    });

    const activeTasks = (countMap['In Progress'] || 0) + (countMap['Pending'] || 0);
    const submittedTasks = countMap['Under Review'] || 0;
    const completedTasks = countMap['Completed'] || worker.completedJobs || 0;
    const pendingVerificationCount = (vMap['Pending'] || 0) + (vMap['Review Required'] || 0);

    const workerData = worker.toJSON();
    workerData.stats = {
      activeTasks,
      submittedTasks,
      completedTasks,
      pendingVerificationCount,
      availableBalance: worker.balance || 0,
    };

    res.status(200).json({
      success: true,
      data: workerData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tasks assigned strictly to the authenticated worker
 * @route   GET /api/worker/tasks
 * @access  Worker Protected
 */
export const getWorkerTasks = async (req, res, next) => {
  try {
    const worker = req.worker;
    const { status, category } = req.query;

    const query = { assignedWorker: worker._id };

    if (status && status !== 'All') {
      if (status === 'Assigned') {
        query.status = { $in: ['Pending', 'Assigned'] };
      } else if (status === 'In Progress') {
        query.status = 'In Progress';
      } else if (status === 'Submitted') {
        query.$or = [{ status: 'Under Review' }, { verificationStatus: 'Review Required' }];
      } else if (status === 'Completed') {
        query.$or = [{ status: 'Completed' }, { verificationStatus: 'Verified' }];
      } else {
        query.status = status;
      }
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    const tasks = await Task.find(query)
      .populate('assignedWorker', 'workerId name city')
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

/**
 * @desc    Get single task details with strict worker-ownership enforcement
 * @route   GET /api/worker/tasks/:id
 * @access  Worker Protected
 */
export const getWorkerTaskById = async (req, res, next) => {
  try {
    const worker = req.worker;
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { taskId: id.toUpperCase() }] }
      : { taskId: new RegExp(`^${escapeRegex(id)}$`, 'i') };

    const task = await Task.findOne(query).populate('assignedWorker', 'workerId name phone rating accuracy');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task "${id}" not found.`,
      });
    }

    // Strict Backend Ownership Enforcement: Ensure task belongs to the authenticated worker
    const isOwner =
      task.assignedWorker &&
      (task.assignedWorker._id.equals(worker._id) ||
        String(task.assignedWorker.workerId).toUpperCase() === String(worker.workerId).toUpperCase());

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view or modify this task.',
      });
    }

    // Retrieve latest verification result if any exists
    const latestVerification = await Verification.findOne({
      taskId: task.taskId,
    }).sort({ createdAt: -1 });

    const taskData = task.toJSON();
    taskData.latestVerification = latestVerification;

    res.status(200).json({
      success: true,
      data: taskData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get submission history and verification reports for the authenticated worker
 * @route   GET /api/worker/submissions
 * @access  Worker Protected
 */
export const getWorkerSubmissions = async (req, res, next) => {
  try {
    const worker = req.worker;

    // 1. Get all task IDs assigned to this worker
    const workerTasks = await Task.find({ assignedWorker: worker._id }).select('taskId title location budget status verificationStatus');
    const taskIds = workerTasks.map((t) => t.taskId);

    // 2. Query verifications for these tasks
    const submissions = await Verification.find({
      taskId: { $in: taskIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Attach task summary to each submission for mobile card rendering
    const taskMap = new Map();
    workerTasks.forEach((t) => taskMap.set(t.taskId, t));

    const enrichedSubmissions = submissions.map((sub) => ({
      ...sub,
      task: taskMap.get(sub.taskId) || null,
    }));

    res.status(200).json({
      success: true,
      count: enrichedSubmissions.length,
      data: enrichedSubmissions,
    });
  } catch (error) {
    next(error);
  }
};

