import mongoose from 'mongoose';

const predictionEvaluationSchema = new mongoose.Schema({
  modelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MLModel',
    required: true
  },
  modelName: {
    type: String,
    required: true
  },
  modelType: {
    type: String,
    enum: ['lstm', 'random_forest', 'dqn', 'ppo', 'marl'],
    required: true
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  simulationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Simulation'
  },
  metrics: {
    rmse: {
      type: Number,
      required: true
    },
    mae: {
      type: Number,
      required: true
    },
    mse: Number,
    r2Score: Number,
    meanError: Number,
    stdError: Number,
    medianError: Number,
    mape: Number,
    directionalAccuracy: Number
  },
  baselineComparison: {
    modelRmse: Number,
    modelMae: Number,
    baselineRmse: Number,
    baselineMae: Number,
    rmseImprovementPercent: Number,
    maeImprovementPercent: Number,
    isBetterThanBaseline: Boolean
  },
  targetAchievement: {
    targetRmse: Number,
    targetMae: Number,
    meetsRmseTarget: Boolean,
    meetsMaeTarget: Boolean,
    meetsAllTargets: Boolean
  },
  summary: {
    overallPerformance: {
      type: String,
      enum: ['excellent', 'good', 'acceptable', 'needs_improvement']
    },
    recommendation: String
  },
  numSamples: {
    type: Number,
    required: true
  },
  evaluationData: {
    testDataSource: String,
    actualValues: [Number],
    predictedValues: [Number]
  },
  additionalInfo: mongoose.Schema.Types.Mixed,
  reportPath: String
}, {
  timestamps: true
});

// Indexes
predictionEvaluationSchema.index({ modelId: 1, createdAt: -1 });
predictionEvaluationSchema.index({ modelName: 1, createdAt: -1 });
predictionEvaluationSchema.index({ evaluatedBy: 1 });
predictionEvaluationSchema.index({ simulationId: 1 });
predictionEvaluationSchema.index({ 'metrics.rmse': 1 });
predictionEvaluationSchema.index({ 'targetAchievement.meetsAllTargets': 1 });

export default mongoose.model('PredictionEvaluation', predictionEvaluationSchema);
