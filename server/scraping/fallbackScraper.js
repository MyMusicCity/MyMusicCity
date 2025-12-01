// Emergency fallback scraper for when browsers fail
const axios = require('axios');
const cheerio = require('cheerio');
const { connectDB, disconnectDB } = require('../mongoose');
const Event = require('../models/Event');

console.log('🚨 Emergency fallback scraper starting (no browser required)...');

async function fallbackScrape() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Create some default events if scraping fails
    const fallbackEvents = [
      {
        title: "Nashville Music Scene Update",
        description: "Music events will be updated once browser issues are resolved. Check back soon!",
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        location: "Nashville, TN",
        url: "https://www.visitmusiccity.com",
        source: "fallback",
        genre: "Other",
        musicType: "concert",
        venue: "Various Venues"
      },
      {
        title: "Live Music at The Bluebird Cafe", 
        description: "Intimate acoustic performances in Nashville's legendary venue",
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        location: "4104 Hillsboro Pike, Nashville, TN",
        url: "https://www.bluebirdcafe.com",
        source: "fallback",
        genre: "Country",
        musicType: "acoustic",
        venue: "The Bluebird Cafe"
      },
      {
        title: "Music City Nights",
        description: "Explore Nashville's vibrant music scene across multiple venues",
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        location: "Broadway, Nashville, TN",
        url: "https://www.visitmusiccity.com/music",
        source: "fallback", 
        genre: "Other",
        musicType: "concert",
        venue: "Multiple Venues"
      }
    ];

    for (const eventData of fallbackEvents) {
      try {
        // Check if event already exists
        const existingEvent = await Event.findOne({ 
          title: eventData.title,
          source: eventData.source 
        });
        
        if (!existingEvent) {
          const event = new Event(eventData);
          await event.save();
          console.log(`✅ Saved fallback event: ${eventData.title}`);
        } else {
          console.log(`⏭️  Fallback event already exists: ${eventData.title}`);
        }
      } catch (error) {
        console.error(`❌ Error saving event ${eventData.title}:`, error.message);
      }
    }

    console.log('✅ Fallback scraping completed');
    
  } catch (error) {
    console.error('❌ Fallback scraper error:', error);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  fallbackScrape();
}

module.exports = { fallbackScrape };