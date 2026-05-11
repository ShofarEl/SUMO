import mongoose from 'mongoose';

const simulationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Simulation name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  config: {
    trafficDemand: {
      type: String,
      enum: ['low', 'medium', 'high', 'peak'],
      required: true
    },
    vehicleMix: {
      cars: { type: Number, min: 0, max: 100, default: 55 },
      motorcycles: { type: Number, min: 0, max: 100, default: 25 },
      minibuses: { type: Number, min: 0, max: 100, default: 15 },
      trucks: { type: Number, min: 0, max: 100, default: 5 }
    },
    duration: {
      type: Number,
      required: true,
      min: 60
    },
    timeOfDay: {
      type: String,
      enum: ['morning_peak', 'off_peak', 'evening_peak'],
      required: true
    },
    weather: {
      type: String,
      enum: ['clear', 'rain', 'flood'],
      default: 'clear'
    },
    incidents: [{
      type: { type: String },
      location: String,
      startTime: Number,
      duration: Number
    }],
    controlStrategy: {
      type: String,
      enum: ['fixed', 'lstm', 'rf', 'dqn', 'ppo', 'marl'],
      required: true
    }
  },
  results: {
    avgDelay: Number,
    avgQueueLength: Number,
    throughput: Number,
    fuelConsumption: Number,
    co2Emissions: Number,
    predictionRMSE: Number,
    predictionMAE: Number,
    detailedMetrics: mongoose.Schema.Types.Mixed
  },
  jobId: {
    type: String
  },
  startTime: Date,
  endTime: Date
}, {
  timestamps: true
});

// Indexes for performance
simulationSchema.index({ userId: 1, createdAt: -1 });
simulationSchema.index({ status: 1 });
simulationSchema.index({ 'config.controlStrategy': 1 });

export default mongoose.model('Simulation', simulationSchema);
