const mongoose = require("../mongoose");

const EventSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String 
  },
  date: { 
    type: Date, 
    required: true 
  },
  url: {
    type: String,
    required: false,
    default: null,
    trim: true,
  },
  image: {
    type: String,
    required: false,
    default: null,
    trim: true,
  },
  normalizedTitle: {
    type: String,
    required: false,
    default: null,
    index: true,
  },
  location: { 
    type: String 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: false,     // allow scraper to skip user reference
    default: null 
  },
  source: { 
    type: String, 
    default: "manual"    // helpful for tracking (e.g. "do615", "user", etc.)
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});
// Compound index to avoid duplicate inserts when source provides a canonical URL.
// Sparse so it doesn't block events without URLs.
EventSchema.index({ source: 1, url: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Event", EventSchema);
