const path = require('path');
const mongoose = require('../mongoose');
const Event = require('../models/Event');
const { imageProcessor } = require('../utils/imageProcessor');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function migrateExistingEvents() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not found in .env file!');
    process.exit(1);
  }

  try {
    console.log('🎵 Starting Event Image Migration 🎵');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'mymusiccity' });

    // Find events that don't have enhanced image metadata
    const eventsToMigrate = await Event.find({
      $or: [
        { imageSource: { $exists: false } },
        { imageQuality: { $exists: false } },
        { imageProcessedAt: { $exists: false } }
      ]
    }).limit(100); // Process in batches to avoid overwhelming the system

    console.log(`Found ${eventsToMigrate.length} events to migrate`);

    if (eventsToMigrate.length === 0) {
      console.log('✅ No events need migration');
      return;
    }

    let processed = 0;
    let enhanced = 0;
    let failed = 0;

    for (const event of eventsToMigrate) {
      try {
        console.log(`Processing event: ${event.title}`);
        
        // Prepare event data for processing
        const eventData = {
          id: event._id.toString(),
          title: event.title,
          description: event.description,
          venue: event.location,
          date: event.date
        };

        let imageResult;
        
        // If event already has an image, validate and potentially enhance it
        if (event.image) {
          console.log(`  Validating existing image: ${event.image}`);
          imageResult = await imageProcessor.processEventImage(event.image, eventData, { useCache: true });
          
          if (imageResult.source === 'scraped') {
            enhanced++;
            console.log(`  ✅ Enhanced existing image`);
          } else {
            console.log(`  🔄 Replaced with fallback image`);
          }
        } else {
          // No existing image, generate contextual fallback
          console.log(`  Generating contextual fallback image`);
          imageResult = imageProcessor.getFallbackResult(eventData);
        }

        // Update the event with enhanced image metadata
        await Event.updateOne(
          { _id: event._id },
          {
            $set: {
              image: imageResult.url,
              imageSource: imageResult.source,
              imageQuality: imageResult.quality,
              imageProcessedAt: new Date()
            }
          }
        );

        processed++;
        console.log(`  ✅ Updated event ${processed}/${eventsToMigrate.length}`);

        // Small delay to avoid overwhelming the system
        if (processed % 10 === 0) {
          console.log(`📊 Progress: ${processed}/${eventsToMigrate.length} processed, ${enhanced} enhanced, ${failed} failed`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        failed++;
        console.error(`  ❌ Failed to process event ${event.title}:`, error.message);
        
        // Still update with basic metadata to mark it as processed
        try {
          await Event.updateOne(
            { _id: event._id },
            {
              $set: {
                imageSource: event.image ? 'manual' : 'fallback',
                imageQuality: 'fallback',
                imageProcessedAt: new Date()
              }
            }
          );
        } catch (updateError) {
          console.error(`  ❌ Failed to update event metadata:`, updateError.message);
        }
      }
    }

    console.log('\n🎵 Migration Complete! 🎵');
    console.log(`📊 Final Results:`);
    console.log(`  - Total processed: ${processed}`);
    console.log(`  - Images enhanced: ${enhanced}`);
    console.log(`  - Fallbacks generated: ${processed - enhanced}`);
    console.log(`  - Failures: ${failed}`);
    console.log(`  - Cache stats: ${JSON.stringify(imageProcessor.getCacheStats())}`);

    // Check if there are more events to process
    const remainingEvents = await Event.countDocuments({
      $or: [
        { imageSource: { $exists: false } },
        { imageQuality: { $exists: false } },
        { imageProcessedAt: { $exists: false } }
      ]
    });

    if (remainingEvents > 0) {
      console.log(`\n⚠️  ${remainingEvents} events still need migration. Run this script again to continue.`);
    } else {
      console.log(`\n✅ All events have been migrated successfully!`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateExistingEvents().then(() => {
    console.log('Migration script finished.');
    process.exit(0);
  }).catch(error => {
    console.error('Migration script error:', error);
    process.exit(1);
  });
}

module.exports = { migrateExistingEvents };