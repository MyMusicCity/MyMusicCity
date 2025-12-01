// server/app.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Environment variable validation for Auth0
function validateAuthEnvironment() {
  const issues = [];
  
  if (!process.env.AUTH0_DOMAIN) {
    issues.push("❌ AUTH0_DOMAIN is not configured");
  } else if (process.env.AUTH0_DOMAIN.includes('your-domain')) {
    issues.push("❌ AUTH0_DOMAIN contains placeholder value");
  }
  
  if (!process.env.AUTH0_AUDIENCE) {
    console.warn("⚠️  AUTH0_AUDIENCE is not configured - Auth0 token verification will be disabled");
  } else {
    console.log(`✅ Auth0 configured with audience: ${process.env.AUTH0_AUDIENCE}`);
  }
  
  if (issues.length > 0) {
    console.warn("🔧 Auth0 Configuration Issues:");
    issues.forEach(issue => console.warn(`   ${issue}`));
    console.warn("   Auth0 authentication will fall back to local JWT tokens");
  } else if (process.env.AUTH0_DOMAIN && process.env.AUTH0_AUDIENCE) {
    console.log("✅ Auth0 server configuration validated");
  }
}

validateAuthEnvironment();

const User = require("./models/User");
const Event = require("./models/Event");
const Rsvp = require("./models/Rsvp");
const Comment = require("./models/Comment"); // ⭐ REQUIRED for comment counts

// Import routes
const authRoutes = require("./routes/auth");
const updateImagesRoutes = require("./routes/updateImages");
const presentationRoutes = require("./routes/presentation");
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

// ===== Presentation Routes =====
app.use("/api/presentation", presentationRoutes);

/* =======================
       EVENT ROUTES
======================= */

// ⭐ ADMIN DATABASE DIAGNOSTICS AND CLEANUP
app.get("/api/admin/diagnostics", (req, res) => {
  res.sendFile(path.join(__dirname, 'diagnostics.html'));
});

app.get("/api/admin/database/diagnose", async (req, res) => {
  try {
    // Basic diagnostic information
    const currentDate = new Date();
    const twoWeeksAgo = new Date(currentDate);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    // Use Promise.allSettled to handle potential errors gracefully
    const diagnosticPromises = [
      Event.countDocuments().catch(() => 0),
      Event.countDocuments({ date: { $gte: twoWeeksAgo } }).catch(() => 0),
      Event.countDocuments({ date: { $lt: twoWeeksAgo } }).catch(() => 0),
      Event.countDocuments({ imageSource: { $exists: true, $ne: null } }).catch(() => 0),
      Event.countDocuments({ imageSource: "scraped" }).catch(() => 0),
      Event.aggregate([
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).catch(() => []),
      Event.aggregate([
        {
          $group: {
            _id: null,
            minDate: { $min: "$date" },
            maxDate: { $max: "$date" }
          }
        }
      ]).catch(() => [])
    ];
    
    const [
      totalEvents,
      recentEvents, 
      oldEvents,
      enhancedEvents,
      scrapedImages,
      sourceStats,
      dateRange
    ] = await Promise.allSettled(diagnosticPromises);
    
    const diagnostics = {
      timestamp: currentDate.toISOString(),
      cutoffDate: twoWeeksAgo.toISOString(),
      totals: {
        totalEvents: totalEvents.status === 'fulfilled' ? totalEvents.value : 0,
        recentEvents: recentEvents.status === 'fulfilled' ? recentEvents.value : 0,
        oldEvents: oldEvents.status === 'fulfilled' ? oldEvents.value : 0,
        enhancedEvents: enhancedEvents.status === 'fulfilled' ? enhancedEvents.value : 0,
        scrapedImages: scrapedImages.status === 'fulfilled' ? scrapedImages.value : 0
      },
      sourceBreakdown: sourceStats.status === 'fulfilled' ? sourceStats.value : [],
      dateRange: dateRange.status === 'fulfilled' && dateRange.value.length > 0 ? {
        min: dateRange.value[0].minDate?.toISOString(),
        max: dateRange.value[0].maxDate?.toISOString()
      } : null,
      status: (oldEvents.status === 'fulfilled' && oldEvents.value > 0) ? "CLEANUP_NEEDED" : "CLEAN"
    };
    
    res.json(diagnostics);
    
  } catch (err) {
    console.error("Database diagnostics error:", err);
    res.status(500).json({ error: "Failed to run diagnostics", details: err.message });
  }
});

app.post("/api/admin/database/cleanup", async (req, res) => {
  try {
    console.log("Starting database cleanup...");
    
    // Calculate cutoff date (2 weeks ago from current date)
    const currentDate = new Date();
    const cutoffDate = new Date(currentDate);
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    
    console.log(`Cutoff Date: ${cutoffDate.toISOString().split('T')[0]}`);
    
    // Get counts before cleanup
    const totalBefore = await Event.countDocuments();
    const recentBefore = await Event.countDocuments({ 
      date: { $gte: cutoffDate }
    });
    const oldEvents = await Event.countDocuments({ 
      date: { $lt: cutoffDate }
    });
    
    console.log(`Before cleanup: Total=${totalBefore}, Recent=${recentBefore}, Old=${oldEvents}`);
    
    let deletedCount = 0;
    if (oldEvents > 0) {
      // Execute deletion
      console.log(`Deleting ${oldEvents} old events...`);
      const deleteResult = await Event.deleteMany({ 
        date: { $lt: cutoffDate }
      });
      deletedCount = deleteResult.deletedCount;
      console.log(`Successfully deleted ${deletedCount} events`);
    }
    
    // Get final counts
    const totalAfter = await Event.countDocuments();
    const enhancedEvents = await Event.countDocuments({
      imageSource: { $exists: true, $ne: null }
    });
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      deletedCount: deletedCount,
      totalAfter: totalAfter,
      enhancedEvents: enhancedEvents
    };
    
    console.log("Cleanup completed:", result);
    res.json(result);
    
  } catch (err) {
    console.error("Database cleanup error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to cleanup database",
      details: err.message 
    });
  }
});

// ⭐ MANUAL SCRAPER TRIGGERS
app.post("/api/admin/scrape/all", async (req, res) => {
  try {
    console.log("🚀 Manual scraping trigger - ALL scrapers");
    
    const results = {
      timestamp: new Date().toISOString(),
      scrapers: []
    };
    
    // Try to run each scraper
    const scrapers = [
      { name: "NashvilleScene", path: "./scraping/scrapeSceneCalendar" },
      { name: "VisitMusicCity", path: "./scraping/scrapeVisitMusicCity" },
      { name: "Do615", path: "./scraping/scrapeNashvilleScene" } // Note: this file actually contains scrapeDo615
    ];
    
    for (const scraper of scrapers) {
      try {
        console.log(`🔄 Running ${scraper.name} scraper...`);
        const scraperModule = require(scraper.path);
        
        if (typeof scraperModule === 'function') {
          await scraperModule();
        } else if (scraperModule.default) {
          await scraperModule.default();
        }
        
        results.scrapers.push({ 
          name: scraper.name, 
          status: "success",
          message: "Completed successfully"
        });
        console.log(`✅ ${scraper.name} completed`);
        
      } catch (scraperErr) {
        console.error(`❌ ${scraper.name} failed:`, scraperErr.message);
        results.scrapers.push({ 
          name: scraper.name, 
          status: "error",
          message: scraperErr.message
        });
      }
    }
    
    const successCount = results.scrapers.filter(s => s.status === 'success').length;
    
    res.json({
      success: successCount > 0,
      message: `${successCount}/${scrapers.length} scrapers completed successfully`,
      ...results
    });
    
  } catch (err) {
    console.error("Manual scraping trigger error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to trigger scrapers",
      details: err.message 
    });
  }
});

// ⭐ TEST EVENT CREATION ENDPOINT
app.post("/api/admin/test/create-events", async (req, res) => {
  try {
    console.log("🧪 Creating test events to verify database functionality");
    
    // Clean up any existing test events first
    await Event.deleteMany({ source: "test" });
    console.log("🧹 Cleaned up existing test events");
    
    const timestamp = Date.now();
    
    // Create test events with enhanced images
    const testEvents = [
      {
        title: "Test Concert - Enhanced Images",
        description: "Test event to verify enhanced image processing",
        date: new Date(Date.now() + 86400000), // Tomorrow
        location: "The Ryman Auditorium, Nashville, TN",
        image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&auto=format",
        imageSource: "scraped",
        imageQuality: "high",
        imageProcessedAt: new Date(),
        source: "test",
        genre: "Rock",
        musicType: "concert",
        venue: "The Ryman Auditorium",
        url: `https://test-event-1-${timestamp}.example.com`,
        normalizedTitle: "test concert enhanced images",
        createdBy: null
      },
      {
        title: "Nashville Jazz Night - Premium",
        description: "Test jazz event with enhanced image processing",
        date: new Date(Date.now() + 172800000), // Day after tomorrow
        location: "Printer's Alley, Nashville, TN",
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=240&fit=crop&auto=format",
        imageSource: "scraped",
        imageQuality: "high",
        imageProcessedAt: new Date(),
        source: "test",
        genre: "Jazz",
        musicType: "concert",
        venue: "Printer's Alley",
        url: `https://test-event-2-${timestamp}.example.com`,
        normalizedTitle: "nashville jazz night premium",
        createdBy: null
      },
      {
        title: "Country Showcase at Bluebird Cafe",
        description: "Test country event with fallback image processing",
        date: new Date(Date.now() + 259200000), // 3 days from now
        location: "Bluebird Cafe, Nashville, TN",
        image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=240&fit=crop&auto=format",
        imageSource: "generated",
        imageQuality: "medium",
        imageProcessedAt: new Date(),
        source: "test",
        genre: "Country",
        musicType: "acoustic",
        venue: "Bluebird Cafe",
        url: `https://test-event-3-${timestamp}.example.com`,
        normalizedTitle: "country showcase bluebird cafe",
        createdBy: null
      }
    ];
    
    console.log(`📝 Attempting to create ${testEvents.length} test events...`);
    
    // Insert test events
    const insertResult = await Event.insertMany(testEvents, { ordered: false });
    console.log(`✅ Successfully created ${insertResult.length} test events`);
    
    // Verify they were saved
    const totalEvents = await Event.countDocuments();
    const recentEvents = await Event.countDocuments({ 
      date: { $gte: new Date() }
    });
    const enhancedEvents = await Event.countDocuments({
      imageSource: { $exists: true, $ne: null }
    });
    
    res.json({
      success: true,
      message: `Successfully created ${insertResult.length} test events`,
      details: {
        created: insertResult.length,
        totalEvents: totalEvents,
        futureEvents: recentEvents,
        enhancedEvents: enhancedEvents
      },
      events: insertResult.map(e => ({
        id: e._id,
        title: e.title,
        date: e.date,
        source: e.source,
        imageSource: e.imageSource,
        imageQuality: e.imageQuality
      }))
    });
    
  } catch (error) {
    console.error("❌ Test event creation failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create test events",
      details: error.message,
      errorCode: error.code
    });
  }
});

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

// ⭐ GET CURRENT EVENTS (LAST 2 WEEKS) WITH ENHANCED FILTERING
app.get("/api/events/current", async (req, res) => {
  try {
    // Show events from 2 weeks ago to 3 months forward (more permissive than original)
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 14); // 2 weeks ago
    
    const endDate = new Date(now);
    endDate.setMonth(now.getMonth() + 3); // 3 months forward
    
    console.log('🔍 FETCHING EVENTS: Date range', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    
    let query = {
      $or: [
        { date: { $gte: startDate, $lte: endDate } },
        { date: null }, // Include events without dates
        { date: { $exists: false } } // Include events where date field doesn't exist
      ]
    };
    
    console.log('🔍 Query being executed:', JSON.stringify(query, null, 2));
    
    let events = await Event.find(query)
      .populate("createdBy", "username email")
      .lean()
      .exec()
      .catch(() => []); // Graceful fallback
    
    console.log('📊 Events found in database:', events.length);
    if (events.length > 0) {
      console.log('📋 Sample events from database:');
      events.slice(0, 5).forEach(e => {
        console.log(`  - ${e.title} (${e.source}, Date: ${e.date ? new Date(e.date).toISOString().split('T')[0] : 'NO DATE'})`);
      });
      
      // Show source breakdown
      const sources = {};
      events.forEach(e => {
        sources[e.source] = (sources[e.source] || 0) + 1;
      });
      console.log('📊 Source breakdown:', sources);
    } else {
      console.log('❌ NO EVENTS FOUND IN DATABASE AT ALL!');
    }

    // Get RSVP counts with error handling
    const rsvpCounts = await Rsvp.aggregate([
      { $group: { _id: "$event", count: { $sum: 1 } } }
    ]).catch(() => []);
    
    const rsvpMap = rsvpCounts.reduce((m, c) => {
      if (c._id) m[String(c._id)] = c.count;
      return m;
    }, {});

    // Get comment counts with error handling
    const commentCounts = await Comment.aggregate([
      { $group: { _id: "$event", count: { $sum: 1 } } }
    ]).catch(() => []);
    
    const commentMap = commentCounts.reduce((m, c) => {
      if (c._id) m[String(c._id)] = c.count;
      return m;
    }, {});

    // Enhanced sorting: prioritize scraped events, then by date
    events = events
      .map((ev) => ({
        ...ev,
        date: ev.date ? new Date(ev.date).toISOString() : null,
        rsvpCount: rsvpMap[String(ev._id)] || 0,
        commentCount: commentMap[String(ev._id)] || 0
      }))
      .sort((a, b) => {
        // First, prioritize scraped events (do615, nashvillescene, etc.)
        const aIsScraped = ['do615', 'nashvillescene', 'visitmusiccity'].includes(a.source);
        const bIsScraped = ['do615', 'nashvillescene', 'visitmusiccity'].includes(b.source);
        if (aIsScraped && !bIsScraped) return -1;
        if (!aIsScraped && bIsScraped) return 1;
        
        // Then prioritize events with scraped images
        const aHasScraped = a.imageSource === 'scraped';
        const bHasScraped = b.imageSource === 'scraped';
        if (aHasScraped && !bHasScraped) return -1;
        if (!aHasScraped && bHasScraped) return 1;
        
        // Finally sort by date (ascending - soonest first)
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateA - dateB;
      })
      .slice(0, 50); // Limit to 50 events for performance

    console.log('📊 Events after sorting, before final response:', events.length);
    console.log('🎯 Final events being returned:', events.slice(0, 3).map(e => `${e.title} (${e.source})`));

    res.json(events);

  } catch (err) {
    console.error("Current events API error:", err);
    res.status(500).json({ error: "Failed to fetch current events", details: err.message });
  }
});

// ⭐ DEBUG ENDPOINT - Check what events exist in database
app.get("/api/debug/events", async (req, res) => {
  try {
    console.log("🔍 Debug: Checking events in database...");
    
    const totalCount = await Event.countDocuments();
    console.log(`Total events in database: ${totalCount}`);
    
    const recentCount = await Event.countDocuments({
      date: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
    });
    console.log(`Recent events (last 2 weeks): ${recentCount}`);
    
    const sampleEvents = await Event.find({}).select("title date source").limit(10);
    console.log("Sample events:", sampleEvents);
    
    res.json({
      total: totalCount,
      recent: recentCount,
      sample: sampleEvents,
      debug: "Database connection working"
    });
  } catch (err) {
    console.error("Debug endpoint error:", err);
    res.status(500).json({ 
      error: "Database connection failed", 
      details: err.message,
      debug: "Check MongoDB connection" 
    });
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

    // Check if we have mongoUser from auth middleware (preferred)
    if (req.user?.mongoUser) {
      user = req.user.mongoUser.toObject ? req.user.mongoUser.toObject() : req.user.mongoUser;
      delete user.password;
    } else {
      // Fallback: look up by user ID (should be MongoDB ObjectId now)
      if (mongoose.Types.ObjectId.isValid(authUserId)) {
        user = await User.findById(authUserId)
          .select("-password")
          .lean()
          .exec();
      } else {
        // Legacy: might be Auth0 ID, try auth0Id lookup
        user = await User.findOne({ auth0Id: authUserId })
          .select("-password")
          .lean()
          .exec();
      }
    }

    if (!user) {
      return res.status(404).json({ 
        error: "User profile not found. Please try signing out and back in." 
      });
    }

    // Add profile completion status
    const profileComplete = !!(user.year && user.major);
    
    res.json({
      ...user,
      profileComplete
    });

  } catch (err) {
    console.error('Error in /api/me:', err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Update user profile (for Auth0 users to complete their profiles)
app.put("/api/me/profile", auth, async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) return res.status(401).json({ error: "Unauthorized" });

    const { year, major, username, email } = req.body;

    // Validate required fields
    if (!year || !major) {
      return res.status(400).json({ 
        error: "INCOMPLETE_PROFILE_DATA",
        message: "Both year and major are required to complete profile",
        missing: {
          year: !year,
          major: !major
        }
      });
    }

    let user;

    // Prefer mongoUser from auth middleware (most reliable for Auth0 users)
    if (req.user?.mongoUser) {
      user = req.user.mongoUser;
    } else if (authUserId.startsWith('auth0|') || authUserId.includes('|')) {
      // Auth0 ID - lookup by auth0Id
      user = await User.findOne({ auth0Id: authUserId });
    } else {
      // Direct MongoDB ObjectId lookup
      user = await User.findById(authUserId);
    }

    if (!user) {
      return res.status(404).json({ 
        error: "USER_NOT_FOUND",
        message: "User account not found",
        action: "re-authenticate"
      });
    }

    // Update profile fields and mark as complete
    const previouslyComplete = user.year && user.major;
    user.year = year;
    user.major = major;
    
    // Update username if provided and valid
    if (username && username.trim() && username !== user.username) {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
      if (cleanUsername.length >= 2) {
        // Check if username is available
        const existingUser = await User.findOne({ username: cleanUsername, _id: { $ne: user._id } });
        if (existingUser) {
          return res.status(400).json({
            error: "USERNAME_TAKEN",
            message: "Username already taken. Please choose another."
          });
        }
        user.username = cleanUsername;
      }
    }
    
    // Update email if provided and valid
    if (email && email.trim() && email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          error: "INVALID_EMAIL",
          message: "Please enter a valid email address."
        });
      }
      user.email = email.trim().toLowerCase();
    }

    await user.save();
    
    const nowComplete = user.year && user.major;
    const justCompleted = !previouslyComplete && nowComplete;

    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;
    
    res.json({
      message: justCompleted ? "Profile successfully completed!" : "Profile updated successfully",
      user: updatedUser,
      profileComplete: nowComplete,
      justCompleted: justCompleted
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Delete user account (with automatic cleanup of old accounts)
app.delete("/api/me/account", auth, async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) return res.status(401).json({ error: "Unauthorized" });

    let user;

    // Get the user record
    if (req.user?.mongoUser) {
      user = req.user.mongoUser;
    } else {
      if (mongoose.Types.ObjectId.isValid(authUserId)) {
        user = await User.findById(authUserId);
      } else {
        user = await User.findOne({ auth0Id: authUserId });
      }
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`Deleting account for user: ${user.username} (${user.email})`);

    // First, clean up any old/legacy accounts with the same email
    const userEmail = user.email;
    const allAccountsWithEmail = await User.find({ email: userEmail });
    console.log(`Found ${allAccountsWithEmail.length} total accounts with email ${userEmail}`);

    let cleanedUpCount = 0;
    for (const account of allAccountsWithEmail) {
      // Delete all RSVPs first
      await Rsvp.deleteMany({ user: account._id });
      console.log(`Deleted RSVPs for account: ${account._id}`);

      // Delete the account
      await User.findByIdAndDelete(account._id);
      console.log(`Deleted account: ${account._id}`);
      cleanedUpCount++;
    }

    console.log(`Deleted ${cleanedUpCount} accounts (including legacy) for email: ${userEmail}`);

    res.json({ 
      message: "Account successfully deleted along with any old account data. You have been completely removed from the system." 
    });

  } catch (err) {
    console.error('Error deleting account:', err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// Force cleanup legacy accounts that conflict with Auth0
app.post('/api/cleanup-legacy', auth, async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser || !authUser.email) {
      return res.status(401).json({ 
        error: 'Missing Authorization header',
        details: 'Authentication required for legacy cleanup. Try emergency cleanup instead.'
      });
    }
    
    const userEmail = authUser.email;
    
    console.log('🧹 Cleaning up legacy accounts for email:', userEmail);
    
    // Find all accounts with this email
    const allAccounts = await User.find({ email: userEmail });
    console.log(`Found ${allAccounts.length} accounts with email ${userEmail}`);
    
    // Keep only the Auth0 account, delete others
    const accountsToDelete = allAccounts.filter(account => 
      !account.auth0Id || account.auth0Id !== authUser.auth0Id
    );
    
    for (const account of accountsToDelete) {
      console.log(`🗑️ Deleting legacy account: ${account._id}`);
      // First delete associated RSVPs
      await Rsvp.deleteMany({ user: account._id });
      // Then delete the account
      await User.deleteOne({ _id: account._id });
    }
    
    console.log(`✅ Cleaned up ${accountsToDelete.length} legacy accounts`);
    res.json({ 
      message: 'Legacy accounts cleaned up successfully',
      deletedAccounts: accountsToDelete.length
    });
  } catch (error) {
    console.error('❌ Legacy cleanup error:', error);
    res.status(500).json({ 
      error: 'Failed to clean up legacy accounts', 
      details: error.message 
    });
  }
});

// Emergency cleanup endpoint - more permissive for severely broken accounts
app.post('/api/emergency-cleanup', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    console.log('🚨 Emergency cleanup for email:', email);
    
    // Find all accounts with this email
    const allAccounts = await User.find({ email: email });
    console.log(`Found ${allAccounts.length} accounts with email ${email}`);
    
    // Delete all accounts (emergency mode)
    let deletedCount = 0;
    for (const account of allAccounts) {
      console.log(`🗑️ Emergency deleting account: ${account._id}`);
      await Rsvp.deleteMany({ user: account._id });
      await User.deleteOne({ _id: account._id });
      deletedCount++;
    }
    
    console.log(`✅ Emergency cleanup completed: ${deletedCount} accounts removed`);
    res.json({ 
      message: 'Emergency cleanup completed successfully',
      deletedAccounts: deletedCount
    });
  } catch (error) {
    console.error('❌ Emergency cleanup error:', error);
    res.status(500).json({ 
      error: 'Failed to perform emergency cleanup', 
      details: error.message 
    });
  }
});

// RSVPs for current user
app.get("/api/me/rsvps", auth, async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) return res.status(401).json({ error: "Unauthorized" });

    let userId = authUserId;

    // Use mongoUser from auth middleware if available (preferred)
    if (req.user?.mongoUser) {
      userId = req.user.mongoUser._id;
    } else {
      // Fallback: look up by user ID (should be MongoDB ObjectId now)
      if (mongoose.Types.ObjectId.isValid(authUserId)) {
        userId = authUserId;
      } else {
        // Legacy: might be Auth0 ID, try auth0Id lookup
        const user = await User.findOne({ auth0Id: authUserId });
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        userId = user._id;
      }
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

      // Use mongoUser from auth middleware if available (preferred for Auth0)
      if (req.user?.mongoUser) {
        foundUser = req.user.mongoUser;
        userId = foundUser._id;
      } else {
        // Fallback: look up by user ID
        if (mongoose.Types.ObjectId.isValid(authUserId)) {
          foundUser = await User.findById(authUserId).select("_id username email year major");
        } else {
          // Auth0 ID lookup
          foundUser = await User.findOne({ auth0Id: authUserId }).select("_id username email year major");
          if (foundUser) {
            userId = foundUser._id;
          }
        }
      }

      if (!foundUser) {
        return res.status(404).json({ 
          error: "USER_PROFILE_NOT_FOUND",
          message: "User profile not found. Please sign out and back in.",
          action: "re-authenticate"
        });
      }
      
      // Optional profile completion check - allow RSVPs but encourage profile completion
      const hasIncompleteProfile = !foundUser.year || !foundUser.major;
      if (hasIncompleteProfile && req.user?.auth0Id) {
        console.log(`Auth0 user ${foundUser.username} RSVPing with incomplete profile - reminding to complete later`);
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
