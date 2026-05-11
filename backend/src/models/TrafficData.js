import mongoose from 'mongoose';

const trafficDataSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Dataset name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    enum: ['osm', 'google_maps', 'sris', 'gps', 'resolv', 'manual'],
    required: true
  },
  dataType: {
    type: String,
    enum: ['network', 'demand', 'sensor', 'validation'],
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  metadata: {
    recordCount: Number,
    startDate: Date,
    endDate: Date,
    coverage: String,
    quality: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  validation: {
    isValidated: {
      type: Boolean,
      default: false
    },
    validationDate: Date,
    validationMethod: String,
    deviationPercent: Number
  }
}, {
  timestamps: true
});

// Indexes
trafficDataSchema.index({ uploadedBy: 1, createdAt: -1 });
trafficDataSchema.index({ source: 1, dataType: 1 });

export default mongoose.model('TrafficData', trafficDataSchema);
