const mongoose = require("../mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  year:     { type: String },   
  major:    { type: String },  
  createdAt:{ type: Date, default: Date.now },
  // Email verification fields
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date }
});

module.exports = mongoose.model("User", UserSchema);
