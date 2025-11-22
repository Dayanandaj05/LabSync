// src/models/Booking.js
const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  period: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  creatorName: { type: String },
  role: { type: String, enum: ['Admin','Staff','Student'], default: 'Student' },
  purpose: { type: String },
  status: { type: String, enum: ['Pending','Approved','Rejected'], default: 'Pending' },
  adminReason: { type: String, default: '' },
  priority: { type: Number, default: 1 }, // Admin=3,Staff=2,Student=1
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
