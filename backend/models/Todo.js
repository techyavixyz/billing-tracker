const mongoose = require("mongoose");

const TodoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  assigned_to_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assigned_at: Date,
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  due_date: Date,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

TodoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

TodoSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model("Todo", TodoSchema);
