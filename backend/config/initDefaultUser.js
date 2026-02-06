const bcrypt = require("bcrypt");
const User = require("../models/User");

async function initDefaultUser() {
  try {
    const userCount = await User.countDocuments();

    if (userCount === 0) {
      const username = process.env.DEFAULT_ADMIN_USERNAME || "admin";
      const email = process.env.DEFAULT_ADMIN_EMAIL || "admin@billingtracker.local";
      const password = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

      const hashedPassword = await bcrypt.hash(password, 10);

      await User.create({
        username,
        email,
        password: hashedPassword,
        role: "admin"
      });

      console.log("✅ Default admin user created");
      console.log(`   Username: ${username}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log("   Please change these credentials after first login!");
    }
  } catch (error) {
    console.error("❌ Failed to create default user:", error.message);
  }
}

module.exports = initDefaultUser;
