const mongoose = require("./server/mongoose");
const Event = require("./server/models/Event");
require('dotenv').config();

async function diagnoseDatabase() {
    try {
        console.log("🔍 DATABASE DIAGNOSTIC - MyMusicCity Events");
        console.log("==========================================");
        
        await mongoose.connect(process.env.MONGO_URI, { dbName: 'mymusiccity' });
        
        // Total event count
        const totalEvents = await Event.countDocuments();
        console.log(`📊 Total events in database: ${totalEvents}`);
        
        // Events by source
        const sourceStats = await Event.aggregate([
            { $group: { _id: "$source", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log("\n📈 Events by source:");
        sourceStats.forEach(s => console.log(`  ${s._id || 'null'}: ${s.count}`));
        
        // Recent events (last 2 weeks from Nov 30, 2025)
        const currentDate = new Date("2025-11-30T00:00:00.000Z");
        const twoWeeksAgo = new Date(currentDate);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
        console.log(`\n📅 Date Analysis (Current: ${currentDate.toISOString().split('T')[0]})`);
        console.log(`📅 Cutoff Date: ${twoWeeksAgo.toISOString().split('T')[0]}`);
        
        const recentEvents = await Event.countDocuments({ 
            date: { $gte: twoWeeksAgo }
        });
        console.log(`✅ Events in last 2 weeks (keep): ${recentEvents}`);
        
        // Old events (older than 2 weeks)
        const oldEvents = await Event.countDocuments({ 
            date: { $lt: twoWeeksAgo }
        });
        console.log(`🗑️ Events older than 2 weeks (delete): ${oldEvents}`);
        
        // Enhanced image events
        const enhancedImageEvents = await Event.countDocuments({
            imageSource: { $exists: true }
        });
        console.log(`\n🎨 Events with enhanced images: ${enhancedImageEvents}`);
        
        const scrapedImages = await Event.countDocuments({
            imageSource: "scraped"
        });
        console.log(`📸 Events with scraped images: ${scrapedImages}`);
        
        const fallbackImages = await Event.countDocuments({
            imageSource: "generated"
        });
        console.log(`🎭 Events with generated fallback images: ${fallbackImages}`);
        
        // Sample of newest events
        console.log("\n🆕 === 5 NEWEST EVENTS ===");
        const newestEvents = await Event.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select("title date createdAt source imageSource imageQuality");
        
        newestEvents.forEach((e, i) => {
            const dateStr = e.date?.toISOString()?.split('T')[0] || 'No date';
            const createdStr = e.createdAt?.toISOString()?.split('T')[0] || 'No created';
            const imageInfo = e.imageSource ? `${e.imageSource}/${e.imageQuality}` : 'no-image-data';
            console.log(`  ${i+1}. ${e.title?.substring(0, 50) || 'Untitled'}`);
            console.log(`     Date: ${dateStr} | Created: ${createdStr}`);
            console.log(`     Source: ${e.source} | Image: ${imageInfo}`);
        });
        
        // Sample of oldest events that will be deleted
        console.log("\n🗑️ === 5 OLDEST EVENTS (TO BE DELETED) ===");
        const oldestEvents = await Event.find({ 
            date: { $lt: twoWeeksAgo }
        })
            .sort({ date: 1 })
            .limit(5)
            .select("title date createdAt source");
        
        if (oldestEvents.length > 0) {
            oldestEvents.forEach((e, i) => {
                const dateStr = e.date?.toISOString()?.split('T')[0] || 'No date';
                const createdStr = e.createdAt?.toISOString()?.split('T')[0] || 'No created';
                console.log(`  ${i+1}. ${e.title?.substring(0, 50) || 'Untitled'}`);
                console.log(`     Date: ${dateStr} | Created: ${createdStr} | Source: ${e.source}`);
            });
        } else {
            console.log("  No old events found to delete! ✅");
        }
        
        // Show date range of current events
        const dateRange = await Event.aggregate([
            {
                $group: {
                    _id: null,
                    minDate: { $min: "$date" },
                    maxDate: { $max: "$date" }
                }
            }
        ]);
        
        if (dateRange.length > 0) {
            const min = dateRange[0].minDate?.toISOString()?.split('T')[0] || 'N/A';
            const max = dateRange[0].maxDate?.toISOString()?.split('T')[0] || 'N/A';
            console.log(`\n📅 Event date range: ${min} to ${max}`);
        }
        
        console.log("\n🎯 ANALYSIS COMPLETE");
        console.log("==========================================");
        
    } catch (error) {
        console.error("❌ Diagnostic failed:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.");
    }
}

diagnoseDatabase();