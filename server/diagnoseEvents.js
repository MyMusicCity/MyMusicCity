require('dotenv').config({ path: '../.env' });
const mongoose = require('./mongoose');
const Event = require('./models/Event');

async function diagnoseEvents() {
  try {
    if (!process.env.MONGO_URI) {
      console.log('⚠️ MONGO_URI not found, using mock analysis');
      return;
    }

    await mongoose.connect(process.env.MONGO_URI, { dbName: 'mymusiccity' });
    
    console.log('📊 EVENT FILTERING DIAGNOSIS');
    console.log('================================');
    
    // Total events
    const totalEvents = await Event.countDocuments();
    console.log('Total events in database:', totalEvents);
    
    // Date analysis
    const today = new Date();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(today.getDate() - 14);
    
    console.log('\nDate filtering analysis:');
    console.log('Today:', today.toISOString().split('T')[0]);
    console.log('Two weeks ago:', twoWeeksAgo.toISOString().split('T')[0]);
    
    // Events by date range
    const futureEvents = await Event.countDocuments({
      date: { $gte: today }
    });
    console.log('Future events (from today):', futureEvents);
    
    const recentEvents = await Event.countDocuments({
      date: { $gte: twoWeeksAgo }
    });
    console.log('Recent events (last 2 weeks + future):', recentEvents);
    
    const pastEvents = await Event.countDocuments({
      date: { $lt: twoWeeksAgo }
    });
    console.log('Old events (before 2 weeks ago):', pastEvents);
    
    // Sample of recent events
    console.log('\n🎭 Sample of recent events:');
    const sampleEvents = await Event.find({
      date: { $gte: twoWeeksAgo }
    }).select('title date source imageSource').limit(10).sort({ date: 1 });
    
    sampleEvents.forEach((event, i) => {
      const eventDate = new Date(event.date);
      const daysDiff = Math.round((eventDate - today) / (1000 * 60 * 60 * 24));
      console.log(`${i+1}. ${event.title}`);
      console.log(`   Date: ${eventDate.toISOString().split('T')[0]} (${daysDiff > 0 ? '+' : ''}${daysDiff} days)`);
      console.log(`   Source: ${event.source}, Image: ${event.imageSource || 'none'}`);
    });
    
    console.log('\n🔍 Events with different image sources:');
    const imageStats = await Event.aggregate([
      { $match: { date: { $gte: twoWeeksAgo } } },
      { $group: { 
        _id: '$imageSource', 
        count: { $sum: 1 },
        examples: { $push: '$title' }
      }},
      { $sort: { count: -1 } }
    ]);
    
    imageStats.forEach(stat => {
      console.log(`${stat._id || 'none'}: ${stat.count} events`);
      console.log(`  Examples: ${stat.examples.slice(0, 3).join(', ')}`);
    });
    
  } catch (error) {
    console.error('Diagnosis failed:', error.message);
  } finally {
    process.exit(0);
  }
}

diagnoseEvents();