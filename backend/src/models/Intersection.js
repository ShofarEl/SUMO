import mongoose from 'mongoose';

const intersectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Intersection name is required'],
    trim: true
  },
  osmId: {
    type: String,
    unique: true,
    sparse: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  roads: [{
    name: String,
    direction: String,
    lanes: Number
  }],
  signalConfig: {
    cycleLength: {
      type: Number,
      default: 60
    },
    phases: [{
      name: String,
      duration: Number,
      greenDirections: [String]
    }]
  },
  isCongestionHotspot: {
    type: Boolean,
    default: false
  },
  historicalData: {
    avgDailyVolume: Number,
    peakHourVolume: Number,
    avgDelay: Number
  }
}, {
  timestamps: true
});

// Geospatial index for location queries
intersectionSchema.index({ location: '2dsphere' });
intersectionSchema.index({ isCongestionHotspot: 1 });

export default mongoose.model('Intersection', intersectionSchema);
