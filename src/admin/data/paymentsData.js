/**
 * Eradicated static payments and escrow dataset.
 * Payments and transactions are dynamically retrieved from /api/payments.
 */
export const paymentSummary = {
  escrowBalance: '$0.00',
  capturedThisCycle: '$0.00',
  averagePayoutTime: 'Instant',
  batchCutoffTime: 'Real-time',
  pendingCount: 0,
  completedCount: 0,
};

export const paymentTransactions = [];
