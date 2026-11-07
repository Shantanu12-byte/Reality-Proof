import mongoose from 'mongoose';

const evidenceRequirementSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    status: {
      type: String,
      enum: ['verified', 'flagged', 'failed', 'missing', 'pending'],
      default: 'pending',
    },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const aiChecksSchema = new mongoose.Schema(
  {
    perceptualHashMatch: { type: Boolean, default: false },
    exifVerified: { type: Boolean, default: true },
    geoFenceMatch: { type: Boolean, default: true },
    lightingAdequacy: { type: Boolean, default: true },
    shelfFillRate: { type: String, default: 'N/A' },
    duplicateRiskScore: { type: String, default: '' },
    tamperScore: { type: String, default: '' },
    missingAssetsCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: [true, 'taskId is required'],
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: 'Visual Verification',
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      index: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      index: true,
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      default: 35.0,
      min: 0,
    },
    deadline: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Under Review', 'Cancelled', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['Verified', 'Review Required', 'Failed', 'Pending', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    confidenceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    evidenceRequirements: [evidenceRequirementSchema],
    aiChecks: {
      type: aiChecksSchema,
      default: () => ({}),
    },
    evidenceThumbnails: [
      {
        type: String,
      },
    ],
    exceptionReason: {
      type: String,
      default: '',
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Authorized', 'Completed', 'Hold', 'Not Eligible', 'Refunded'],
      default: 'Pending',
      index: true,
    },
    paymentId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    paymentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    submitted: {
      type: String,
      default: 'Just now',
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Expose frontend-compatible field aliases
        ret.id = ret.taskId;
        ret.name = ret.title;
        ret.aiResult = ret.verificationStatus;
        ret.requiredEvidence = ret.evidenceRequirements;
        ret.budget = typeof ret.budget === 'number' ? `$${ret.budget.toFixed(2)}` : ret.budget;

        // Populate worker object if populated, otherwise provide a fallback object
        if (ret.assignedWorker && typeof ret.assignedWorker === 'object' && ret.assignedWorker.name) {
          ret.worker = {
            id: ret.assignedWorker.workerId || ret.assignedWorker.id,
            name: ret.assignedWorker.name,
            avatar: ret.assignedWorker.avatar || ret.assignedWorker.name.slice(0, 2).toUpperCase(),
            rating: ret.assignedWorker.rating || 5.0,
            phone: ret.assignedWorker.phone || '',
            tasksCompleted: ret.assignedWorker.completedJobs || 0,
          };
        } else if (!ret.worker) {
          ret.worker = {
            name: 'Unassigned Inspector',
            avatar: 'UI',
            rating: 5.0,
            phone: '',
            tasksCompleted: 0,
          };
        }
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// High-performance compound & query indexes
taskSchema.index({ verificationStatus: 1, location: 1 });
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ paymentStatus: 1, budget: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ taskId: 1, createdAt: -1 });

export const Task = mongoose.model('Task', taskSchema);

