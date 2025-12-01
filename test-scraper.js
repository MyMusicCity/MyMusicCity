// Test scraper execution with debugging
require('dotenv').config();

const mongoose = require('./server/mongoose');
const Event = require('./server/models/Event');

async function testScraperFlow() {
  console.log('🔧 Testing scraper flow...');
  
  try {
    // 1. Check current database state
    console.log('📊 Checking current database state...');
    const currentCount = await Event.countDocuments();
    console.log(`Current events in database: ${currentCount}`);
    
    if (currentCount > 0) {
      const recent = await Event.find().sort({createdAt: -1}).limit(3).select('title source createdAt');
      console.log('Recent events:');
      recent.forEach(e => console.log(`  - ${e.title} (${e.source}) - ${e.createdAt}`));
    }
    
    // 2. Run scraper with bypass mode for debugging
    console.log('\n🚀 Testing scraper with bypass mode...');
    process.env.BYPASS_MUSIC_FILTER = 'true';
    
    // Import and run the scraper
    const scraper = require('./server/scraping/scrapeNashvilleScene');
    
    // Wait a bit for scraper to potentially complete
    setTimeout(async () => {
      console.log('\n📊 Checking database after scraper...');
      const newCount = await Event.countDocuments();
      console.log(`Events after scraping: ${newCount} (change: +${newCount - currentCount})`);
      
      if (newCount > currentCount) {
        const newest = await Event.find().sort({createdAt: -1}).limit(5).select('title source createdAt');
        console.log('Newest events:');
        newest.forEach(e => console.log(`  ✅ ${e.title} (${e.source})`));
      }
      
      process.exit(0);
    }, 30000); // Wait 30 seconds for scraper
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testScraperFlow();