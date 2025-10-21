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

module.exports = mongoose.model("Event", EventSchema);
