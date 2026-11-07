import { Task } from '../models/Task.js';

// @desc    Get live intelligence, security metrics, and anomaly clusters
// @route   GET /api/intelligence/summary
// @access  Public
export const getIntelligenceSummary = async (req, res, next) => {
  try {
    const [taskStats, clusterAggregation] = await Promise.all([
      Task.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            flagged: [
              { $match: { verificationStatus: 'Failed' } },
              { $count: 'count' },
            ],
            review: [
              { $match: { verificationStatus: 'Review Required' } },
              { $count: 'count' },
            ],
            verified: [
              { $match: { verificationStatus: 'Verified' } },
              { $count: 'count' },
            ],
            duplicates: [
              {
                $match: {
                  $or: [
                    { 'aiChecks.perceptualHashMatch': true },
                    { 'aiChecks.duplicateRiskScore': 'HIGH_DUPLICATE_RISK' },
                    { exceptionReason: { $regex: /duplicate/i } },
                  ],
                },
              },
              { $count: 'count' },
            ],
            perimeterBreaches: [
              {
                $match: {
                  $or: [
                    { 'aiChecks.geoFenceMatch': false },
                    { exceptionReason: { $regex: /perimeter|geofence|gps/i } },
                  ],
                },
              },
              { $count: 'count' },
            ],
          },
        },
      ]),
      Task.aggregate([
        {
          $group: {
            _id: '$location',
            totalTasks: { $sum: 1 },
            flaggedTasks: {
              $sum: { $cond: [{ $eq: ['$verificationStatus', 'Failed'] }, 1, 0] },
            },
            reviewTasks: {
              $sum: { $cond: [{ $eq: ['$verificationStatus', 'Review Required'] }, 1, 0] },
            },
            duplicateCount: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$aiChecks.perceptualHashMatch', true] },
                      { $eq: ['$aiChecks.duplicateRiskScore', 'HIGH_DUPLICATE_RISK'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { flaggedTasks: -1, totalTasks: -1 } },
      ]),
    ]);

    const facet = taskStats[0] || {};
    const totalTasks = facet.total?.[0]?.count || 0;
    const flaggedTasks = facet.flagged?.[0]?.count || 0;
    const reviewTasks = facet.review?.[0]?.count || 0;
    const verifiedTasks = facet.verified?.[0]?.count || 0;
    const duplicateHashCount = facet.duplicates?.[0]?.count || 0;
    const perimeterBreachCount = facet.perimeterBreaches?.[0]?.count || 0;

    const anomaliesCount = flaggedTasks + reviewTasks;
    const anomalyRate =
      totalTasks > 0 ? Number(((anomaliesCount / totalTasks) * 100).toFixed(1)) : 0;

    // Genuine mathematical risk score calculation (0-100)
    let riskScore = 0;
    if (totalTasks > 0) {
      const rawScore = (flaggedTasks * 30 + reviewTasks * 15 + duplicateHashCount * 25 + perimeterBreachCount * 20) / totalTasks;
      riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));
    }

    const clusters = clusterAggregation.map((c) => {
      const zoneAnomalies = c.flaggedTasks + c.reviewTasks;
      const zoneRiskLevel =
        c.flaggedTasks > 1 ? 'High' : zoneAnomalies > 0 ? 'Medium' : 'Low';

      return {
        zone: c._id || 'Unspecified Zone',
        location: c._id || 'Unspecified Zone',
        totalTasks: c.totalTasks,
        flaggedTasks: c.flaggedTasks,
        reviewTasks: c.reviewTasks,
        duplicateCount: c.duplicateCount,
        anomalyCount: zoneAnomalies,
        riskLevel: zoneRiskLevel,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalTasks,
        flaggedTasks,
        reviewTasks,
        verifiedTasks,
        anomalyRate,
        duplicateHashCount,
        perimeterBreachCount,
        riskScore,
        clusters,
      },
    });
  } catch (error) {
    next(error);
  }
};
