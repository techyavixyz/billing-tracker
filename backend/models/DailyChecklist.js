const mongoose = require("mongoose");

const DailyChecklistSchema = new mongoose.Schema({
  service: { type: String, required: true },
  date: { type: Date, required: true },
  taskName: { type: String, required: true },
  description: String,
  isCompleted: { type: Boolean, default: false },
  checkedBy: String,
  checkedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("DailyChecklist", DailyChecklistSchema);
