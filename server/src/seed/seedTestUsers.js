require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt"); // ⬅️ THIS IS THE KEY FIX
const User = require("../models/User");

// Use the URI from .env or default to local
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/labsync";

(async () => {
  try {
    // 1. Connect to Database
    await mongoose.connect(MONGO_URI);
    console.log("[SEED] Connected to DB.");

    // 2. WIPE OLD DATA (Crucial for a clean fix)
    console.log("[SEED] Clearing old users...");
    await User.deleteMany({ email: { $in: ['student@test.com', 'staff@test.com', 'admin@test.com'] } });

    // 3. GENERATE ENCRYPTED PASSWORDS
    const commonPass = await bcrypt.hash("test123", 10);
    const adminPass = await bcrypt.hash("admin123", 10);

    // 4. PREPARE USERS
    const users = [
      {
        name: "Test Student",
        email: "student@test.com",
        password: commonPass, // ✅ Hashed
        role: "Student",
        status: "Approved",
      },
      {
        name: "Test Staff",
        email: "staff@test.com",
        password: commonPass, // ✅ Hashed
        role: "Staff",
        status: "Approved",
      },
      {
        name: "Super Admin",
        email: "admin@test.com",
        password: adminPass, // ✅ Hashed
        role: "Admin",
        status: "Approved",
      },
    ];

    // 5. INSERT INTO DB
    await User.insertMany(users);
    console.log("[SEED] ✅ Success! Users created with ENCRYPTED passwords.");
    
    process.exit(0);
  } catch (err) {
    console.error("[SEED] ❌ Error:", err);
    process.exit(1);
  }
})();