import pythonAIService from '../services/pythonAI.service.js';
import MLModel from '../models/MLModel.js';
import logger from '../utils/logger.js';

/**
 * Prediction controller - handles ML prediction endpoints
 */

/**
 * Train LSTM model
 * POST /api/predictions/lstm/train
 */
export const trainLSTM = async (req, res, next) => {
  try {
    const trainingConfig = req.body;
    
    logger.info(`Training LSTM model: ${trainingConfig.model_name}`);
    
    // Call Python AI service
    const result = await pythonAIService.trainLSTM(trainingConfig);
    
    // Store model metadata in database
    const mlModel = new MLModel({
      name: trainingConfig.model_name,
      type: 'lstm',
      version: '1.0',
      trainedBy: req.user._id,
      trainingConfig: {
        hyperparameters: {
          epochs: trainingConfig.epochs,
          batch_size: trainingConfig.batch_size,
          lstm_units: trainingConfig.lstm_units,
          dropout_rate: trainingConfig.dropout_rate
        },
        epochs: trainingConfig.epochs,
        batchSize: trainingConfig.batch_size,
        learningRate: 0.001,
        architecture: {
          sequence_length: trainingConfig.sequence_length,
          prediction_horizon: trainingConfig.prediction_horizon,
          lstm_units: trainingConfig.lstm_units
        }
      },
      performance: {
        rmse: result.validation_rmse,
        mae: result.validation_mae,
        trainingLoss: result.additional_metrics?.history?.loss || [],
        validationLoss: result.additional_metrics?.history?.val_loss || [],
        convergenceEpoch: result.additional_metrics?.epochs_trained || trainingConfig.epochs
      },
      modelPath: result.model_path,
      isDeployed: false
    });
    
    await mlModel.save();
    
    logger.info(`LSTM model trained and saved: ${mlModel._id}`);
    
    res.status(201).json({
      success: true,
      data: {
        modelId: mlModel._id,
        pythonModelId: result.model_id,
        ...result
      }
    });
  } catch (error) {
    logger.error(`LSTM training error: ${error.message}`);
    next(error);
  }
};

/**
 * Get LSTM prediction
 * POST /api/predictions/lstm
 */
export const predictLSTM = async (req, res, next) => {
  try {
    const { model_name, input_sequence } = req.body;
    
    logger.info(`Getting LSTM prediction from model: ${model_name}`);
    
    // Call Python AI service
    const result = await pythonAIService.predictLSTM({
      model_name,
      input_sequence
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`LSTM prediction error: ${error.message}`);
    next(error);
  }
};

/**
 * Train Random Forest model
 * POST /api/predictions/rf/train
 */
export const trainRandomForest = async (req, res, next) => {
  try {
    const trainingConfig = req.body;
    
    logger.info(`Training Random Forest model: ${trainingConfig.model_name}`);
    
    // Call Python AI service
    const result = await pythonAIService.trainRandomForest(trainingConfig);
    
    // Store model metadata in database
    const mlModel = new MLModel({
      name: trainingConfig.model_name,
      type: 'random_forest',
      version: '1.0',
      trainedBy: req.user._id,
      trainingConfig: {
        hyperparameters: {
          n_estimators: trainingConfig.n_estimators,
          max_depth: trainingConfig.max_depth,
          optimize_hyperparams: trainingConfig.optimize_hyperparams
        },
        architecture: {
          n_estimators: result.additional_metrics?.n_estimators || trainingConfig.n_estimators,
          max_depth: result.additional_metrics?.max_depth || trainingConfig.max_depth,
          num_features: result.additional_metrics?.num_features
        }
      },
      performance: {
        rmse: result.validation_rmse,
        mae: result.validation_mae,
        r2Score: result.additional_metrics?.r2_score
      },
      modelPath: result.model_path,
      isDeployed: false
    });
    
    await mlModel.save();
    
    logger.info(`Random Forest model trained and saved: ${mlModel._id}`);
    
    res.status(201).json({
      success: true,
      data: {
        modelId: mlModel._id,
        pythonModelId: result.model_id,
        ...result,
        topFeatures: result.additional_metrics?.top_features
      }
    });
  } catch (error) {
    logger.error(`Random Forest training error: ${error.message}`);
    next(error);
  }
};

/**
 * Get Random Forest prediction
 * POST /api/predictions/rf
 */
export const predictRandomForest = async (req, res, next) => {
  try {
    const { model_name, input_sequence } = req.body;
    
    logger.info(`Getting Random Forest prediction from model: ${model_name}`);
    
    // Call Python AI service
    const result = await pythonAIService.predictRandomForest({
      model_name,
      input_sequence
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Random Forest prediction error: ${error.message}`);
    next(error);
  }
};

/**
 * Compare multiple models
 * POST /api/predictions/compare
 */
export const compareModels = async (req, res, next) => {
  try {
    const { model_names, test_data, actual_values } = req.body;
    
    logger.info(`Comparing ${model_names.length} models`);
    
    // Call Python AI service
    const response = await pythonAIService.client.post('/api/ml/compare', {
      model_names,
      test_data,
      actual_values
    });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    logger.error(`Model comparison error: ${error.message}`);
    next(error);
  }
};

/**
 * Get prediction history
 * GET /api/predictions/history
 */
export const getPredictionHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    const query = {};
    if (type) {
      query.type = type;
    }
    
    // If not admin, only show user's own models
    if (req.user.role !== 'admin') {
      query.trainedBy = req.user._id;
    }
    
    const models = await MLModel.find(query)
      .populate('trainedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const count = await MLModel.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        models,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    logger.error(`Get prediction history error: ${error.message}`);
    next(error);
  }
};

/**
 * Get model details
 * GET /api/predictions/models/:id
 */
export const getModelDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const model = await MLModel.findById(id)
      .populate('trainedBy', 'firstName lastName email')
      .lean();
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'Model not found'
        }
      });
    }
    
    // Check access permissions
    if (req.user.role !== 'admin' && model.trainedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to access this model'
        }
      });
    }
    
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    logger.error(`Get model details error: ${error.message}`);
    next(error);
  }
};

/**
 * Delete model
 * DELETE /api/predictions/models/:id
 */
export const deleteModel = async (req, res, next) => {
  try {
    const { id } = req.params;
    
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
    
    // Check permissions
    if (req.user.role !== 'admin' && model.trainedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to delete this model'
        }
      });
    }
    
    await model.deleteOne();
    
    logger.info(`Model deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Model deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete model error: ${error.message}`);
    next(error);
  }
};
