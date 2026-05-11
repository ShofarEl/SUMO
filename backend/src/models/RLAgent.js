import mongoose from 'mongoose';

const rlAgentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true
  },
  algorithm: {
    type: String,
    enum: ['dqn', 'ppo', 'a3c'],
    required: true
  },
  intersectionIds: [String],
  isMultiAgent: {
    type: Boolean,
    default: false
  },
  trainedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trainingStatus: {
    type: String,
    enum: ['not_started', 'training', 'completed', 'failed'],
    default: 'not_started'
  },
  trainingProgress: {
    currentEpisode: { type: Number, default: 0 },
    totalEpisodes: Number,
    currentReward: Number,
    bestReward: Number,
    avgDelay: Number,
    convergenceMetric: Number
  },
  config: {
    stateSpace: mongoose.Schema.Types.Mixed,
    actionSpace: mongoose.Schema.Types.Mixed,
    rewardFunction: String,
    networkArchitecture: mongoose.Schema.Types.Mixed,
    hyperparameters: mongoose.Schema.Types.Mixed
  },
  performance: {
    delayReduction: Number,
    queueReduction: Number,
    throughputIncrease: Number,
    fuelSavings: Number,
    emissionsReduction: Number
  },
  policyPath: String,
  isDeployed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
rlAgentSchema.index({ algorithm: 1, trainingStatus: 1 });
rlAgentSchema.index({ trainedBy: 1, createdAt: -1 });
rlAgentSchema.index({ isDeployed: 1 });

export default mongoose.model('RLAgent', rlAgentSchema);
