const mongoose = require("./server/mongoose");
const Event = require("./server/models/Event");
require('dotenv').config();

async function cleanupOldEvents(dryRun = true) {
    try {
        console.log("🧹 EVENT CLEANUP SCRIPT");
        console.log("========================");
        
        await mongoose.connect(process.env.MONGO_URI, { dbName: 'mymusiccity' });
        
        // Calculate cutoff date (Nov 16, 2025 - 2 weeks before Nov 30, 2025)
        const currentDate = new Date("2025-11-30T00:00:00.000Z");
        const cutoffDate = new Date(currentDate);
        cutoffDate.setDate(cutoffDate.getDate() - 14);
        
        console.log(`📅 Current Date: ${currentDate.toISOString().split('T')[0]}`);
        console.log(`📅 Cutoff Date: ${cutoffDate.toISOString().split('T')[0]}`);
        console.log(`🗑️ Will delete events older than: ${cutoffDate.toISOString()}`);
        
        // Find events to delete
        const eventsToDelete = await Event.find({ 
            date: { $lt: cutoffDate }
        }).select("title date source createdAt imageSource").sort({ date: 1 });
        
        console.log(`\n🔍 Found ${eventsToDelete.length} events older than cutoff date`);
        
        if (eventsToDelete.length > 0) {
            // Show breakdown by source
            const sourceBreakdown = {};
            eventsToDelete.forEach(e => {
                sourceBreakdown[e.source || 'unknown'] = (sourceBreakdown[e.source || 'unknown'] || 0) + 1;
            });
            
            console.log("\n📊 Events to delete by source:");
            Object.entries(sourceBreakdown).forEach(([source, count]) => {
                console.log(`  ${source}: ${count}`);
            });
            
            // Show sample events to be deleted
            console.log("\n📝 Sample events to be deleted (first 10):");
            eventsToDelete.slice(0, 10).forEach((e, i) => {
                const dateStr = e.date?.toISOString()?.split('T')[0] || 'No date';
                const imageInfo = e.imageSource || 'no-image-data';
                console.log(`  ${i+1}. ${e.title?.substring(0, 40) || 'Untitled'} | ${dateStr} | ${e.source} | ${imageInfo}`);
            });
            
            if (eventsToDelete.length > 10) {
                console.log(`  ... and ${eventsToDelete.length - 10} more events`);
            }
            
            if (!dryRun) {
                console.log("\n🗑️ EXECUTING DELETION...");
                
                // Store IDs for potential rollback
                const deletedIds = eventsToDelete.map(e => e._id);
                console.log(`💾 Storing ${deletedIds.length} event IDs for potential rollback`);
                
                // Execute deletion in transaction for safety
                const session = await mongoose.startSession();
                try {
                    await session.withTransaction(async () => {
                        const result = await Event.deleteMany({ 
                            date: { $lt: cutoffDate }
                        }, { session });
                        console.log(`✅ Successfully deleted ${result.deletedCount} events`);
                    });
                } catch (deleteError) {
                    console.error(`❌ Deletion failed:`, deleteError);
                    throw deleteError;
                } finally {
                    await session.endSession();
                }
                
            } else {
                console.log("\n🔍 DRY RUN MODE - No events deleted");
                console.log("💡 Run with '--execute' flag to actually delete events:");
                console.log("   node cleanup-events.js --execute");
            }
        } else {
            console.log("\n✅ No old events found to delete!");
        }
        
        // Show final statistics
        const totalEvents = await Event.countDocuments();
        const recentEvents = await Event.countDocuments({ 
            date: { $gte: cutoffDate }
        });
        
        console.log(`\n📊 Current database state:`);
        console.log(`   Total events: ${totalEvents}`);
        console.log(`   Recent events (last 2 weeks): ${recentEvents}`);
        
        if (!dryRun && eventsToDelete.length > 0) {
            console.log(`   Events deleted: ${eventsToDelete.length}`);
            
            // Verify enhanced images are preserved
            const enhancedEvents = await Event.countDocuments({
                imageSource: { $exists: true }
            });
            console.log(`   Events with enhanced images: ${enhancedEvents}`);
        }
        
        console.log("\n🎯 CLEANUP COMPLETE");
        console.log("========================");
        
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.");
    }
}

// Check command line arguments
const dryRun = !process.argv.includes("--execute");
if (dryRun) {
    console.log("⚠️  Running in DRY RUN mode (no changes will be made)");
} else {
    console.log("🚨 LIVE MODE - Events will be permanently deleted!");
}

cleanupOldEvents(dryRun);