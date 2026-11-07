import mongoose from 'mongoose';

const evidenceFingerprintSchema = new mongoose.Schema(
  {
    sha256: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    pHash: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    taskId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    verificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Verification',
      index: true,
    },
    evidenceId: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

evidenceFingerprintSchema.index({ sha256: 1, taskId: 1 });
evidenceFingerprintSchema.index({ createdAt: -1 });

export const EvidenceFingerprint = mongoose.model('EvidenceFingerprint', evidenceFingerprintSchema);
