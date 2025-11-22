const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  period: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  creatorName: { type: String },
  role: { type: String, enum: ['Admin','Staff','Student'], default: 'Student' },
  
  // ✅ NEW FIELDS
  type: { type: String, enum: ['Regular', 'Test', 'Exam', 'Event'], default: 'Regular' }, 
  purpose: { type: String },
  
  status: { type: String, enum: ['Pending','Approved','Rejected'], default: 'Pending' },
  adminReason: { type: String, default: '' },
  priority: { type: Number, default: 1 },
  
  // ✅ RECURRING INFO
  isRecurring: { type: Boolean, default: false },
  recurrenceId: { type: String }, // UUID to group recurring bookings together

  // ✅ WAITLIST SYSTEM
  waitlist: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String },
    requestedAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);