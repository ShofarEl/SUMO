import mongoose from 'mongoose';

const mlModelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Model name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['lstm', 'random_forest', 'dqn', 'ppo', 'marl'],
    required: true
  },
  version: {
    type: String,
    required: true
  },
  trainedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trainingConfig: {
    hyperparameters: mongoose.Schema.Types.Mixed,
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrafficData'
    },
    epochs: Number,
    batchSize: Number,
    learningRate: Number,
    architecture: mongoose.Schema.Types.Mixed
  },
  performance: {
    rmse: Number,
    mae: Number,
    r2Score: Number,
    trainingLoss: [Number],
    validationLoss: [Number],
    convergenceEpoch: Number
  },
  modelPath: {
    type: String,
    required: true
  },
  isDeployed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
mlModelSchema.index({ type: 1, version: 1 });
mlModelSchema.index({ trainedBy: 1, createdAt: -1 });
mlModelSchema.index({ isDeployed: 1 });

export default mongoose.model('MLModel', mlModelSchema);
