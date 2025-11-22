// src/seed/seedTestUsers.js
require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");

(async () => {
  await connectDB(process.env.MONGO_URI);

  const testUsers = [
    {
      name: "Test Student",
      email: "student@test.com",
      password: "test123",
      role: "Student",
      status: "Approved",
    },
    {
      name: "Test Staff",
      email: "staff@test.com",
      password: "test123",
      role: "Staff",
      status: "Approved",
    },
    {
      name: "Test Admin",
      email: "admin@test.com",
      password: "test123",
      role: "Admin",
      status: "Approved",
    },
  ];

  for (const u of testUsers) {
    let exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log("[EXISTS]", u.email);
      continue;
    }
    const user = new User(u);
    await user.save();
    console.log("[CREATED]", u.email);
  }

  console.log("Test users seeded.");
  process.exit(0);
})();
