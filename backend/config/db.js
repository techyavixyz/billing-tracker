const mongoose = require("mongoose");
const initDefaultUser = require("./initDefaultUser");

module.exports = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://root:secret123@localhost:27017/billing-tracker?authSource=admin";

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });

    console.log("✅ MongoDB connected");

    await initDefaultUser();
  } catch (err) {
    console.error("❌ MongoDB connection failed");
    console.error(err.message);
    process.exit(1);
  }
};
