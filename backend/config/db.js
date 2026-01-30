const mongoose = require("mongoose");

module.exports = async () => {
  try {
    await mongoose.connect("mongodb://root:secret123@localhost:27017/billing-tracker?authSource=admin", {
      serverSelectionTimeoutMS: 5000
    });

    console.log(" MongoDB connected");
  } catch (err) {
    console.error(" MongoDB connection failed");
    console.error(err.message);
    process.exit(1); 
  }
};
