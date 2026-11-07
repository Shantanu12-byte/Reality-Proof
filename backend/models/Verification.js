import mongoose from 'mongoose';

const requirementResultSchema = new mongoose.Schema(
  {
    requirement: { type: String, required: true },
    result: {
      type: String,
      enum: ['pass', 'fail', 'uncertain'],
      required: true,
      default: 'uncertain',
    },
    observation: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
  },
  { _id: false }
);

const detectedObjectSchema = new mongoose.Schema(
  {
    object: { type: String, required: true },
    count: { type: Number, default: 1, min: 0 },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
  },
  { _id: false }
);

const imageQualitySchema = new mongoose.Schema(
  {
    isBlurry: { type: Boolean, default: false },
    isTooDark: { type: Boolean, default: false },
    isObstructed: { type: Boolean, default: false },
    qualityAssessment: {
      type: String,
      enum: ['good', 'acceptable', 'poor', 'uncertain'],
      default: 'good',
    },
  },
  { _id: false }
);

const duplicateMatchSchema = new mongoose.Schema(
  {
    matchedTaskId: { type: String },
    matchedVerificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Verification' },
    matchType: { type: String, enum: ['exact', 'perceptual'] },
    similarity: { type: Number, min: 0, max: 100 },
    hammingDistance: { type: Number, min: 0, max: 64 },
    matchedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const duplicateMatchesSchema = new mongoose.Schema(
  {
    exactMatchFound: { type: Boolean, default: false },
    perceptualMatchFound: { type: Boolean, default: false },
    sha256: { type: String, default: '' },
    pHash: { type: String, default: '' },
    matches: [duplicateMatchSchema],
  },
  { _id: false }
);

const metadataFindingsSchema = new mongoose.Schema(
  {
    fileType: { type: String, default: '' },
    dimensions: {
      width: { type: Number, default: null },
      height: { type: Number, default: null },
    },
    fileSize: { type: Number, default: 0 },
    exifTimestamp: { type: Date, default: null },
    gpsCoordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    distanceMeters: { type: Number, default: null },
    geoFenceStatus: {
      type: String,
      enum: ['match', 'breach', 'no_gps'],
      default: 'no_gps',
    },
    hasGps: { type: Boolean, default: false },
    hasExif: { type: Boolean, default: false },
  },
  { _id: false }
);

const riskReasonSchema = new mongoose.Schema(
  {
    factor: { type: String, required: true },
    scoreImpact: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

const humanReviewSchema = new mongoose.Schema(
  {
    reviewed: { type: Boolean, default: false },
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'evidence_requested', 'pending'],
      default: 'pending',
    },
    reviewer: { type: String, default: '' },
    notes: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: [true, 'taskId is required'],
      index: true,
      trim: true,
    },
    evidenceIds: [
      {
        type: String,
        trim: true,
      },
    ],
    evidenceThumbnails: [
      {
        type: String,
      },
    ],
    modelProvider: {
      type: String,
      default: 'groq',
      enum: ['groq', 'google-gemini', 'mock-engine', 'custom'],
    },
    modelName: {
      type: String,
      default: 'qwen/qwen3.8-27b',
    },
    isMock: {
      type: Boolean,
      default: false,
    },
    analysisStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'completed',
      index: true,
    },
    overallAssessment: {
      type: String,
      enum: ['pass', 'fail', 'uncertain'],
      required: true,
      default: 'uncertain',
      index: true,
    },
    summary: {
      type: String,
      default: '',
    },
    explanation: {
      type: String,
      default: '',
    },
    requirementResults: [requirementResultSchema],
    detectedObjects: [detectedObjectSchema],
    imageQuality: {
      type: imageQualitySchema,
      default: () => ({}),
    },
    missingEvidence: [
      {
        type: String,
      },
    ],
    warnings: [
      {
        type: String,
      },
    ],
    duplicateMatches: {
      type: duplicateMatchesSchema,
      default: () => ({}),
    },
    metadataFindings: {
      type: metadataFindingsSchema,
      default: () => ({}),
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },
    riskCategory: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      default: 'low',
      index: true,
    },
    recommendation: {
      type: String,
      enum: ['approve', 'reject', 'manual_review'],
      required: true,
      default: 'manual_review',
      index: true,
    },
    riskReasons: [riskReasonSchema],
    humanReview: {
      type: humanReviewSchema,
      default: () => ({}),
    },
    humanDecision: {
      type: String,
      enum: ['approved', 'rejected', 'evidence_requested', 'pending', ''],
      default: '',
      index: true,
    },
    reviewerId: {
      type: String,
      default: '',
      trim: true,
    },
    rawAiResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for history and queries
verificationSchema.index({ taskId: 1, createdAt: -1 });
verificationSchema.index({ analysisStatus: 1, riskCategory: 1 });
verificationSchema.index({ recommendation: 1, createdAt: -1 });

export const Verification = mongoose.model('Verification', verificationSchema);
