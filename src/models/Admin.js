// ─── src/models/Admin.js ──────────────────────────────────────────────────────
// Super Admin user model — only one role: 'superadmin'

const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // bcrypt hashed password — never store plain text
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'superadmin',
      enum: ['superadmin'],
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

// Prevent password from being returned in JSON responses
adminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Admin', adminSchema);
