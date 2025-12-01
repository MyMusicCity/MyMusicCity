// Manual scraper trigger with debugging
require('dotenv').config();

const mongoose = require('./server/mongoose');
const Event = require('./server/models/Event');

// Set bypass mode for debugging
process.env.BYPASS_MUSIC_FILTER = 'true';

async function runScraperTest() {
  console.log('🔧 Manual scraper test with bypass mode enabled...');
  
  try {
    // Check initial state
    console.log('📊 Initial database state...');
    await mongoose.connection.once('open', () => console.log('✅ Database connected'));
    
    const initialCount = await Event.countDocuments();
    console.log(`Initial event count: ${initialCount}`);
    
    // Show recent events if any
    if (initialCount > 0) {
      const recent = await Event.find().sort({createdAt: -1}).limit(3);
      console.log('Recent events in DB:');
      recent.forEach(e => console.log(`  - ${e.title} (${e.source})`));
    }
    
    console.log('\n🚀 Starting scraper with BYPASS_MUSIC_FILTER=true...');
    
    // Import the scraper - this should execute it
    require('./server/scraping/scrapeNashvilleScene');
    
  } catch (error) {
    console.error('❌ Scraper test failed:', error);
    process.exit(1);
  }
  
  // Set timeout to check results
  setTimeout(async () => {
    try {
      const finalCount = await Event.countDocuments();
      console.log(`\n📊 Final event count: ${finalCount} (added: ${finalCount - initialCount})`);
      
      if (finalCount > initialCount) {
        console.log('✅ New events added!');
        const newest = await Event.find().sort({createdAt: -1}).limit(5);
        newest.forEach(e => console.log(`  + ${e.title} (${e.source})`));
      } else {
        console.log('❌ No new events added');
      }
      
      process.exit(0);
    } catch (err) {
      console.error('Final check failed:', err);
      process.exit(1);
    }
  }, 60000); // Wait 1 minute for scraper to complete
}

runScraperTest();