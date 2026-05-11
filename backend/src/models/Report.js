import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Report title is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['simulation', 'comparison', 'feasibility', 'full_research'],
    required: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  simulationIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Simulation'
  }],
  content: {
    executiveSummary: String,
    methodology: String,
    results: mongoose.Schema.Types.Mixed,
    conclusions: String,
    recommendations: [String]
  },
  format: {
    type: String,
    enum: ['pdf', 'html', 'latex'],
    default: 'pdf'
  },
  fileUrl: String
}, {
  timestamps: true
});

// Indexes
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ type: 1 });

export default mongoose.model('Report', reportSchema);
