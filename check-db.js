// Check what's in production database
require('dotenv').config();
const mongoose = require('./server/mongoose');
const Event = require('./server/models/Event');

async function checkDatabase() {
  try {
    // Use the same MONGO_URI as production
    const MONGO_URI = process.env.MONGO_URI;
    console.log('Connecting to:', MONGO_URI?.substring(0, 50) + '...');
    
    await mongoose.connect(MONGO_URI, { dbName: "mymusiccity" });
    console.log('✅ Connected to production database');
    
    const totalCount = await Event.countDocuments();
    console.log('📊 Total events in database:', totalCount);
    
    // Get events by source
    const sourceBreakdown = await Event.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('📋 Events by source:');
    sourceBreakdown.forEach(s => {
      console.log(`  ${s._id}: ${s.count} events`);
    });
    
    // Get recent events
    const recentEvents = await Event.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title source date createdAt');
    
    console.log('\n📅 Most recent events:');
    recentEvents.forEach((event, i) => {
      const date = event.date ? new Date(event.date).toISOString().split('T')[0] : 'NO DATE';
      const created = event.createdAt ? new Date(event.createdAt).toISOString().split('T')[0] : 'NO CREATED';
      console.log(`  ${i+1}. ${event.title} (${event.source}) - Date: ${date}, Created: ${created}`);
    });
    
    // Check for today's events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = await Event.countDocuments({
      createdAt: { $gte: today }
    });
    console.log(`\n📅 Events created today: ${todayEvents}`);
    
    // Check date range filtering
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 14);
    const endDate = new Date(now);
    endDate.setMonth(now.getMonth() + 3);
    
    const inRangeCount = await Event.countDocuments({
      $or: [
        { date: { $gte: startDate, $lte: endDate } },
        { date: null },
        { date: { $exists: false } }
      ]
    });
    
    console.log(`\n📅 Events in API date range (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}): ${inRangeCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
}

checkDatabase();