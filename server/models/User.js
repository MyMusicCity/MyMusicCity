const mongoose = require("../mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  year:     { type: String },   
  major:    { type: String },
  // NEW: Admin and Auth0 integration fields (all optional for backward compatibility)
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  auth0Id: {
    type: String,
    required: false,
    unique: true,
    sparse: true  // Allows nulls without unique constraint conflicts
  },
  // NEW: Account state machine for robust user creation
  accountState: {
    type: String,
    enum: ["creating", "pending", "active", "complete", "error"],
    default: "active" // For backward compatibility with existing users
  },
  accountStateTransitions: [{
    from: String,
    to: String,
    timestamp: { type: Date, default: Date.now },
    reason: String,
    error: String
  }],
  // NEW: Idempotency key for preventing duplicate user creation
  idempotencyKey: {
    type: String,
    sparse: true,
    index: true
  },
  // NEW: Auth0 specific timestamps
  auth0CreatedAt: Date,
  auth0LinkedAt: Date,
  lastError: String,
  // NEW: Creation metadata for debugging and monitoring
  creationMetadata: {
    userAgent: String,
    ipAddress: String,
    retryCount: { type: Number, default: 0 },
    creationMethod: String
  },
  preferences: {
    favoriteGenres: [String],
    favoriteVenues: [String],
    notifications: { type: Boolean, default: true }
  },
  createdAt:{ type: Date, default: Date.now },
});

// Add compound indexes for better query performance and data integrity
UserSchema.index({ auth0Id: 1, email: 1 });
UserSchema.index({ accountState: 1, createdAt: 1 });
UserSchema.index({ idempotencyKey: 1, accountState: 1 });

module.exports = mongoose.model("User", UserSchema);
