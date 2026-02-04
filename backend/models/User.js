const mongoose = require("mongoose");

const ServicePermissionSchema = new mongoose.Schema({
  service: { type: String, required: true },
  can_read: { type: Boolean, default: false },
  can_write: { type: Boolean, default: false }
});

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  full_name: {
    type: String,
    default: ""
  },
  role: {
    type: String,
    enum: ['user', 'manager', 'admin'],
    default: 'user'
  },
  service_permissions: [ServicePermissionSchema],
  kanban_permissions: {
    can_read: { type: Boolean, default: false },
    can_write: { type: Boolean, default: false }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

UserSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

UserSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updated_at: Date.now() });
  next();
});

module.exports = mongoose.model("User", UserSchema);
