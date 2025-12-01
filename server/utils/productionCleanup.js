// Production cleanup script that can be run on deployed server
// This can be executed via SSH or through a web endpoint

const Event = require("./models/Event");
const mongoose = require("./mongoose");

async function cleanupOldEventsProduction() {
    try {
        console.log("🧹 PRODUCTION EVENT CLEANUP");
        console.log("============================");
        
        // Calculate cutoff date (2 weeks ago from current date)
        const currentDate = new Date();
        const cutoffDate = new Date(currentDate);
        cutoffDate.setDate(cutoffDate.getDate() - 14);
        
        console.log(`📅 Current Date: ${currentDate.toISOString().split('T')[0]}`);
        console.log(`📅 Cutoff Date: ${cutoffDate.toISOString().split('T')[0]}`);
        
        // Get counts before cleanup
        const totalBefore = await Event.countDocuments();
        const recentBefore = await Event.countDocuments({ 
            date: { $gte: cutoffDate }
        });
        const oldEvents = await Event.countDocuments({ 
            date: { $lt: cutoffDate }
        });
        
        console.log(`\n📊 Before cleanup:`);
        console.log(`   Total events: ${totalBefore}`);
        console.log(`   Recent events (keep): ${recentBefore}`);
        console.log(`   Old events (delete): ${oldEvents}`);
        
        if (oldEvents > 0) {
            // Get sample of events to delete for verification
            const samplesToDelete = await Event.find({ 
                date: { $lt: cutoffDate }
            })
                .limit(5)
                .select("title date source")
                .sort({ date: 1 });
            
            console.log(`\n📝 Sample old events to delete:`);
            samplesToDelete.forEach((e, i) => {
                const dateStr = e.date?.toISOString()?.split('T')[0] || 'No date';
                console.log(`  ${i+1}. ${e.title?.substring(0, 40) || 'Untitled'} | ${dateStr} | ${e.source}`);
            });
            
            // Execute deletion
            console.log(`\n🗑️ Deleting ${oldEvents} old events...`);
            const deleteResult = await Event.deleteMany({ 
                date: { $lt: cutoffDate }
            });
            
            console.log(`✅ Successfully deleted ${deleteResult.deletedCount} events`);
        } else {
            console.log(`\n✅ No old events found to delete!`);
        }
        
        // Get final counts
        const totalAfter = await Event.countDocuments();
        const enhancedEvents = await Event.countDocuments({
            imageSource: { $exists: true, $ne: null }
        });
        
        console.log(`\n📊 After cleanup:`);
        console.log(`   Total events: ${totalAfter}`);
        console.log(`   Events with enhanced images: ${enhancedEvents}`);
        
        console.log(`\n🎯 CLEANUP COMPLETED SUCCESSFULLY`);
        return { 
            deletedCount: oldEvents,
            totalAfter: totalAfter,
            enhancedEvents: enhancedEvents
        };
        
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
        throw error;
    }
}

module.exports = { cleanupOldEventsProduction };