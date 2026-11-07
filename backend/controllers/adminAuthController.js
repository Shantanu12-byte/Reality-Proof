import { Admin } from '../models/Admin.js';
import { generateAdminToken } from '../middleware/authMiddleware.js';

/**
 * @desc    Admin Login
 * @route   POST /api/admin/login
 * @access  Public
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin identifier (username or email) and password are required.',
      });
    }

    const admin = await Admin.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
    }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials.',
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials.',
      });
    }

    const token = generateAdminToken(admin);

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        avatar: admin.avatar,
        title: admin.title,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Current Authenticated Admin
 * @route   GET /api/admin/me
 * @access  Admin Protected
 */
export const getAdminMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found.',
      });
    }

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        email: admin.email,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        avatar: admin.avatar,
        title: admin.title,
      },
    });
  } catch (error) {
    next(error);
  }
};
