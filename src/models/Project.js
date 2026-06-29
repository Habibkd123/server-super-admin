// ─── src/models/Project.js ───────────────────────────────────────────────────
// Each registered school ERP project that can fetch its own theme
// Rule 21: Added 'suspended' status
// Rule 22: Added allowedDomains for optional domain validation

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    // Unique human-readable slug e.g. "greenwood-academy"
    projectId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_-]+$/, 'projectId must be lowercase letters, numbers, underscores, or dashes'],
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
    },
    // SECURITY: Store ONLY the bcrypt hash — never store plain apiKey
    apiKey: {
      type: String,
      required: true,
      select: false, // Never returned in queries by default
    },
    // Registered domain(s) of the school app (used for optional domain validation)
    // Rule 22: Only registered domains may request project configuration
    domain: {
      type: String,
      trim: true,
      default: '',
    },
    // Additional allowed domains (e.g. staging, custom domains)
    allowedDomains: {
      type: [String],
      default: [],
    },
    // Rule 21: 'active' = can fetch | 'inactive' = blocked | 'suspended' = temporarily blocked | 'deleted' = soft deleted
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'deleted'],
      default: 'active',
      index: true,
    },
    // Reference to Admin who created this project
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Rule 31: Never return hashed apiKey in JSON responses
projectSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.apiKey;
  return obj;
};

module.exports = mongoose.model('Project', projectSchema);
