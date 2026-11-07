import { Task } from '../models/Task.js';
import { Worker } from '../models/Worker.js';
import { Activity } from '../models/Activity.js';

// @desc    Get dashboard aggregated summary metrics from MongoDB
// @route   GET /api/dashboard/summary
// @access  Public
export const getDashboardSummary = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    // Execute Task $facet and Worker group concurrently in 1 round trip
    const [taskAggregationResult, workerAggregationResult] = await Promise.all([
      Task.aggregate([
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: '$verificationStatus',
                  count: { $sum: 1 },
                },
              },
            ],
            pendingPayment: [
              { $match: { paymentStatus: 'Pending' } },
              {
                $group: {
                  _id: null,
                  totalAmount: { $sum: '$budget' },
                  count: { $sum: 1 },
                },
              },
            ],
            zones: [
              {
                $group: {
                  _id: '$location',
                  totalTasks: { $sum: 1 },
                  verifiedTasks: {
                    $sum: { $cond: [{ $eq: ['$verificationStatus', 'Verified'] }, 1, 0] },
                  },
                },
              },
            ],
            todayZones: [
              { $match: { createdAt: { $gte: startOfToday } } },
              {
                $group: {
                  _id: '$location',
                  tasksToday: { $sum: 1 },
                },
              },
            ],
            todayCount: [
              { $match: { createdAt: { $gte: startOfToday } } },
              { $count: 'count' },
            ],
            yesterdayCount: [
              { $match: { createdAt: { $gte: startOfYesterday, $lt: startOfToday } } },
              { $count: 'count' },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]),
      Worker.aggregate([
        { $match: { status: 'Active' } },
        {
          $group: {
            _id: { $toLower: '$city' },
            activeWorkers: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Unpack Task $facet metrics
    const facet = taskAggregationResult[0] || {};
    const statusMap = new Map();
    (facet.statusCounts || []).forEach((item) => {
      if (item._id) statusMap.set(item._id, item.count);
    });

    const totalTasks = facet.totalCount?.[0]?.count || 0;
    const verifiedTasks = statusMap.get('Verified') || 0;
    const underReviewTasks = statusMap.get('Review Required') || 0;
    const flaggedTasks = statusMap.get('Failed') || 0;
    const pendingTasks = statusMap.get('Pending') || 0;

    const tasksToday = facet.todayCount?.[0]?.count || 0;
    const tasksYesterday = facet.yesterdayCount?.[0]?.count || 0;

    // Temporal change calculation
    let totalTasksChange = '0 today';
    let comparisonLabel = 'Live database volume';
    if (tasksYesterday > 0) {
      const diffPct = Math.round(((tasksToday - tasksYesterday) / tasksYesterday) * 100);
      totalTasksChange = `${diffPct >= 0 ? '+' : ''}${diffPct}%`;
      comparisonLabel = 'vs yesterday';
    } else if (tasksToday > 0) {
      totalTasksChange = `+${tasksToday} today`;
      comparisonLabel = 'Dispatched today';
    }

    // Pending payment amount
    const pendingPaymentAmount = facet.pendingPayment?.[0]?.totalAmount || 0;
    const pendingPaymentCount = facet.pendingPayment?.[0]?.count || 0;

    // Outcome distribution percentages
    const nonPendingSum = verifiedTasks + underReviewTasks + flaggedTasks;
    const hasNonPending = nonPendingSum > 0;
    const verifiedPercent = hasNonPending ? Math.round((verifiedTasks / nonPendingSum) * 100) : 0;
    const underReviewPercent = hasNonPending ? Math.round((underReviewTasks / nonPendingSum) * 100) : 0;
    const flaggedPercent = hasNonPending ? Math.max(0, 100 - verifiedPercent - underReviewPercent) : 0;

    const outcomes = [
      { name: 'Verified', value: verifiedPercent, count: verifiedTasks, color: '#10b981' },
      { name: 'Needs review', value: underReviewPercent, count: underReviewTasks, color: '#f59e0b' },
      { name: 'Failed', value: flaggedPercent, count: flaggedTasks, color: '#ef4444' },
    ];

    // Formatted KPI cards derived dynamically from live database records
    const kpiMetrics = [
      {
        id: 'total_tasks',
        label: 'Total Tasks',
        value: totalTasks.toLocaleString(),
        numericValue: totalTasks,
        change: totalTasksChange,
        isPositive: tasksToday >= tasksYesterday,
        comparison: comparisonLabel,
        badgeVariant: 'neutral',
        secondaryNote: `${tasksToday} tasks dispatched today`,
      },
      {
        id: 'verified',
        label: 'Verified',
        value: verifiedTasks.toLocaleString(),
        numericValue: verifiedTasks,
        change: `${verifiedPercent}%`,
        isPositive: true,
        comparison: `${verifiedPercent}% auto-verified`,
        badgeVariant: 'verified',
        secondaryNote: 'Multi-modal AI criteria passed',
      },
      {
        id: 'under_review',
        label: 'Under Review',
        value: underReviewTasks.toLocaleString(),
        numericValue: underReviewTasks,
        change: `${underReviewPercent}%`,
        isPositive: true,
        comparison: 'Requires manual triage',
        badgeVariant: 'review',
        secondaryNote: 'Anomalies and missing assets',
      },
      {
        id: 'flagged',
        label: 'Flagged',
        value: flaggedTasks.toLocaleString(),
        numericValue: flaggedTasks,
        change: `${flaggedPercent}%`,
        isPositive: false,
        comparison: 'Perimeter & spoofing breach',
        badgeVariant: 'failed',
        secondaryNote: 'Automatic failure triggered',
      },
      {
        id: 'payment_pending',
        label: 'Payment Pending',
        value: `$${pendingPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        numericValue: pendingPaymentAmount,
        change: `${pendingPaymentCount} tasks`,
        isPositive: null,
        comparison: 'Escrow verification hold',
        badgeVariant: 'brand',
        secondaryNote: 'Pending client confirmation',
      },
    ];

    // Map active workers by lowercase city to eliminate N+1 queries
    const activeWorkersByCity = new Map();
    let totalActiveWorkers = 0;
    (workerAggregationResult || []).forEach((w) => {
      if (w._id) activeWorkersByCity.set(w._id.trim().toLowerCase(), w.activeWorkers);
      totalActiveWorkers += w.activeWorkers || 0;
    });

    const todayZonesMap = new Map();
    (facet.todayZones || []).forEach((z) => {
      if (z._id) todayZonesMap.set(z._id, z.tasksToday);
    });

    const operationalZones = (facet.zones || []).map((zone) => {
      const cityKey = (zone._id || '').trim().toLowerCase();
      const activeWorkers = activeWorkersByCity.get(cityKey) || 0;
      const tasksTodayForZone = todayZonesMap.get(zone._id) || 0;
      const rate =
        zone.totalTasks > 0 ? ((zone.verifiedTasks / zone.totalTasks) * 100).toFixed(1) : '100.0';
      return {
        name: zone._id,
        activeWorkers,
        tasksToday: tasksTodayForZone,
        totalTasks: zone.totalTasks,
        verificationRate: `${rate}%`,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalTasks,
        activeWorkers: totalActiveWorkers,
        activeInspectors: totalActiveWorkers,
        verifiedTasks,
        underReviewTasks,
        flaggedTasks,
        pendingTasks,
        pendingPaymentAmount,
        pendingPaymentCount,
        tasksToday,
        tasksYesterday,
        outcomes,
        kpiMetrics,
        operationalZones,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent activity records from MongoDB
// @route   GET /api/dashboard/activity
// @access  Public
export const getDashboardActivity = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 15, 100);
    const activities = await Activity.find()
      .sort({ timestamp: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedActivities = activities.map((act) => ({
      ...act,
      id: act._id.toString(),
      formattedTime: act.timestamp
        ? new Date(act.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : 'Just now',
    }));

    res.status(200).json({
      success: true,
      count: formattedActivities.length,
      data: formattedActivities,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks that require manual attention
// @route   GET /api/dashboard/exceptions
// @access  Public
export const getDashboardExceptions = async (req, res, next) => {
  try {
    const exceptionTasks = await Task.find({
      verificationStatus: { $in: ['Review Required', 'Failed'] },
      status: { $nin: ['Cancelled', 'Rejected', 'Completed'] },
    })
      .populate('assignedWorker', 'name city phone workerId rating')
      .sort({ updatedAt: -1 })
      .lean();

    const exceptions = exceptionTasks.map((t) => {
      let title = 'Review Required';
      let description = t.exceptionReason || 'Evidence requires manual review.';

      if (t.exceptionReason) {
        const parts = t.exceptionReason.split('—');
        if (parts.length > 1) {
          title = parts[0].trim();
          description = parts[1].trim();
        } else {
          title = t.exceptionReason.slice(0, 35);
        }
      } else if (t.verificationStatus === 'Failed') {
        title = 'Verification criteria failed';
      }

      const isFailed = t.verificationStatus === 'Failed';
      const severity = isFailed ? 'Critical' : t.confidenceScore < 60 ? 'High' : 'Warning';
      const severityVariant = isFailed ? 'red' : t.confidenceScore < 60 ? 'amber' : 'blue';

      const formattedTime = t.updatedAt
        ? new Date(t.updatedAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : t.submitted || 'Just now';

      const exceptionId = t.taskId ? `EX-${t.taskId.replace(/^RP-/, '')}` : `EX-${t._id.toString().slice(-4)}`;

      return {
        id: exceptionId,
        taskId: t.taskId,
        taskName: t.title,
        title,
        description: t.exceptionReason || description,
        severity,
        severityVariant,
        time: formattedTime,
        worker: t.assignedWorker?.name || 'Unassigned Inspector',
        location: t.location,
        confidenceScore: t.confidenceScore,
        suggestedAction: isFailed
          ? 'Mark unverified. Dispatch re-inspection or require mock-GPS validation check.'
          : 'Review visual evidence or request fresh live camera capture.',
      };
    });

    res.status(200).json({
      success: true,
      count: exceptions.length,
      data: exceptions,
    });
  } catch (error) {
    next(error);
  }
};
