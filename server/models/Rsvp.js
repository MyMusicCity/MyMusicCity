const mongoose = require("mongoose");

const RsvpSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["going", "interested", "not_going"], default: "interested" },
  createdAt: { type: Date, default: Date.now }
});

// Prevent duplicate RSVPs for same event+user
RsvpSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Rsvp", RsvpSchema);
