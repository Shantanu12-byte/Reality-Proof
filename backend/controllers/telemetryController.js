import { Worker } from '../models/Worker.js';
import { Task } from '../models/Task.js';
import { ZONE_COORDINATES, resolveTargetCoordinates } from '../services/verificationService.js';

// Resolve worker coordinate based on zone or city
const resolveWorkerCoordinates = (worker) => {
  const zoneKey = (worker.zone || '').trim().toLowerCase();
  for (const [key, coords] of Object.entries(ZONE_COORDINATES)) {
    if (zoneKey.includes(key) || key.includes(zoneKey)) {
      return coords;
    }
  }

  const cityKey = (worker.city || '').trim().toLowerCase();
  for (const [key, coords] of Object.entries(ZONE_COORDINATES)) {
    if (cityKey.includes(key) || key.includes(cityKey)) {
      return coords;
    }
  }

  return ZONE_COORDINATES.pune;
};

// @desc    Get real-time GPS telemetry locations for workers and tasks
// @route   GET /api/telemetry/locations
// @access  Public
export const getTelemetryLocations = async (req, res, next) => {
  try {
    const [workers, tasks] = await Promise.all([
      Worker.find({ status: { $in: ['Active', 'Idle', 'Under Review'] } })
        .select('workerId name city zone status accuracy rating balance recentTask avatar')
        .lean(),
      Task.find({ status: { $nin: ['Cancelled', 'Rejected'] } })
        .populate('assignedWorker', 'workerId name avatar')
        .populate('paymentRef', 'paymentStatus payoutStatus captureStatus')
        .sort({ createdAt: -1 })
        .limit(40)
        .lean(),
    ]);

    const workerNodes = workers.map((w) => {
      const coords = resolveWorkerCoordinates(w);
      return {
        id: `node-worker-${w.workerId}`,
        entityType: 'worker',
        workerId: w.workerId,
        name: w.name,
        city: w.city,
        zone: w.zone,
        status: w.status,
        accuracy: w.accuracy,
        rating: w.rating,
        balance: w.balance,
        recentTask: w.recentTask || '',
        avatar: w.avatar || w.name.slice(0, 2).toUpperCase(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        lat: coords.latitude,
        lng: coords.longitude,
        lastPing: new Date().toISOString(),
      };
    });

    // Exclude tasks from GPS map if the task is done and settlements are done & payment is released
    const activeTasks = tasks.filter((t) => {
      const isDone = t.status === 'Completed';
      const isPaymentReleased =
        t.paymentStatus === 'Completed' ||
        t.paymentStatus === 'Paid Out' ||
        t.paymentStatus === 'Paid' ||
        (t.paymentRef && (
          t.paymentRef.payoutStatus === 'SUCCESS' ||
          t.paymentRef.payoutStatus === 'MANUAL_SETTLED' ||
          t.paymentRef.paymentStatus === 'PAID_OUT'
        ));

      if (isDone && isPaymentReleased) {
        return false; // Remove completed & settled/released task from GPS map
      }
      return true;
    });

    const taskNodes = activeTasks.map((t) => {
      const coords = resolveTargetCoordinates(t);
      return {
        id: `node-task-${t.taskId}`,
        entityType: 'task',
        taskId: t.taskId,
        title: t.title,
        location: t.location,
        address: t.address,
        status: t.status,
        verificationStatus: t.verificationStatus,
        paymentStatus: t.paymentStatus,
        confidenceScore: t.confidenceScore,
        budget: t.budget,
        assignedWorker: t.assignedWorker
          ? {
              workerId: t.assignedWorker.workerId,
              name: t.assignedWorker.name,
              avatar: t.assignedWorker.avatar,
            }
          : null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        lat: coords.latitude,
        lng: coords.longitude,
        aiChecks: t.aiChecks || {},
        updatedAt: t.updatedAt,
      };
    });

    const allLocations = [...workerNodes, ...taskNodes];

    res.status(200).json({
      success: true,
      count: allLocations.length,
      data: allLocations,
      meta: {
        workerCount: workerNodes.length,
        taskCount: taskNodes.length,
        activeCities: [...new Set(workers.map((w) => w.city))],
      },
    });
  } catch (error) {
    next(error);
  }
};
