// src/models/Lab.js
const mongoose = require('mongoose');

const LabSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true }, // IS, CC, CAT
  name: { type: String, required: true },
  capacity: { type: Number, default: 30 },
  blocked: [
    {
      date: Date,
      periods: [Number],
      reason: String,
      createdAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.models.Lab || mongoose.model('Lab', LabSchema);
