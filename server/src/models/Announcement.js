const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  message: { type: String, required: true },
  type: { type: String, enum: ['Info', 'Warning', 'Test'], default: 'Info' },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date }, // Made optional for backward compatibility
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);