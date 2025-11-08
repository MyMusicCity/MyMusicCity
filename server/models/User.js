// server/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  year: { type: String },
  major: { type: String },
});

module.exports = mongoose.model("User", userSchema);
