// src/seed/seedAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/labsync';
const SALT=10;

async function run(){
  await mongoose.connect(MONGO);
  const exists = await User.findOne({ email: 'admin@labsync.local' });
  if (exists) {
    console.log('Admin already exists');
    process.exit(0);
  }
  const hashed = await bcrypt.hash('adminpass', SALT);
  const admin = new User({ name: 'Lab Assistant', email:'admin@labsync.local', password: hashed, role:'Admin', status:'Approved' });
  await admin.save();
  console.log('Created admin admin@labsync.local password=adminpass');
  process.exit(0);
}
run().catch(e=>{ console.error(e); process.exit(1)});
