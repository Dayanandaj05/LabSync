const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, trim: true }, // e.g., "CS302"
  name: { type: String, required: true }, // e.g., "Data Structures"
  semester: { type: String }, // Optional context
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Subject', SubjectSchema);