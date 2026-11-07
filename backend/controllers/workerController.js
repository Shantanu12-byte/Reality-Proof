import mongoose from 'mongoose';
import { Worker } from '../models/Worker.js';
import { Task } from '../models/Task.js';

// Helper to escape special characters in user queries for regex safety
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// @desc    Get all workers with optional search and city filter
// @route   GET /api/workers
// @access  Public
export const getWorkers = async (req, res, next) => {
  try {
    const { search, q, city, location } = req.query;
    const query = {};

    const targetCity = (city || location || '').trim();
    if (targetCity && targetCity !== 'All') {
      query.city = { $regex: new RegExp(`^${escapeRegex(targetCity)}$`, 'i') };
    }

    const searchTerm = (search || q || '').trim();
    if (searchTerm) {
      const safeTerm = escapeRegex(searchTerm);
      query.$or = [
        { name: { $regex: safeTerm, $options: 'i' } },
        { workerId: { $regex: safeTerm, $options: 'i' } },
        { email: { $regex: safeTerm, $options: 'i' } },
        { city: { $regex: safeTerm, $options: 'i' } },
      ];
    }

    const workers = await Worker.find(query).sort({ rating: -1, completedJobs: -1 });

    res.status(200).json({
      success: true,
      count: workers.length,
      data: workers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get worker details and task history
// @route   GET /api/workers/:id
// @access  Public
export const getWorkerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let worker = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      worker = await Worker.findById(id);
    }
    if (!worker) {
      worker = await Worker.findOne({
        workerId: { $regex: new RegExp(`^${escapeRegex(id)}$`, 'i') },
      });
    }

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: `Worker with identifier "${id}" not found`,
      });
    }

    // Retrieve worker's task history
    const taskHistory = await Task.find({
      $or: [{ assignedWorker: worker._id }, { 'worker.name': worker.name }],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    const workerObj = worker.toJSON();
    workerObj.taskHistory = taskHistory;

    res.status(200).json({
      success: true,
      data: workerObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new worker
// @route   POST /api/workers
// @access  Public
export const createWorker = async (req, res, next) => {
  try {
    const { name, email, phone, city, location, zone, rating, accuracy, balance, status, paypalStatus } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Worker name and email are required fields',
      });
    }

    const targetCity = city || location || 'Pune';

    // Generate next workerId (e.g. WRK-409)
    const existingWorkers = await Worker.find({}, { workerId: 1 }).lean();
    let maxIdNum = 400;
    existingWorkers.forEach((w) => {
      const match = w.workerId && w.workerId.match(/^WRK-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxIdNum) maxIdNum = num;
      }
    });
    const newWorkerId = `WRK-${maxIdNum + 1}`;

    const newWorker = new Worker({
      workerId: newWorkerId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone || '+91 98000 00000',
      city: targetCity.trim(),
      zone: zone || `${targetCity} Central`,
      rating: rating !== undefined ? Number(rating) : 5.0,
      accuracy: accuracy !== undefined ? Number(accuracy) : 95.0,
      completedJobs: 0,
      balance: balance !== undefined ? Number(balance) : 0.0,
      status: status || 'Active',
      paypalStatus: paypalStatus || 'Linked & Verified',
    });

    const savedWorker = await newWorker.save();

    res.status(201).json({
      success: true,
      message: 'Worker created successfully',
      data: savedWorker,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update worker information and status
// @route   PUT /api/workers/:id
// @access  Public
export const updateWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    let worker = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      worker = await Worker.findById(id);
    }
    if (!worker) {
      worker = await Worker.findOne({
        workerId: { $regex: new RegExp(`^${escapeRegex(id)}$`, 'i') },
      });
    }

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: `Worker with identifier "${id}" not found`,
      });
    }

    const { name, email, phone, city, location, zone, rating, accuracy, completedJobs, balance, status, paypalStatus } =
      req.body;

    if (name) worker.name = name.trim();
    if (email) worker.email = email.trim().toLowerCase();
    if (phone !== undefined) worker.phone = phone.trim();
    if (city || location) worker.city = (city || location).trim();
    if (zone !== undefined) worker.zone = zone.trim();
    if (rating !== undefined) worker.rating = Number(rating);
    if (accuracy !== undefined) worker.accuracy = Number(accuracy);
    if (completedJobs !== undefined) worker.completedJobs = Number(completedJobs);
    if (balance !== undefined) worker.balance = Number(balance);
    if (status) worker.status = status;
    if (paypalStatus) worker.paypalStatus = paypalStatus;

    const updatedWorker = await worker.save();

    res.status(200).json({
      success: true,
      message: 'Worker updated successfully',
      data: updatedWorker,
    });
  } catch (error) {
    next(error);
  }
};

