// server/app.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const User = require("./models/User");
const Event = require("./models/Event");
const Rsvp = require("./models/Rsvp");

// Import routes
const authRoutes = require("./routes/auth");
const updateImagesRoutes = require("./routes/updateImages");
const auth = require("./middleware/auth");
const { body, param, validationResult } = require("express-validator");

const app = express();

/* -------------------------- CORS Configuration -------------------------- */
const ALLOWLIST = [
  process.env.CORS_ORIGIN, // e.g. https://my-music-city.vercel.app
  "http://localhost:3000", // React local dev
];

const corsOptions = {
  origin: (origin, cb) => {
    const ok =
      !origin ||
      ALLOWLIST.includes(origin) ||
      /\.vercel\.app$/.test(origin);
    cb(null, ok);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/^\/.*$/, cors(corsOptions));
app.use(express.json());
/* ------------------------------------------------------------------------ */

// ===== Health & Root Routes =====
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));
app.get("/", (_req, res) => res.send("Hello from MyMusicCity backend!"));

// Readiness endpoint
app.get("/ready", (_req, res) => {
  const mongoose = require("mongoose");
  const state = mongoose.connection.readyState; // 1 = connected
  if (state === 1) return res.status(200).json({ ready: true });
  return res.status(503).json({ ready: false, state });
});

// ===== Auth Routes =====
app.use("/api", authRoutes); // mounts /api/signup and /api/login

// ===== Admin Routes =====
app.use("/api/admin", updateImagesRoutes); // mounts /api/admin/update-all-images

// ===== Event Routes =====

// Deployment info helper
app.get("/api/deploy-info", (_req, res) => {
  res.json({
    branch: process.env.DEPLOY_BRANCH || process.env.BRANCH || "jake",
    commit: process.env.COMMIT_SHA || process.env.COMMIT || null,
    deployedAt: new Date().toISOString(),
  });
});

// Get all users (hide passwords)
app.get("/api/users", async (_req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get all events
app.get("/api/events", async (_req, res) => {
  try {
    let events = await Event.find().populate("createdBy", "username email").lean().exec();

    const counts = await Rsvp.aggregate([
      { $group: { _id: "$event", count: { $sum: 1 } } },
    ]).exec();
    const countsMap = counts.reduce((m, c) => {
      if (c._id) m[String(c._id)] = c.count; return m;
    }, {});

    events = events.map((ev) => ({
      ...ev,
      date: ev.date ? new Date(ev.date).toISOString() : null,
      rsvpCount: countsMap[String(ev._id || ev.id)] || 0,
    }));

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get single event
app.get("/api/events/:id", async (req, res) => {
  try {
    if (!require("mongoose").Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: "Invalid event id" });

    let event = await Event.findById(req.params.id).populate("createdBy", "username email").lean().exec();
    if (!event) return res.status(404).json({ error: "Event not found" });
    event = { ...event, date: event.date ? new Date(event.date).toISOString() : null };
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Get all RSVPs
app.get("/api/rsvps", async (_req, res) => {
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

// Get RSVPs for a specific user
app.get("/api/rsvps/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ error: "Invalid user id" });

    let rsvps = await Rsvp.find({ user: userId })
      .populate("event", "title date location")
      .populate("user", "username email");

    rsvps = rsvps.map((r) => {
      const obj = r.toObject ? r.toObject() : r;
      if (obj.event && obj.event.date) obj.event.date = new Date(obj.event.date).toISOString();
      return obj;
    });

    res.json(rsvps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user RSVPs" });
  }
});

// Get RSVPs for a specific event (return attendees)
app.get("/api/rsvps/event/:eventId", async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(eventId))
      return res.status(400).json({ error: "Invalid event id" });

    let rsvps = await Rsvp.find({ event: eventId })
      .populate("user", "username email")
      .populate("event", "title date location");

    rsvps = rsvps.map((r) => {
      const obj = r.toObject ? r.toObject() : r;
      if (obj.event && obj.event.date) obj.event.date = new Date(obj.event.date).toISOString();
      return obj;
    });

    res.json(rsvps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch event RSVPs" });
  }
});

// Get single user by id (hide password)
app.get("/api/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid user id" });
    const user = await User.findById(id).select("-password").lean().exec();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Return current user info (requires auth)
app.get("/api/me", auth, async (req, res) => {
  try {
    const id = req.user && req.user.id;
    if (!id) return res.status(401).json({ error: "Unauthorized" });
    const user = await User.findById(id).select("-password").lean().exec();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch current user" });
  }
});

// Return RSVPs for current authenticated user
app.get("/api/me/rsvps", auth, async (req, res) => {
  try {
    const id = req.user && req.user.id;
    if (!id) return res.status(401).json({ error: "Unauthorized" });
    const rsvps = await Rsvp.find({ user: id })
      .populate("event", "title date location")
      .populate("user", "username email");

    const normalized = rsvps.map((r) => {
      const obj = r.toObject ? r.toObject() : r;
      if (obj.event && obj.event.date) obj.event.date = new Date(obj.event.date).toISOString();
      return obj;
    });
    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user RSVPs" });
  }
});

// Create a new RSVP (authenticated)
app.post(
  "/api/rsvps",
  auth,
  [body("eventId").exists().withMessage("eventId is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { eventId, status } = req.body;
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(eventId)) return res.status(400).json({ error: "Invalid eventId" });

      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [foundEvent, foundUser] = await Promise.all([
        Event.findById(eventId).select("_id title"),
        User.findById(userId).select("_id username email"),
      ]);
      if (!foundEvent) return res.status(404).json({ error: "Event not found" });
      if (!foundUser) return res.status(404).json({ error: "User not found" });

      const rsvp = new Rsvp({
        event: eventId,
        user: userId,
        status: status || "interested",
      });

      await rsvp.save();
      await rsvp.populate("event", "title date location");
      await rsvp.populate("user", "username email");

      res.status(201).json(rsvp);
    } catch (err) {
      if (err.code === 11000)
        return res.status(400).json({ error: "RSVP already exists for this event and user" });
      console.error("RSVP create error:", err && err.stack ? err.stack : err);
      res.status(500).json({ error: err.message || "Failed to create RSVP" });
    }
  }
);

// Cancel (delete) current user's RSVP for an event
app.delete("/api/rsvps/event/:eventId", auth, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(eventId))
      return res.status(400).json({ error: "Invalid event id" });

    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const deleted = await Rsvp.findOneAndDelete({ event: eventId, user: userId }).lean().exec();
    if (!deleted) return res.status(404).json({ error: "RSVP not found" });

    // Respond with a minimal object so client can update UI
    return res.json({ deleted: true, event: eventId });
  } catch (err) {
    console.error("RSVP delete error:", err && err.stack ? err.stack : err);
    res.status(500).json({ error: "Failed to delete RSVP" });
  }
});

module.exports = app;
