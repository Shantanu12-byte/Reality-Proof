import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const workerSchema = new mongoose.Schema(
  {
    workerId: {
      type: String,
      required: [true, 'workerId is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City/Location is required'],
      trim: true,
      index: true,
    },
    zone: {
      type: String,
      default: '',
      trim: true,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    accuracy: {
      type: Number,
      default: 95.0,
      min: 0,
      max: 100,
    },
    completedJobs: {
      type: Number,
      default: 0,
      min: 0,
    },
    tasksToday: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      default: 0.0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Active', 'Idle', 'Under Review', 'Suspended (Review)'],
      default: 'Active',
      index: true,
    },
    reliabilityScore: {
      type: Number,
      default: 95,
      min: 0,
      max: 100,
    },
    avatar: {
      type: String,
      default: '',
    },
    paypalStatus: {
      type: String,
      default: 'Linked & Verified',
    },
    recentTask: {
      type: String,
      default: '',
    },
    password: {
      type: String,
      select: false, // Never expose password in standard queries
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        // Expose frontend-compatible aliases
        ret.id = ret.workerId;
        ret.location = ret.city;
        ret.verifiedRate = ret.accuracy !== undefined ? `${ret.accuracy}%` : '95.0%';
        ret.tasksCompleted = ret.completedJobs;
        if (typeof ret.balance === 'number') {
          ret.formattedBalance = `$${ret.balance.toFixed(2)}`;
        }
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Hash worker password if modified
workerSchema.pre('save', async function (next) {
  if (!this.avatar && this.name) {
    this.avatar = this.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password helper
workerSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Compound indexes for fast location & status filtering and ranking
workerSchema.index({ city: 1, status: 1 });
workerSchema.index({ rating: -1, completedJobs: -1 });
workerSchema.index({ workerId: 1, createdAt: -1 });

export const Worker = mongoose.model('Worker', workerSchema);
