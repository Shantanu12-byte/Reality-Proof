import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Admin email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    username: {
      type: String,
      required: [true, 'Admin username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      default: 'Operations Administrator',
      trim: true,
    },
    role: {
      type: String,
      default: 'admin',
      enum: ['admin'],
      immutable: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Never return in normal queries
    },
    avatar: {
      type: String,
      default: 'AD',
    },
    title: {
      type: String,
      default: 'Lead Operations Director',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

// Hash password before saving if modified
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password helper method
adminSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export const Admin = mongoose.model('Admin', adminSchema);
