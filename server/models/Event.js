const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: String,
  date: { type: Date, required: true },
  location: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Event", EventSchema);
