// api/events/current.js - Vercel serverless function for current events
const mongoose = require('../../server/mongoose');
const Event = require('../../server/models/Event');
const Rsvp = require('../../server/models/Rsvp');
const Comment = require('../../server/models/Comment');

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) return;
  
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI environment variable not found in Vercel");
    console.log("Available env vars:", Object.keys(process.env).filter(k => k.includes('MONGO')));
    throw new Error("❌ Missing MONGO_URI environment variable");
  }
  
  // Don't override database name, use what's in the connection string
  await mongoose.connect(MONGO_URI);
  isConnected = true;
  console.log("✅ Connected to MongoDB Atlas");
}

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Starting events/current API call');
    await connectToDatabase();
    console.log('🔍 Database connected, querying events...');

    // Show events from 2 weeks ago to 3 months forward
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 14); // 2 weeks ago
    
    const endDate = new Date(now);
    endDate.setMonth(now.getMonth() + 3); // 3 months forward
    
    console.log('🔍 FETCHING EVENTS: Date range', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    
    // TEMPORARY: Expand date range to catch all events for debugging
    const debugStartDate = new Date('2020-01-01'); // Very old date
    const debugEndDate = new Date('2030-12-31');   // Very future date
    
    let query = {
      $or: [
        { date: { $gte: debugStartDate, $lte: debugEndDate } }, // Expanded range
        { date: null }, // Include events without dates
        { date: { $exists: false } } // Include events where date field doesn't exist
      ]
    };
    
    console.log('🔍 DEBUG: Using expanded date range for troubleshooting');
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

    console.log('🎯 Final events being returned:', events.slice(0, 3).map(e => `${e.title} (${e.source})`));

    res.json(events);

  } catch (err) {
    console.error("Current events API error:", err);
    res.status(500).json({ error: "Failed to fetch current events", details: err.message });
  }
};