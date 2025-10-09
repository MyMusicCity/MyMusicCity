// server/index.js
const express = require("express");
const mongoose = require("./mongoose"); // shared instance
const cors = require("cors");
require("dotenv").config();

const User = require("./models/User");
const Event = require("./models/Event");
const Rsvp = require("./models/Rsvp");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Hello from MyMusicCity backend!");
});

// Config
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in .env file");
  process.exit(1);
}

// ===== Routes =====

// Get all users (hide raw passwords)
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get all events (populate creator info)
app.get("/api/events", async (req, res) => {
  try {
    const events = await Event.find().populate("createdBy", "username email");
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// ✅ NEW: Get single event by ID
app.get("/api/events/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("createdBy", "username email");
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Get all RSVPs (populate event + user info)
app.get("/api/rsvps", async (req, res) => {
  try {
    const rsvps = await Rsvp.find()
      .populate("event", "title date location")
      .populate("user", "username email");
    res.json(rsvps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch RSVPs" });
  }
});

// ✅ NEW: Create a new RSVP
app.post("/api/rsvps", async (req, res) => {
  try {
    const { eventId, userId, status } = req.body;

    if (!eventId || !userId) {
      return res.status(400).json({ error: "eventId and userId are required" });
    }

    const rsvp = new Rsvp({
      event: eventId,
      user: userId,
      status: status || "interested",
    });

    await rsvp.save();

    const populatedRsvp = await rsvp.populate("event", "title date location")
                                   .populate("user", "username email");

    res.status(201).json(populatedRsvp);
  } catch (err) {
    if (err.code === 11000) {
      // duplicate index error from (event, user) unique constraint
      return res.status(400).json({ error: "RSVP already exists for this event and user" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create RSVP" });
  }
});

// ===== Start Server =====
mongoose
  .connect(MONGO_URI, { dbName: "mymusiccity" })
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
