import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;

    const query = {};

    // Search by name or email
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by role
    if (role) {
      query.role = role;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users: users.map(user => user.toPublicJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
export const updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, organization, email } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(new AppError('Email already in use', 400, 'VALIDATION_ERROR'));
      }
      user.email = email;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (organization !== undefined) user.organization = organization;

    await user.save();

    logger.info(`User updated: ${user.email} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user role
 * @route   PATCH /api/users/:id/role
 * @access  Private/Admin
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['admin', 'researcher', 'viewer'].includes(role)) {
      return next(new AppError('Invalid role', 400, 'VALIDATION_ERROR'));
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user._id.toString()) {
      return next(new AppError('You cannot change your own role', 400, 'VALIDATION_ERROR'));
    }

    user.role = role;
    await user.save();

    logger.info(`User role updated: ${user.email} to ${role} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle user active status
 * @route   PATCH /api/users/:id/status
 * @access  Private/Admin
 */
export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return next(new AppError('You cannot deactivate your own account', 400, 'VALIDATION_ERROR'));
    }

    user.isActive = !user.isActive;
    await user.save();

    logger.info(`User status toggled: ${user.email} to ${user.isActive ? 'active' : 'inactive'} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return next(new AppError('You cannot delete your own account', 400, 'VALIDATION_ERROR'));
    }

    await user.deleteOne();

    logger.info(`User deleted: ${user.email} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
