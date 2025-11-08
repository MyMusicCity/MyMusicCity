// server/index.js
const express = require("express");
const mongoose = require("./mongoose");
const cors = require("cors");
require("dotenv").config();
console.log("Loaded PORT:", process.env.PORT);


const User = require("./models/User");
const Event = require("./models/Event");
const Rsvp = require("./models/Rsvp");

// Import routes
const authRoutes = require("./routes/auth");

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

// Readiness endpoint - useful for platform readiness checks. Returns 200 when
// the DB connection is ready. Returns 503 when not ready.
app.get("/ready", (_req, res) => {
  const state = mongoose.connection.readyState; // 1 = connected
  if (state === 1) return res.status(200).json({ ready: true });
  return res.status(503).json({ ready: false, state });
});

// ===== Auth Routes =====
app.use("/api", authRoutes); // mounts /api/signup and /api/login

// ===== Event Routes =====

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
    // Use lean() to return plain objects and avoid mongoose document serialization issues
    let events = await Event.find().populate("createdBy", "username email").lean().exec();
    // Normalize date to ISO string to avoid client-side parsing surprises
    events = events.map((ev) => ({
      ...ev,
      date: ev.date ? new Date(ev.date).toISOString() : null,
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

    // Find RSVPs for the user and populate the event and user fields.
    // We return the RSVPs (with populated event) so the client can show the
    // events the user has RSVP'd to.
    let rsvps = await Rsvp.find({ user: userId })
      .populate("event", "title date location")
      .populate("user", "username email");

    // Normalize event.date to ISO string on the returned rsvp objects so the
    // client doesn't need to parse Date objects.
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

    // Normalize dates
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

// Create a new RSVP
app.post("/api/rsvps", async (req, res) => {
  try {
    const { eventId, userId, status } = req.body;
    if (!eventId || !userId)
      return res.status(400).json({ error: "eventId and userId are required" });
    // Validate IDs
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(eventId))
      return res.status(400).json({ error: "Invalid eventId" });
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ error: "Invalid userId" });

    // Ensure event and user exist to provide clearer errors instead of a 500
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

    // In some environments calling .populate chained directly can attempt to
    // call populate on a Promise (which doesn't have that method). Call
    // populate with await in two steps to ensure we're operating on the
    // Mongoose Document, not a Promise.
    await rsvp.populate("event", "title date location");
    await rsvp.populate("user", "username email");

    res.status(201).json(rsvp);
  } catch (err) {
    if (err.code === 11000)
      return res
        .status(400)
        .json({ error: "RSVP already exists for this event and user" });
    console.error("RSVP create error:", err && err.stack ? err.stack : err);
    // Surface the error message to make client debugging easier while still
    // returning a 500 status. This is safe for now because messages are generic
    // (if you want to avoid leaking info in production, return a generic message).
    res.status(500).json({ error: err.message || "Failed to create RSVP" });
  }
});

/* ==================== START SERVER ==================== */
const PORT = process.env.PORT || 5050;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in .env file");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { dbName: "mymusiccity" })
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    // Bind to all network interfaces so platform (Render, Heroku, etc.) can detect the open port.
    const HOST = process.env.HOST || "0.0.0.0";
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`Binding host: ${HOST}; ENV PORT=${process.env.PORT}; NODE_ENV=${process.env.NODE_ENV}`);
      if (process.env.PORT === "5000") {
        console.warn(
          "⚠️  Warning: PORT is set to 5000. If you're deploying to a platform that assigns a dynamic port (Render/Heroku), remove hard-coded PORT from environment variables so the host can provide the port."
        );
      }
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
