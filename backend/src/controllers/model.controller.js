import MLModel from '../models/MLModel.js';
import pythonAIService from '../services/pythonAI.service.js';
import logger from '../utils/logger.js';

/**
 * List all ML models with optional filtering
 */
export const listModels = async (req, res, next) => {
  try {
    const { type, isDeployed, trainedBy, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};
    if (type) query.type = type;
    if (isDeployed !== undefined) query.isDeployed = isDeployed === 'true';
    if (trainedBy) query.trainedBy = trainedBy;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch models
    const models = await MLModel.find(query)
      .populate('trainedBy', 'firstName lastName email')
      .populate('trainingConfig.datasetId', 'name source')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MLModel.countDocuments(query);

    // Also fetch from Python service for additional metadata
    const pythonModels = await pythonAIService.listModels(type, isDeployed);

    logger.info(`Listed ${models.length} models`);

    res.json({
      success: true,
      data: {
        models,
        pythonServiceModels: pythonModels.data?.models || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error(`Error listing models: ${error.message}`);
    next(error);
  }
};

/**
 * Get model details by ID
 */
export const getModelById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const model = await MLModel.findById(id)
      .populate('trainedBy', 'firstName lastName email organization')
      .populate('trainingConfig.datasetId', 'name source metadata');

    if (!model) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'Model not found'
        }
      });
    }

    // Get additional info from Python service if available
    let pythonModelInfo = null;
    try {
      const pythonResponse = await pythonAIService.getModelInfo(model.modelPath);
      pythonModelInfo = pythonResponse.data;
    } catch (error) {
      logger.warn(`Could not fetch Python model info: ${error.message}`);
    }

    logger.info(`Retrieved model: ${id}`);

    res.json({
      success: true,
      data: {
        model,
        pythonModelInfo
      }
    });
  } catch (error) {
    logger.error(`Error getting model: ${error.message}`);
    next(error);
  }
};

/**
 * Get model versions
 */
export const getModelVersions = async (req, res, next) => {
  try {
    const { name, type } = req.params;

    // Find all versions of this model
    const versions = await MLModel.find({ name, type })
      .populate('trainedBy', 'firstName lastName email')
      .sort({ version: -1, createdAt: -1 });

    // Also get from Python service
    let pythonVersions = [];
    try {
      const pythonResponse = await pythonAIService.getModelVersions(name, type);
      pythonVersions = pythonResponse.data?.versions || [];
    } catch (error) {
      logger.warn(`Could not fetch Python model versions: ${error.message}`);
    }

    logger.info(`Retrieved ${versions.length} versions for ${name} (${type})`);

    res.json({
      success: true,
      data: {
        modelName: name,
        modelType: type,
        versions,
        pythonVersions,
        totalVersions: versions.length
      }
    });
  } catch (error) {
    logger.error(`Error getting model versions: ${error.message}`);
    next(error);
  }
};

/**
 * Deploy a model
 */
export const deployModel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const model = await MLModel.findById(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'Model not found'
        }
      });
    }

    // Check if user has permission (admin or model owner)
    if (req.user.role !== 'admin' && model.trainedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to deploy this model'
        }
      });
    }

    // Undeploy other versions of the same model
    await MLModel.updateMany(
      { name: model.name, type: model.type, _id: { $ne: id } },
      { isDeployed: false }
    );

    // Deploy this model
    model.isDeployed = true;
    await model.save();

    // Notify Python service
    try {
      await pythonAIService.deployModel(model.modelPath, userId.toString());
    } catch (error) {
      logger.warn(`Could not notify Python service of deployment: ${error.message}`);
    }

    logger.info(`Model ${id} deployed by user ${userId}`);

    res.json({
      success: true,
      data: {
        model,
        message: 'Model deployed successfully'
      }
    });
  } catch (error) {
    logger.error(`Error deploying model: ${error.message}`);
    next(error);
  }
};

/**
 * Undeploy a model
 */
export const undeployModel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const model = await MLModel.findById(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'Model not found'
        }
      });
    }

    // Check if user has permission (admin or model owner)
    if (req.user.role !== 'admin' && model.trainedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to undeploy this model'
        }
      });
    }

    // Undeploy model
    model.isDeployed = false;
    await model.save();

    // Notify Python service
    try {
      await pythonAIService.undeployModel(model.modelPath, userId.toString());
    } catch (error) {
      logger.warn(`Could not notify Python service of undeployment: ${error.message}`);
    }

    logger.info(`Model ${id} undeployed by user ${userId}`);

    res.json({
      success: true,
      data: {
        model,
        message: 'Model undeployed successfully'
      }
    });
  } catch (error) {
    logger.error(`Error undeploying model: ${error.message}`);
    next(error);
  }
};

/**
 * Delete a model
 */
export const deleteModel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const model = await MLModel.findById(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'Model not found'
        }
      });
    }

    // Check if user has permission (admin or model owner)
    if (req.user.role !== 'admin' && model.trainedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to delete this model'
        }
      });
    }

    // Cannot delete deployed models
    if (model.isDeployed) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MODEL_DEPLOYED',
          message: 'Cannot delete a deployed model. Please undeploy it first.'
        }
      });
    }

    // Delete from Python service
    try {
      await pythonAIService.deleteModel(model.modelPath);
    } catch (error) {
      logger.warn(`Could not delete model from Python service: ${error.message}`);
    }

    // Delete from database
    await model.deleteOne();

    logger.info(`Model ${id} deleted by user ${userId}`);

    res.json({
      success: true,
      data: {
        message: 'Model deleted successfully'
      }
    });
  } catch (error) {
    logger.error(`Error deleting model: ${error.message}`);
    next(error);
  }
};

/**
 * Compare model versions
 */
export const compareModelVersions = async (req, res, next) => {
  try {
    const { name, type } = req.params;
    const { metric = 'rmse' } = req.query;

    // Get all versions from database
    const versions = await MLModel.find({ name, type })
      .populate('trainedBy', 'firstName lastName')
      .sort({ version: -1 });

    if (versions.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_VERSIONS_FOUND',
          message: 'No versions found for this model'
        }
      });
    }

    // Get comparison from Python service
    let pythonComparison = null;
    try {
      const pythonResponse = await pythonAIService.compareModelVersions(name, type, metric);
      pythonComparison = pythonResponse.data;
    } catch (error) {
      logger.warn(`Could not get Python comparison: ${error.message}`);
    }

    // Build comparison data
    const comparison = versions.map(v => ({
      modelId: v._id,
      version: v.version,
      createdAt: v.createdAt,
      trainedBy: v.trainedBy,
      isDeployed: v.isDeployed,
      performance: v.performance,
      [metric]: v.performance[metric]
    }));

    // Sort by metric (lower is better for rmse/mae, higher for r2)
    if (['rmse', 'mae'].includes(metric)) {
      comparison.sort((a, b) => (a[metric] || Infinity) - (b[metric] || Infinity));
    } else {
      comparison.sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
    }

    logger.info(`Compared ${versions.length} versions of ${name} (${type})`);

    res.json({
      success: true,
      data: {
        modelName: name,
        modelType: type,
        metric,
        comparison,
        pythonComparison,
        bestVersion: comparison[0]
      }
    });
  } catch (error) {
    logger.error(`Error comparing model versions: ${error.message}`);
    next(error);
  }
};

/**
 * Get model storage statistics
 */
export const getStorageStats = async (req, res, next) => {
  try {
    // Get stats from database
    const totalModels = await MLModel.countDocuments();
    const deployedModels = await MLModel.countDocuments({ isDeployed: true });
    
    const modelsByType = await MLModel.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Get stats from Python service
    let pythonStats = null;
    try {
      const pythonResponse = await pythonAIService.getStorageStats();
      pythonStats = pythonResponse.data;
    } catch (error) {
      logger.warn(`Could not get Python storage stats: ${error.message}`);
    }

    logger.info('Retrieved storage statistics');

    res.json({
      success: true,
      data: {
        database: {
          totalModels,
          deployedModels,
          modelsByType: modelsByType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        pythonService: pythonStats
      }
    });
  } catch (error) {
    logger.error(`Error getting storage stats: ${error.message}`);
    next(error);
  }
};

export default {
  listModels,
  getModelById,
  getModelVersions,
  deployModel,
  undeployModel,
  deleteModel,
  compareModelVersions,
  getStorageStats
};
