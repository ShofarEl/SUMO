import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    enum: ['simulation', 'api', 'system', 'ml', 'rl'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    default: 'string'
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for key lookups
systemConfigSchema.index({ key: 1 });
systemConfigSchema.index({ category: 1 });

// Method to get config value
systemConfigSchema.statics.getValue = async function(key, defaultValue = null) {
  const config = await this.findOne({ key });
  return config ? config.value : defaultValue;
};

// Method to set config value
systemConfigSchema.statics.setValue = async function(key, value, userId = null) {
  const config = await this.findOneAndUpdate(
    { key },
    { value, updatedBy: userId },
    { new: true, upsert: true }
  );
  return config;
};

export default mongoose.model('SystemConfig', systemConfigSchema);
