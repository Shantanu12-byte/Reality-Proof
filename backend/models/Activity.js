import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    activityType: {
      type: String,
      required: [true, 'activityType is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    actor: {
      type: String,
      default: 'System',
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    level: {
      type: String,
      enum: ['info', 'success', 'warning', 'danger'],
      default: 'info',
    },
    source: {
      type: String,
      default: 'VisionInferenceEngine',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        // Provide formatted timestamp for UI
        if (ret.timestamp instanceof Date) {
          ret.formattedTime = ret.timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        }
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

activitySchema.index({ timestamp: -1, createdAt: -1 });
activitySchema.index({ taskId: 1, timestamp: -1 });

export const Activity = mongoose.model('Activity', activitySchema);

