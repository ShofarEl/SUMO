import SystemConfig from '../models/SystemConfig.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * @desc    Get all system configurations
 * @route   GET /api/config
 * @access  Private/Admin
 */
export const getConfigs = async (req, res, next) => {
  try {
    const { category } = req.query;
    
    const query = {};
    if (category) {
      query.category = category;
    }

    const configs = await SystemConfig.find(query)
      .populate('updatedBy', 'firstName lastName email')
      .sort({ category: 1, key: 1 });

    res.status(200).json({
      success: true,
      data: {
        configs
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get config by key
 * @route   GET /api/config/:key
 * @access  Private/Admin
 */
export const getConfigByKey = async (req, res, next) => {
  try {
    const config = await SystemConfig.findOne({ key: req.params.key })
      .populate('updatedBy', 'firstName lastName email');

    if (!config) {
      return next(new AppError('Configuration not found', 404, 'NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: {
        config
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create or update config
 * @route   PUT /api/config/:key
 * @access  Private/Admin
 */
export const upsertConfig = async (req, res, next) => {
  try {
    const { value, category, description, dataType, isEditable } = req.body;
    const { key } = req.params;

    const configData = {
      key,
      value,
      updatedBy: req.user._id
    };

    if (category) configData.category = category;
    if (description !== undefined) configData.description = description;
    if (dataType) configData.dataType = dataType;
    if (isEditable !== undefined) configData.isEditable = isEditable;

    const config = await SystemConfig.findOneAndUpdate(
      { key },
      configData,
      { new: true, upsert: true, runValidators: true }
    ).populate('updatedBy', 'firstName lastName email');

    logger.info(`System config updated: ${key} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: {
        config
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete config
 * @route   DELETE /api/config/:key
 * @access  Private/Admin
 */
export const deleteConfig = async (req, res, next) => {
  try {
    const config = await SystemConfig.findOne({ key: req.params.key });

    if (!config) {
      return next(new AppError('Configuration not found', 404, 'NOT_FOUND'));
    }

    if (!config.isEditable) {
      return next(new AppError('This configuration cannot be deleted', 400, 'VALIDATION_ERROR'));
    }

    await config.deleteOne();

    logger.info(`System config deleted: ${req.params.key} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Configuration deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initialize default configurations
 * @route   POST /api/config/initialize
 * @access  Private/Admin
 */
export const initializeDefaults = async (req, res, next) => {
  try {
    const defaults = [
      // Simulation defaults
      {
        key: 'simulation.default_duration',
        value: 3600,
        category: 'simulation',
        description: 'Default simulation duration in seconds',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'simulation.default_vehicle_mix',
        value: { cars: 55, motorcycles: 25, minibuses: 15, trucks: 5 },
        category: 'simulation',
        description: 'Default vehicle mix percentages',
        dataType: 'object',
        isEditable: true
      },
      {
        key: 'simulation.max_concurrent',
        value: 5,
        category: 'simulation',
        description: 'Maximum concurrent simulations',
        dataType: 'number',
        isEditable: true
      },
      // API keys
      {
        key: 'api.google_maps_key',
        value: '',
        category: 'api',
        description: 'Google Maps API key for validation',
        dataType: 'string',
        isEditable: true
      },
      {
        key: 'api.python_service_url',
        value: process.env.PYTHON_AI_SERVICE_URL || 'http://python-ai:8000',
        category: 'api',
        description: 'Python AI service URL',
        dataType: 'string',
        isEditable: true
      },
      // ML defaults
      {
        key: 'ml.lstm_epochs',
        value: 50,
        category: 'ml',
        description: 'Default LSTM training epochs',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'ml.rf_n_estimators',
        value: 100,
        category: 'ml',
        description: 'Default Random Forest estimators',
        dataType: 'number',
        isEditable: true
      },
      // RL defaults
      {
        key: 'rl.dqn_episodes',
        value: 1000,
        category: 'rl',
        description: 'Default DQN training episodes',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'rl.learning_rate',
        value: 0.001,
        category: 'rl',
        description: 'Default RL learning rate',
        dataType: 'number',
        isEditable: true
      },
      // System settings
      {
        key: 'system.max_upload_size',
        value: 52428800,
        category: 'system',
        description: 'Maximum file upload size in bytes (50MB)',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'system.log_retention_days',
        value: 30,
        category: 'system',
        description: 'Number of days to retain logs',
        dataType: 'number',
        isEditable: true
      }
    ];

    const results = [];
    for (const config of defaults) {
      const existing = await SystemConfig.findOne({ key: config.key });
      if (!existing) {
        const newConfig = await SystemConfig.create({
          ...config,
          updatedBy: req.user._id
        });
        results.push(newConfig);
      }
    }

    logger.info(`System configs initialized: ${results.length} new configs by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: {
        initialized: results.length,
        configs: results
      }
    });
  } catch (error) {
    next(error);
  }
};
