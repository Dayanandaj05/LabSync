const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g., 'semesterConfig'
  value: { type: mongoose.Schema.Types.Mixed, required: true }, // Stores { endDate: 'YYYY-MM-DD' }
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);