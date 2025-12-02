const mongoose = require("../mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  year:     { type: String },   
  major:    { type: String },
  phone:    { type: String, required: false, trim: true }, // Optional phone number
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
  preferences: {
    favoriteGenres: [String],
    favoriteVenues: [String],
    notifications: { type: Boolean, default: true }
  },
  createdAt:{ type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
