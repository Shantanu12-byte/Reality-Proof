import mongoose from 'mongoose';

const webhookLogSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
    summary: { type: String, default: '' },
    resourceId: { type: String, default: '' },
    status: { type: String, default: 'PROCESSED' },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: [true, 'Payment ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    taskId: {
      type: String,
      required: [true, 'Task ID is required'],
      index: true,
      trim: true,
    },
    taskRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      index: true,
    },
    businessId: {
      type: String,
      default: 'BUS-REALITYPROOF-MAIN',
      trim: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      index: true,
    },
    workerIdStr: {
      type: String,
      default: '',
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
    paypalOrderId: {
      type: String,
      index: true,
      sparse: true,
      trim: true,
    },
    paypalAuthorizationId: {
      type: String,
      index: true,
      sparse: true,
      trim: true,
    },
    paypalCaptureId: {
      type: String,
      index: true,
      sparse: true,
      trim: true,
    },
    paypalPayoutBatchId: {
      type: String,
      index: true,
      sparse: true,
      trim: true,
    },
    paypalPayoutItemId: {
      type: String,
      index: true,
      sparse: true,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        'CREATED',
        'PENDING_APPROVAL',
        'AUTHORIZED',
        'CAPTURE_PENDING',
        'CAPTURED',
        'PAYOUT_PENDING',
        'PAID_OUT',
        'FAILED',
        'CANCELLED',
        'REFUNDED',
      ],
      default: 'CREATED',
      index: true,
    },
    authorizationStatus: {
      type: String,
      enum: ['PENDING', 'CREATED', 'VOIDED', 'EXPIRED', 'CAPTURED', 'DENIED'],
      default: 'PENDING',
      index: true,
    },
    captureStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'NONE',
      index: true,
    },
    payoutStatus: {
      type: String,
      enum: [
        'NOT_APPLICABLE',
        'PENDING',
        'PROCESSING',
        'SUCCESS',
        'FAILED',
        'MANUAL_SETTLED',
      ],
      default: 'NOT_APPLICABLE',
      index: true,
    },
    authorizationExpiresAt: {
      type: Date,
      index: true,
    },
    authorizedAt: {
      type: Date,
    },
    capturedAt: {
      type: Date,
    },
    paidOutAt: {
      type: Date,
    },
    failureReason: {
      type: String,
      default: '',
      trim: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    paypalApprovalUrl: {
      type: String,
      default: '',
      trim: true,
    },
    webhookEvents: [webhookLogSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret.paymentId;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual: formatted currency amount
paymentSchema.virtual('formattedAmount').get(function () {
  return `$${(this.amount || 0).toFixed(2)}`;
});

// Virtual: days remaining until authorization expires (standard 29-day max window)
paymentSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.authorizationExpiresAt) return null;
  const now = new Date();
  const diffMs = new Date(this.authorizationExpiresAt).getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
});

// Virtual: is authorization expired
paymentSchema.virtual('isExpired').get(function () {
  if (!this.authorizationExpiresAt) return false;
  return new Date() > new Date(this.authorizationExpiresAt);
});

// Virtual: can payment authorization be captured
paymentSchema.virtual('canCapture').get(function () {
  return (
    this.authorizationStatus === 'CREATED' &&
    this.captureStatus !== 'COMPLETED' &&
    (this.paymentStatus === 'AUTHORIZED' || this.paymentStatus === 'CAPTURE_PENDING') &&
    !this.isExpired
  );
});

// Virtual: can payment capture be refunded
paymentSchema.virtual('canRefund').get(function () {
  return (
    this.captureStatus === 'COMPLETED' &&
    this.paymentStatus === 'CAPTURED' &&
    Boolean(this.paypalCaptureId)
  );
});

// Helper to auto-generate sequential payment IDs (e.g. PAY-1001)
paymentSchema.statics.getNextPaymentId = async function () {
  const allPayments = await this.find({ paymentId: /^PAY-\d+$/i }, 'paymentId').lean();
  let maxNum = 1000;
  for (const p of allPayments) {
    if (p.paymentId) {
      const match = p.paymentId.match(/^PAY-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  }
  return `PAY-${maxNum + 1}`;
};

export const Payment = mongoose.model('Payment', paymentSchema);

