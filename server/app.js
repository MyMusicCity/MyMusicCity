// server/app.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const User = require("./models/User");
const Event = require("./models/Event");
const Rsvp = require("./models/Rsvp");
const Comment = require("./models/Comment"); // ⭐ REQUIRED for comment counts

// Import routes
const authRoutes = require("./routes/auth");
const updateImagesRoutes = require("./routes/updateImages");
const auth = require("./middleware/auth");
const { body, param, validationResult } = require("express-validator");
const commentRoutes = require("./routes/comments");

const app = express();

/* -------------------------- CORS Configuration -------------------------- */
const ALLOWLIST = [
  process.env.CORS_ORIGIN,
  "http://localhost:3000",
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
  const state = mongoose.connection.readyState;
  if (state === 1) return res.status(200).json({ ready: true });
  return res.status(503).json({ ready: false, state });
});

// ===== Auth Routes =====
app.use("/api", authRoutes);

// ===== Admin Routes =====
app.use("/api/admin", updateImagesRoutes);

// ===== Comment Routes =====
app.use("/api", commentRoutes);

/* =======================
       EVENT ROUTES
======================= */

// Deployment info helper
app.get("/api/deploy-info", (_req, res) => {
  res.json({
    branch: process.env.DEPLOY_BRANCH || process.env.BRANCH || "jake",
    commit: process.env.COMMIT_SHA || process.env.COMMIT || null,
    deployedAt: new Date().toISOString(),
  });
});

// Get all users
app.get("/api/users", async (_req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ⭐ GET ALL EVENTS WITH RSVP + COMMENT COUNTS
app.get("/api/events", async (req, res) => {
  try {
    // Build query object from optional parameters (backward compatible)
    let query = {};
    
    // Optional filtering parameters (all backward compatible)
    if (req.query.genre && req.query.genre !== 'all') {
      query.genre = req.query.genre;
    }
    
    if (req.query.venue) {
      query.venue = new RegExp(req.query.venue, 'i'); // case-insensitive search
    }
    
    if (req.query.musicType && req.query.musicType !== 'all') {
      query.musicType = req.query.musicType;
    }
    
    if (req.query.location) {
      query.location = new RegExp(req.query.location, 'i'); // case-insensitive search
    }
    
    if (req.query.source) {
      query.source = req.query.source;
    }

    let events = await Event.find(query)
      .populate("createdBy", "username email")
      .lean()
      .exec();

    /* --- RSVP COUNT --- */
    const rsvpCounts = await Rsvp.aggregate([
      { $group: { _id: "$event", count: { $sum: 1 } } }
    ]);

    const rsvpMap = rsvpCounts.reduce((m, c) => {
      if (c._id) m[String(c._id)] = c.count;
      return m;
    }, {});

    /* --- COMMENT COUNT (⭐ NEW) --- */
    const commentCounts = await Comment.aggregate([
      { $group: { _id: "$event", count: { $sum: 1 } } }
    ]);

    const commentMap = commentCounts.reduce((m, c) => {
      if (c._id) m[String(c._id)] = c.count;
      return m;
    }, {});

    /* --- MERGE COUNTS INTO EVENTS --- */
    events = events.map((ev) => ({
      ...ev,
      date: ev.date ? new Date(ev.date).toISOString() : null,
      rsvpCount: rsvpMap[String(ev._id)] || 0,
      commentCount: commentMap[String(ev._id)] || 0,
    }));

    // Optional sorting (backward compatible)
    if (req.query.sortBy) {
      switch (req.query.sortBy) {
        case 'mostComments':
          events.sort((a, b) => b.commentCount - a.commentCount);
          break;
        case 'mostRsvps':
          events.sort((a, b) => b.rsvpCount - a.rsvpCount);
          break;
        case 'locationAZ':
          events.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
          break;
        case 'soonest':
          events.sort((a, b) => new Date(a.date) - new Date(b.date));
          break;
        case 'latest':
          events.sort((a, b) => new Date(b.date) - new Date(a.date));
          break;
        // Default: no sorting (preserves existing behavior)
      }
    }

    res.json(events);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

/* ==================================================
   ⭐ FIXED: SINGLE EVENT ENDPOINT WITH POPULATED RSVPS
=================================================== */
app.get("/api/events/:id", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: "Invalid event id" });

    // ⭐ Populate RSVP users so EventDetails can detect "is attending"
    let event = await Event.findById(req.params.id)
      .populate("createdBy", "username email")
      .lean()
      .exec();

    if (!event)
      return res.status(404).json({ error: "Event not found" });

    // ⭐ Fetch RSVP documents with user info
    const rsvps = await Rsvp.find({ event: event._id })
      .populate("user", "username email")
      .lean()
      .exec();

    // ⭐ Count comments
    const commentCount = await Comment.countDocuments({ event: event._id });

    event = {
      ...event,
      date: event.date ? new Date(event.date).toISOString() : null,
      attendees: rsvps,          // ⭐ make attendees available to frontend
      rsvpCount: rsvps.length,   // ⭐ use actual populated rsvps
      commentCount: commentCount || 0,
    };

    res.json(event);

  } catch (err) {
    console.error("Single-event fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// All RSVPs
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

// RSVPs for specific user
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
      if (obj.event?.date) obj.event.date = new Date(obj.event.date).toISOString();
      return obj;
    });

    res.json(rsvps);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user RSVPs" });
  }
});

// RSVPs for specific event
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
      if (obj.event?.date) obj.event.date = new Date(obj.event.date).toISOString();
      return obj;
    });

    res.json(rsvps);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch event RSVPs" });
  }
});

// Single user
app.get("/api/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const mongoose = require("mongoose");

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid user id" });

    const user = await User.findById(id)
      .select("-password")
      .lean()
      .exec();

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Current logged-in user
app.get("/api/me", auth, async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) return res.status(401).json({ error: "Unauthorized" });

    let user;

    // If this looks like an Auth0 ID, find the corresponding User record
    if (authUserId.startsWith('auth0|') || authUserId.includes('|')) {
      // Use the mongoUser from auth middleware if available
      if (req.user?.mongoUser) {
        user = req.user.mongoUser;
      } else {
        // Fallback to database lookup
        user = await User.findOne({ auth0Id: authUserId })
          .select("-password")
          .lean()
          .exec();
          
        // If still no user found, try to create one now
        if (!user) {
          try {
            const User = require('./models/User');
            
            // Import the same function used in auth middleware
            const findOrCreateAuth0User = async (auth0Id, email) => {
              // Find by email first (for existing users)
              let existingUser = await User.findOne({ email });
              if (existingUser) {
                existingUser.auth0Id = auth0Id;
                await existingUser.save();
                return existingUser;
              }
              
              // Create new user
              let username = email?.split('@')[0] || 'user';
              let baseUsername = username;
              let counter = 1;
              while (await User.findOne({ username })) {
                username = `${baseUsername}${counter}`;
                counter++;
                if (counter > 100) {
                  username = `${baseUsername}_${Date.now()}`;
                  break;
                }
              }
              
              const newUser = new User({
                username,
                email,
                password: 'auth0-user',
                auth0Id,
                year: null,
                major: null
              });
              
              await newUser.save();
              return newUser;
            };
            
            const createdUser = await findOrCreateAuth0User(authUserId, req.user?.email);
            user = createdUser.toObject();
            delete user.password;
          } catch (createError) {
            console.error('Failed to create user record:', createError);
            return res.status(500).json({ 
              error: "Unable to create user profile. Please contact support." 
            });
          }
        }
      }
    } else {
      // Direct MongoDB ObjectId lookup
      user = await User.findById(authUserId)
        .select("-password")
        .lean()
        .exec();
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    // Add profile completion status
    const profileComplete = !!(user.year && user.major);
    
    res.json({
      ...user,
      profileComplete
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch current user" });
  }
});

// Update user profile (for Auth0 users to complete their profiles)
app.put("/api/me/profile", auth, async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) return res.status(401).json({ error: "Unauthorized" });

    const { year, major } = req.body;

    let user;

    // If this looks like an Auth0 ID, find the corresponding User record
    if (authUserId.startsWith('auth0|') || authUserId.includes('|')) {
      // Use the mongoUser from auth middleware if available
      if (req.user?.mongoUser) {
        user = req.user.mongoUser;
      } else {
        // Fallback to database lookup
        user = await User.findOne({ auth0Id: authUserId });
      }
    } else {
      // Direct MongoDB ObjectId lookup
      user = await User.findById(authUserId);
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    // Update profile fields
    if (year !== undefined) user.year = year;
    if (major !== undefined) user.major = major;

    await user.save();

    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;
    
    // Add profile completion status
    const profileComplete = !!(updatedUser.year && updatedUser.major);
    
    res.json({
      ...updatedUser,
      profileComplete
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// RSVPs for current user
app.get("/api/me/rsvps", auth, async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) return res.status(401).json({ error: "Unauthorized" });

    let userId = authUserId;

    // If this looks like an Auth0 ID, find the corresponding User record
    if (authUserId.startsWith('auth0|') || authUserId.includes('|')) {
      let user;
      // Use the mongoUser from auth middleware if available
      if (req.user?.mongoUser) {
        user = req.user.mongoUser;
      } else {
        // Fallback to database lookup
        const User = require('./models/User');
        user = await User.findOne({ auth0Id: authUserId });
      }
      
      if (!user) {
        // No user record found for this Auth0 ID - return empty RSVPs
        console.log(`No User record found for Auth0 ID: ${authUserId}`);
        return res.json([]);
      }
      userId = user._id;
    }

    const rsvps = await Rsvp.find({ user: userId })
      .populate("event", "title date location")
      .populate("user", "username email");

    const normalized = rsvps.map((r) => {
      const obj = r.toObject ? r.toObject() : r;
      if (obj.event?.date) obj.event.date = new Date(obj.event.date).toISOString();
      return obj;
    });

    res.json(normalized);

  } catch (err) {
    console.error("Error fetching user RSVPs:", err);
    res.status(500).json({ error: "Failed to fetch user RSVPs" });
  }
});

// Create RSVP
app.post(
  "/api/rsvps",
  auth,
  [body("eventId").exists().withMessage("eventId is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { eventId, status } = req.body;
      const mongoose = require("mongoose");

      if (!mongoose.Types.ObjectId.isValid(eventId))
        return res.status(400).json({ error: "Invalid eventId" });

      const authUserId = req.user?.id;
      if (!authUserId) return res.status(401).json({ error: "Unauthorized" });

      let userId = authUserId;
      let foundUser = null;

      // If this looks like an Auth0 ID, find the corresponding User record
      if (authUserId.startsWith('auth0|') || authUserId.includes('|')) {
        // Use the mongoUser from auth middleware if available
        if (req.user?.mongoUser) {
          foundUser = req.user.mongoUser;
          userId = foundUser._id;
        } else {
          // Fallback to database lookup
          foundUser = await User.findOne({ auth0Id: authUserId }).select("_id username email year major");
          if (!foundUser) {
            return res.status(404).json({ error: "User profile not found. Please try logging in again." });
          }
          userId = foundUser._id;
        }
      } else {
        // Direct MongoDB ObjectId lookup
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }
        foundUser = await User.findById(userId).select("_id username email year major");
      }

      const foundEvent = await Event.findById(eventId).select("_id title");

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
        return res.status(400).json({ error: "RSVP already exists" });

      console.error("RSVP create error:", err);
      res.status(500).json({ error: err.message || "Failed to create RSVP" });
    }
  }
);

// Delete RSVP
app.delete("/api/rsvps/event/:eventId", auth, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const mongoose = require("mongoose");

    if (!mongoose.Types.ObjectId.isValid(eventId))
      return res.status(400).json({ error: "Invalid event id" });

    const authUserId = req.user?.id;
    if (!authUserId) return res.status(401).json({ error: "Unauthorized" });

    let userId = authUserId;

    // If this looks like an Auth0 ID, find the corresponding User record
    if (authUserId.startsWith('auth0|') || authUserId.includes('|')) {
      const User = require('./models/User');
      const user = await User.findOne({ auth0Id: authUserId });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      userId = user._id;
    }

    const deleted = await Rsvp.findOneAndDelete({ event: eventId, user: userId })
      .lean()
      .exec();

    if (!deleted) return res.status(404).json({ error: "RSVP not found" });

    return res.json({ deleted: true, event: eventId });

  } catch (err) {
    console.error("RSVP delete error:", err);
    res.status(500).json({ error: "Failed to delete RSVP" });
  }
});

module.exports = app;
