import PredictionEvaluation from '../models/PredictionEvaluation.js';
import MLModel from '../models/MLModel.js';
import Simulation from '../models/Simulation.js';
import pythonAIService from '../services/pythonAI.service.js';
import logger from '../utils/logger.js';

/**
 * Evaluate a prediction model against test data
 */
export const evaluateModel = async (req, res, next) => {
  try {
    const { modelName } = req.params;
    const { testData, actualValues, simulationId } = req.body;

    logger.info(`Evaluating model: ${modelName}`);

    // Find the model in database
    const model = await MLModel.findOne({ name: modelName }).sort({ createdAt: -1 });
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: `Model '${modelName}' not found`
        }
      });
    }

    // Call Python AI service to evaluate
    const evaluationResult = await pythonAIService.evaluateModel(
      modelName,
      testData,
      actualValues
    );

    // Store evaluation results in database
    const evaluation = new PredictionEvaluation({
      modelId: model._id,
      modelName: modelName,
      modelType: model.type,
      evaluatedBy: req.user._id,
      simulationId: simulationId || null,
      metrics: evaluationResult.metrics,
      baselineComparison: evaluationResult.baseline_comparison,
      targetAchievement: evaluationResult.target_achievement,
      summary: evaluationResult.summary,
      numSamples: evaluationResult.num_samples,
      evaluationData: {
        testDataSource: simulationId ? 'simulation' : 'manual',
        actualValues: actualValues.slice(0, 100), // Store first 100 for reference
        predictedValues: [] // Would be populated from evaluation
      },
      additionalInfo: evaluationResult.additional_info,
      reportPath: evaluationResult.stored_path
    });

    await evaluation.save();

    // Update model performance metrics if this is better
    if (evaluationResult.target_achievement.meets_all_targets) {
      model.performance.rmse = evaluationResult.metrics.rmse;
      model.performance.mae = evaluationResult.metrics.mae;
      model.performance.r2Score = evaluationResult.metrics.r2_score;
      await model.save();
    }

    logger.info(`Evaluation completed for model ${modelName}: RMSE=${evaluationResult.metrics.rmse.toFixed(4)}`);

    res.status(200).json({
      success: true,
      data: {
        evaluationId: evaluation._id,
        modelName: modelName,
        modelType: model.type,
        metrics: evaluationResult.metrics,
        baselineComparison: evaluationResult.baseline_comparison,
        targetAchievement: evaluationResult.target_achievement,
        summary: evaluationResult.summary,
        reportPath: evaluationResult.stored_path
      }
    });

  } catch (error) {
    logger.error(`Model evaluation failed: ${error.message}`);
    next(error);
  }
};

/**
 * Evaluate model against simulation results
 */
export const evaluateAgainstSimulation = async (req, res, next) => {
  try {
    const { modelName, simulationId } = req.params;

    logger.info(`Evaluating model ${modelName} against simulation ${simulationId}`);

    // Find the model
    const model = await MLModel.findOne({ name: modelName }).sort({ createdAt: -1 });
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: `Model '${modelName}' not found`
        }
      });
    }

    // Find the simulation
    const simulation = await Simulation.findById(simulationId);
    
    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SIMULATION_NOT_FOUND',
          message: `Simulation '${simulationId}' not found`
        }
      });
    }

    if (simulation.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SIMULATION_NOT_COMPLETED',
          message: 'Simulation must be completed before evaluation'
        }
      });
    }

    // Extract actual values from simulation results
    // This would depend on the simulation data structure
    const actualValues = simulation.results?.detailedMetrics?.queueLengths || [];
    
    if (actualValues.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_SIMULATION_DATA',
          message: 'Simulation has no queue length data for evaluation'
        }
      });
    }

    // Prepare test data from simulation
    // This is a simplified version - in reality, you'd need to prepare proper input sequences
    const testData = actualValues.slice(0, -10).map((value, index) => ({
      queue_length: value,
      vehicle_arrivals: simulation.results?.detailedMetrics?.vehicleArrivals?.[index] || 0,
      time_of_day: (index % 1440) / 1440, // Assuming minute-level data
      weather: simulation.config?.weather === 'rain' ? 1 : 0
    }));

    const targetValues = actualValues.slice(10);

    // Call evaluation
    const evaluationResult = await pythonAIService.evaluateModel(
      modelName,
      testData,
      targetValues
    );

    // Store evaluation
    const evaluation = new PredictionEvaluation({
      modelId: model._id,
      modelName: modelName,
      modelType: model.type,
      evaluatedBy: req.user._id,
      simulationId: simulation._id,
      metrics: evaluationResult.metrics,
      baselineComparison: evaluationResult.baseline_comparison,
      targetAchievement: evaluationResult.target_achievement,
      summary: evaluationResult.summary,
      numSamples: evaluationResult.num_samples,
      evaluationData: {
        testDataSource: 'simulation',
        actualValues: targetValues.slice(0, 100)
      },
      additionalInfo: {
        ...evaluationResult.additional_info,
        simulationConfig: simulation.config
      },
      reportPath: evaluationResult.stored_path
    });

    await evaluation.save();

    logger.info(`Simulation evaluation completed for model ${modelName}`);

    res.status(200).json({
      success: true,
      data: {
        evaluationId: evaluation._id,
        modelName: modelName,
        simulationId: simulationId,
        metrics: evaluationResult.metrics,
        baselineComparison: evaluationResult.baseline_comparison,
        targetAchievement: evaluationResult.target_achievement,
        summary: evaluationResult.summary
      }
    });

  } catch (error) {
    logger.error(`Simulation evaluation failed: ${error.message}`);
    next(error);
  }
};

/**
 * Compare multiple models
 */
export const compareModels = async (req, res, next) => {
  try {
    const { modelNames, testData, actualValues } = req.body;

    logger.info(`Comparing ${modelNames.length} models`);

    // Call Python AI service to compare
    const comparisonResult = await pythonAIService.compareModels(
      testData,
      actualValues,
      modelNames
    );

    res.status(200).json({
      success: true,
      data: comparisonResult
    });

  } catch (error) {
    logger.error(`Model comparison failed: ${error.message}`);
    next(error);
  }
};

/**
 * Get evaluation history for a model
 */
export const getModelEvaluations = async (req, res, next) => {
  try {
    const { modelName } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const evaluations = await PredictionEvaluation.find({ modelName })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('evaluatedBy', 'firstName lastName email')
      .populate('simulationId', 'name status')
      .lean();

    const count = await PredictionEvaluation.countDocuments({ modelName });

    res.status(200).json({
      success: true,
      data: {
        evaluations,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });

  } catch (error) {
    logger.error(`Failed to get evaluations: ${error.message}`);
    next(error);
  }
};

/**
 * Get evaluation by ID
 */
export const getEvaluationById = async (req, res, next) => {
  try {
    const { evaluationId } = req.params;

    const evaluation = await PredictionEvaluation.findById(evaluationId)
      .populate('modelId')
      .populate('evaluatedBy', 'firstName lastName email')
      .populate('simulationId')
      .lean();

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EVALUATION_NOT_FOUND',
          message: 'Evaluation not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: evaluation
    });

  } catch (error) {
    logger.error(`Failed to get evaluation: ${error.message}`);
    next(error);
  }
};

/**
 * Get all evaluations with filtering
 */
export const getAllEvaluations = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      modelType, 
      meetsTargets,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (modelType) {
      filter.modelType = modelType;
    }
    
    if (meetsTargets !== undefined) {
      filter['targetAchievement.meetsAllTargets'] = meetsTargets === 'true';
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const evaluations = await PredictionEvaluation.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('modelId', 'name type version')
      .populate('evaluatedBy', 'firstName lastName')
      .lean();

    const count = await PredictionEvaluation.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        evaluations,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });

  } catch (error) {
    logger.error(`Failed to get evaluations: ${error.message}`);
    next(error);
  }
};

/**
 * Generate accuracy report
 */
export const generateAccuracyReport = async (req, res, next) => {
  try {
    const { evaluationId } = req.params;

    const evaluation = await PredictionEvaluation.findById(evaluationId)
      .populate('modelId')
      .populate('simulationId')
      .lean();

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EVALUATION_NOT_FOUND',
          message: 'Evaluation not found'
        }
      });
    }

    // Generate formatted report
    const report = {
      title: `Prediction Accuracy Report - ${evaluation.modelName}`,
      generatedAt: new Date().toISOString(),
      model: {
        name: evaluation.modelName,
        type: evaluation.modelType,
        version: evaluation.modelId?.version
      },
      evaluation: {
        date: evaluation.createdAt,
        numSamples: evaluation.numSamples,
        dataSource: evaluation.evaluationData?.testDataSource
      },
      metrics: evaluation.metrics,
      baselineComparison: evaluation.baselineComparison,
      targetAchievement: evaluation.targetAchievement,
      summary: evaluation.summary,
      recommendations: [
        evaluation.summary.recommendation,
        evaluation.targetAchievement.meetsAllTargets 
          ? 'Model meets all accuracy targets and is ready for deployment'
          : 'Model requires further training or hyperparameter tuning'
      ]
    };

    res.status(200).json({
      success: true,
      data: report
    });

  } catch (error) {
    logger.error(`Failed to generate report: ${error.message}`);
    next(error);
  }
};
