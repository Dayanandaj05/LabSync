// src/seed/seedLabs.js
require('dotenv').config();
const mongoose = require('mongoose');
const Lab = require('../models/Lab');

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/labsync';
    console.log('[SEED] Connecting to DB:', MONGO_URI);

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('[SEED] DB connected.');

    const labs = [
      { code: 'IS', name: 'Information Systems Lab', capacity: 30, blocked: [] },
      { code: 'CC', name: 'Computer Center', capacity: 40, blocked: [] },
      { code: 'CAT', name: 'CAT Lab', capacity: 25, blocked: [] }
    ];

    for (const labData of labs) {
      const exists = await Lab.findOne({ code: labData.code });

      if (!exists) {
        await Lab.create(labData);
        console.log(`[SEED] Created lab ${labData.code}`);
      } else {
        console.log(`[SEED] Lab already exists: ${labData.code}`);
      }
    }

    console.log('[SEED] Labs seeding complete.');
    process.exit(0);

  } catch (err) {
    console.error('[SEED][ERROR]', err);
    process.exit(1);
  }
})();
