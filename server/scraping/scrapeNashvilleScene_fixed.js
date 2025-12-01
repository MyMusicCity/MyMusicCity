const puppeteer = require("puppeteer");
const { chromium } = require("playwright");
const Event = require("../models/Event");
const normalizeTitle = require("../utils/normalizeTitle");
const enhancedImageProcessor = require("../utils/enhancedEventImages");
const crypto = require('crypto');

async function scrapeNashvilleScene() {
  let browser;
  const shouldCloseConnection = !global.mongoConnection;

  try {
    console.log("🔧 Browser Installation Script Starting...");

    // Load environment
    require('dotenv').config();

    console.log("🔧 Scraping config: timeout=120000ms, waitUntil=networkidle, retries=1");

    // Connect to MongoDB
    const mongoose = require('../mongoose');
    console.log('MongoDB connection state:', mongoose.connection.readyState, '(disconnected)');
    console.log('Connecting to MongoDB...');

    console.log('Launching Puppeteer...');
    console.log('Starting enhanced browser launch sequence...');

    try {
      console.log('Attempting Playwright Chromium launch...');
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote']
      });
      console.log('✅ Playwright Chromium launched successfully!');
    } catch (err) {
      console.error('❌ Playwright failed:', err.message);
      throw err;
    }

    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('Navigating to https://do615.com/events ...');
    await page.goto("https://do615.com/events", { waitUntil: "networkidle", timeout: 60000 });

    console.log('Extracting event data...');
    const events = await page.evaluate(() => {
      const eventElements = document.querySelectorAll(".ds-listing-event");
      
      return Array.from(eventElements).map((el, index) => {
        const title = el.querySelector(".ds-listing-event-title")?.textContent?.trim() || "Untitled Event";
        const timeText = el.querySelector(".ds-listing-event-calendar-date-day, .ds-listing-event-time")?.textContent?.trim() || "";
        const location = el.querySelector(".ds-listing-event-venue")?.textContent?.trim() || "";
        
        const images = [];
        const imgElements = el.querySelectorAll('img');
        imgElements.forEach(img => {
          if (img.src && img.src.includes('http')) {
            images.push(img.src);
          }
        });

        const url = el.querySelector(".ds-listing-event-title")?.href || null;

        return {
          title,
          dateText: timeText,
          location,
          images: [...new Set(images)], // Remove duplicates
          url,
          eventIndex: index
        };
      });
    });

    console.log(`🪄 Found ${events.length} events`);

    if (events.length === 0) {
      console.log("No events found — check selectors or page structure.");
      return;
    }

    // Process each event
    const formattedEvents = [];
    const imageProcessor = enhancedImageProcessor;

    for (const [index, e] of events.entries()) {
      let parsedDate;
      try {
        if (e.dateText) {
          const dateMatch = e.dateText.match(/(\w+)\s+(\d+)/);
          if (dateMatch) {
            const [, month, day] = dateMatch;
            const monthNum = new Date(`${month} 1, 2000`).getMonth();
            parsedDate = new Date(2025, monthNum, parseInt(day));
          } else {
            parsedDate = new Date();
          }
        } else {
          parsedDate = new Date();
        }
      } catch {
        parsedDate = new Date();
      }

      // Enhanced image processing
      const eventData = {
        id: `do615_${index}`,
        title: e.title,
        description: "Scraped from Do615 (Nashville Scene network)",
        venue: e.location,
        date: parsedDate
      };

      // Process images using the enhanced pipeline
      let imageResult;
      if (e.images && e.images.length > 0) {
        console.log(`Processing ${e.images.length} images for event: ${e.title}`);
        imageResult = await imageProcessor.processEventImages(e.images, eventData);
      } else {
        console.log(`No images found for event: ${e.title}, using fallback`);
        imageResult = imageProcessor.getFallbackResult(eventData);
      }

      const formattedEvent = {
        title: e.title,
        normalizedTitle: normalizeTitle(e.title),
        description: "Scraped from Do615 (Nashville Scene network)",
        date: parsedDate,
        location: e.location,
        image: imageResult.url,
        imageSource: imageResult.source,
        imageQuality: imageResult.quality,
        url: e.url || `https://do615.com/events/generated/${crypto.createHash('sha256').update(`${e.title}-${e.location}-${parsedDate.toISOString()}`).digest('hex').substring(0,16)}`,
        createdBy: null,
        source: "do615",
        // Use valid enum values
        genre: "Other", // Use valid enum value
        musicType: "concert" // Use valid enum value
      };

      formattedEvents.push(formattedEvent);
      
      // Add small delay to avoid overwhelming image processing
      if (index < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // SIMPLIFIED: Insert all DO615 events without complex filtering
    console.log(`🎯 Found ${formattedEvents.length} events - inserting all (no filtering)`);

    // SIMPLIFIED: Basic duplicate checking by title only
    const titles = formattedEvents.map((e) => e.title);
    
    console.log(`🔍 Checking for duplicate titles among ${titles.length} events...`);
    
    const existing = await Event.find({ 
      title: { $in: titles }
    }).select("title source createdAt");
    
    console.log(`🔍 Found ${existing.length} existing events in database:`);
    existing.forEach(e => {
      console.log(`   - "${e.title}" (${e.source}) - ${new Date(e.createdAt).toISOString()}`);
    });
    
    const existingTitles = new Set(existing.map((e) => e.title));

    const newEvents = formattedEvents.filter((e) => {
      if (existingTitles.has(e.title)) {
        console.log(`   🚫 SKIPPING DUPLICATE: "${e.title}"`);
        return false;
      }
      
      console.log(`   ✅ NEW EVENT: "${e.title}"`);
      return true;
    });

    console.log(`🎯 After duplicate filtering: ${newEvents.length} new events to insert`);

    if (newEvents.length === 0) {
      console.log("No new events to add (all already exist)");
    } else {
      try {
        console.log(`💾 Inserting ${newEvents.length} events into database...`);
        
        // Simplified insertion - remove complex writeConcern
        const insertResult = await Event.insertMany(newEvents, { 
          ordered: false // Continue on individual errors
        });
        
        console.log(`📝 Insert operation completed for ${insertResult.length} events`);
        
        // Simple verification
        const verifyCount = await Event.countDocuments({ source: 'do615' });
        const totalCount = await Event.countDocuments({});
        
        console.log(`✅ DATABASE VERIFICATION:`);
        console.log(`   📊 Total events in database: ${totalCount}`);
        console.log(`   🎯 DO615 events in database: ${verifyCount}`);
        console.log(`   💾 Events inserted this run: ${insertResult.length}`);
        
        if (insertResult.length > 0) {
          console.log(`🎉 SUCCESS: ${insertResult.length} DO615 events added to database`);
        } else {
          console.error('🚨 WARNING: No events were inserted');
        }
        
      } catch (dbErr) {
        console.error("🚨 DATABASE INSERT FAILED:", dbErr);
        
        // More detailed error analysis
        if (dbErr.code === 11000) {
          console.warn("⚠️ Duplicate key errors detected");
          console.log("Insertion details:", dbErr.writeErrors?.map(e => e.errmsg) || 'No specific error details');
        } else if (dbErr.name === 'ValidationError') {
          console.error("❌ Validation errors:", Object.keys(dbErr.errors || {}).map(key => `${key}: ${dbErr.errors[key].message}`));
        } else {
          console.error("❌ Unexpected database error:", dbErr.message);
        }
        
        // Don't throw - let the process complete
      }
    }
  } catch (err) {
    console.error("Scrape failed:", err.message);
  } finally {
    if (browser) await browser.close();
    
    // SIMPLIFIED: Basic connection cleanup
    if (shouldCloseConnection) {
      console.log('🔄 Closing MongoDB connection...');
      
      try {
        const mongoose = require('../mongoose');
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
        }
        console.log('MongoDB connection closed.');
      } catch (verifyErr) {
        console.log('Connection close warning:', verifyErr.message);
      }
    }
  }
}

module.exports = scrapeNashvilleScene;

// Allow direct execution
if (require.main === module) {
  scrapeNashvilleScene().catch(console.error);
}