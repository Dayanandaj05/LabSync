const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Student','Staff','Admin'], default: 'Student' },
  
  // ✅ ADDED: Class Group for Students
  classGroup: { type: String, enum: ['G1', 'G2', 'N/A'], default: 'N/A' },
  
  status: { type: String, enum: ['Pending','Approved','Rejected'], default: 'Pending' },
  rejectReason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);