// src/config/db.js
const mongoose = require('mongoose');

const connectDB = async (mongoUri) => {
  try {
    console.log('[DB] Attempting connection to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[DB] MongoDB connected.');
  } catch (err) {
    console.error('[DB] Connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
