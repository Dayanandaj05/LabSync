const mongoose = require('mongoose');

const LabSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true }, 
  name: { type: String, required: true },
  capacity: { type: Number, default: 30 },
  
  // Specific single-day blocks
  blocked: [{
    date: Date,
    periods: [Number],
    reason: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // ✅ NEW: Duration-based Maintenance Windows
  maintenanceLog: [{
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    reason: String,
    cancelledCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.models.Lab || mongoose.model('Lab', LabSchema);