// api/debug/events.js - Debug endpoint for checking database state
const mongoose = require('../../server/mongoose');
const Event = require('../../server/models/Event');

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) return;
  
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error("❌ Missing MONGO_URI environment variable");
  }
  
  await mongoose.connect(MONGO_URI, { dbName: "mymusiccity" });
  isConnected = true;
  console.log("✅ Connected to MongoDB Atlas");
}

export default async function handler(req, res) {
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
    await connectToDatabase();
    
    console.log("🔍 Debug: Checking events in database...");
    
    const totalCount = await Event.countDocuments();
    console.log(`Total events in database: ${totalCount}`);
    
    const recentCount = await Event.countDocuments({
      date: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
    });
    console.log(`Recent events (last 2 weeks): ${recentCount}`);
    
    const sampleEvents = await Event.find({}).select("title date source createdAt").sort({createdAt: -1}).limit(10);
    console.log("Sample events:", sampleEvents);
    
    const sourceBreakdown = await Event.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      total: totalCount,
      recent: recentCount,
      sample: sampleEvents.map(e => ({
        title: e.title,
        source: e.source,
        date: e.date,
        createdAt: e.createdAt
      })),
      sourceBreakdown: sourceBreakdown,
      debug: "Database connection working - Vercel serverless function"
    });
  } catch (err) {
    console.error("Debug endpoint error:", err);
    res.status(500).json({ 
      error: "Database connection failed", 
      details: err.message,
      debug: "Check MongoDB connection - Vercel serverless function" 
    });
  }
}