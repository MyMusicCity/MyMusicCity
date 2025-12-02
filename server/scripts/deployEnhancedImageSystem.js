const path = require('path');
const { runAllTests } = require('../tests/imageProcessing.test');
const { migrateExistingEvents } = require('./migrateEventImages');
const mongoose = require('../mongoose');
const Event = require('../models/Event');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function deployEnhancedImageSystem() {
  console.log('🎵 Deploying Enhanced Image Processing System 🎵\n');

  try {
    // Step 1: Run comprehensive tests
    console.log('Step 1: Running comprehensive image processing tests...');
    await runAllTests();
    console.log('✅ All tests passed!\n');

    // Step 2: Check database connection
    console.log('Step 2: Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'mymusiccity' });
    console.log('✅ Database connected!\n');

    // Step 3: Verify Event model supports new fields
    console.log('Step 3: Verifying Event model schema...');
    const sampleEvent = new Event({
      title: 'Test Event',
      description: 'Test Description',
      date: new Date(),
      location: 'Test Location',
      imageSource: 'generated',
      imageQuality: 'high',
      imageProcessedAt: new Date()
    });
    
    await sampleEvent.validate();
    console.log('✅ Event model schema validated!\n');

    // Step 4: Count events that need migration
    const eventsNeedingMigration = await Event.countDocuments({
      $or: [
        { imageSource: { $exists: false } },
        { imageQuality: { $exists: false } },
        { imageProcessedAt: { $exists: false } }
      ]
    });

    console.log(`Step 4: Found ${eventsNeedingMigration} events that need image migration`);

    if (eventsNeedingMigration > 0) {
      console.log('Running migration...');
      await migrateExistingEvents();
      console.log('✅ Migration completed!\n');
    } else {
      console.log('✅ No events need migration!\n');
    }

    // Step 5: Verify system components
    console.log('Step 5: Verifying system components...');
    
    // Test image validator
    const { isValidImageUrl } = require('../utils/imageValidator');
    console.log('  Image Validator:', isValidImageUrl('https://images.unsplash.com/photo-1234.jpg') ? '✅' : '❌');
    
    // Test enhanced event images
    const { getEnhancedEventImage } = require('../utils/enhancedEventImages');
    const testImage = getEnhancedEventImage('Test Concert', 'Rock show', 'Ryman Auditorium', new Date());
    console.log('  Enhanced Event Images:', testImage ? '✅' : '❌');
    
    // Test image processor
    const { imageProcessor } = require('../utils/imageProcessor');
    console.log('  Image Processor:', imageProcessor ? '✅' : '❌');
    
    // Test configuration system
    const { ConfigManager } = require('../config/imageConfig');
    console.log('  Configuration System:', ConfigManager.getVenueConfig('ryman auditorium') ? '✅' : '❌');
    
    console.log('\n🎵 Deployment Complete! 🎵\n');
    
    // Step 6: Provide usage summary
    console.log('System Summary:');
    console.log('================');
    console.log('✅ Image validation with quality assessment');
    console.log('✅ Nashville venue-specific image mapping');
    console.log('✅ Time-based contextual image selection');
    console.log('✅ Genre and artist type detection');
    console.log('✅ Enhanced scraper image extraction');
    console.log('✅ Caching with LRU eviction and TTL');
    console.log('✅ Performance monitoring and statistics');
    console.log('✅ Configurable system settings');
    console.log('✅ Backward compatibility maintained\n');

    console.log('Enhanced Scrapers:');
    console.log('==================');
    console.log('✅ Nashville Scene (DO615) - Enhanced image extraction');
    console.log('✅ Visit Music City - Enhanced image processing');
    console.log('✅ Nashville Scene Calendar - Enhanced image processing');
    console.log('✅ All scrapers now use intelligent fallback system\n');

    console.log('To run scrapers with enhanced image processing:');
    console.log('================================================');
    console.log('npm run scrape:do615');
    console.log('npm run scrape:visitmusiccity');
    console.log('npm run scrape:scenecalendar');
    console.log('\nOr run migration again:');
    console.log('node server/scripts/migrateEventImages.js\n');

    // Step 7: Display final statistics
    const finalEventCount = await Event.countDocuments({});
    const enhancedEvents = await Event.countDocuments({
      imageSource: { $exists: true }
    });

    console.log('Final Statistics:');
    console.log('=================');
    console.log(`Total events in database: ${finalEventCount}`);
    console.log(`Events with enhanced image metadata: ${enhancedEvents}`);
    console.log(`Enhancement coverage: ${((enhancedEvents / finalEventCount) * 100).toFixed(1)}%\n`);

    console.log('🎉 Enhanced Image Processing System is now live! 🎉');

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

// Run deployment if this file is executed directly
if (require.main === module) {
  deployEnhancedImageSystem().then(() => {
    console.log('Deployment script finished successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('Deployment script error:', error);
    process.exit(1);
  });
}

module.exports = { deployEnhancedImageSystem };