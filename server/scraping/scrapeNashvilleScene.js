const puppeteer = require("puppeteer");
const { chromium } = require("playwright");
const Event = require("../models/Event");
const crypto = require('crypto');
const { isMusicEvent, classifyEvent } = require('../utils/musicClassifier');

// Simple title normalization function
function normalizeTitle(title) {
  return title.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

// Simple image processor fallback
const imageProcessor = {
  async processEventImages(images, eventData) {
    return {
      url: images[0] || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&auto=format",
      source: "scraped",
      quality: "medium"
    };
  },
  getFallbackResult(eventData) {
    return {
      url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&auto=format",
      source: "fallback",
      quality: "medium"
    };
  }
};

async function scrapeNashvilleScene() {
  let browser;
  let browserInfo = {
    instance: null,
    type: null,
    navigationOptions: null
  };
  const shouldCloseConnection = !global.mongoConnection;

  try {
    console.log("🔧 Browser Installation Script Starting...");

    // Explicit browser installation for production environment
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
      console.log('🔄 Production environment detected, ensuring browsers...');
      
      try {
        // Install Puppeteer browser using modern API
        console.log('📦 Installing Puppeteer browser...');
        const { execSync } = require('child_process');
        
        // Use npx to install Chrome browser for Puppeteer
        execSync('npx puppeteer browsers install chrome', { 
          stdio: 'pipe',
          timeout: 120000 // 2 minute timeout
        });
        console.log('✅ Puppeteer browser installed successfully');
      } catch (installErr) {
        console.log('⚠️ Puppeteer browser installation failed:', installErr.message);
      }
    }

    // Load environment from parent directory
    require('dotenv').config({ path: '../.env' });
    
    // Production browser setup
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
      console.log("🌐 Production environment detected - ensuring browsers are available...");
    }

    console.log("🔧 Scraping config: timeout=120000ms, waitUntil=networkidle, retries=1");

    // Connect to MongoDB
    const mongoose = require('../mongoose');
    console.log('MongoDB connection state:', mongoose.connection.readyState, '(disconnected)');
    console.log('Connecting to MongoDB...');

    // Actually connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB connected successfully');
    } else {
      console.log('✅ MongoDB already connected');
    }

    console.log('🚀 Starting enhanced browser launch sequence...');

    try {
      console.log('🎯 Attempting Playwright Chromium launch...');
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      browserInfo.instance = browser;
      browserInfo.type = 'playwright';
      browserInfo.navigationOptions = getNavigationOptions('playwright');
      
      console.log('✅ Playwright Chromium launched successfully!');
      console.log(`🔧 Browser type: ${browserInfo.type}, waitUntil: ${browserInfo.navigationOptions.waitUntil}`);
      
    } catch (err) {
      console.error('❌ Playwright failed:', err.message);
      console.log('🔄 Falling back to Puppeteer...');
      
      try {
        // Try multiple Chrome executable paths for Render deployment
        const fs = require('fs');
        const path = require('path');
        
        // Helper function to find Chrome in Puppeteer cache
        const findPuppeteerChrome = () => {
          try {
            const cacheDir = '/opt/render/.cache/puppeteer/chrome';
            if (fs.existsSync(cacheDir)) {
              const versions = fs.readdirSync(cacheDir);
              for (const version of versions) {
                // Try chrome-linux64 first (modern), then chrome-linux (legacy)
                const modernPath = path.join(cacheDir, version, 'chrome-linux64', 'chrome');
                const legacyPath = path.join(cacheDir, version, 'chrome-linux', 'chrome');
                
                if (fs.existsSync(modernPath)) return modernPath;
                if (fs.existsSync(legacyPath)) return legacyPath;
              }
            }
          } catch (err) {
            console.log('📁 Error scanning Puppeteer cache:', err.message);
          }
          return null;
        };
        
        const puppeteerChrome = findPuppeteerChrome();
        
        const possiblePaths = [
          process.env.PUPPETEER_EXECUTABLE_PATH,
          '/usr/bin/google-chrome-stable',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          puppeteerChrome
        ].filter(Boolean);
        
        let launchError;
        
        for (const executablePath of possiblePaths) {
          try {
            console.log(`🔍 Trying Chrome at: ${executablePath}`);
            browser = await puppeteer.launch({
              headless: true,
              executablePath,
              args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage', 
                '--disable-gpu',
                '--no-zygote',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
              ]
            });
            
            browserInfo.instance = browser;
            browserInfo.type = 'puppeteer';
            browserInfo.navigationOptions = getNavigationOptions('puppeteer');
            
            console.log(`✅ Puppeteer launched successfully with: ${executablePath}`);
            console.log(`🔧 Browser type: ${browserInfo.type}, waitUntil: ${browserInfo.navigationOptions.waitUntil}`);
            break;
          } catch (pathErr) {
            console.log(`❌ Failed with ${executablePath}: ${pathErr.message}`);
            launchError = pathErr;
            continue;
          }
        }
        
        if (!browser) {
          // Try without executablePath (use bundled Chromium)
          console.log('🔄 Trying Puppeteer with bundled Chromium...');
          
          // First ensure browsers are downloaded
          try {
            console.log('📦 Checking/installing Puppeteer browser...');
            const { executablePath } = require('puppeteer');
            console.log('Detected Puppeteer executable:', executablePath());
          } catch (pathErr) {
            console.log('⚠️ Puppeteer executable not found, attempting download...');
            try {
              const { install } = require('puppeteer/lib/cjs/puppeteer/node/install.js');
              await install();
              console.log('✅ Puppeteer browser download completed');
            } catch (installErr) {
              console.log('❌ Puppeteer browser download failed:', installErr.message);
            }
          }
          
          browser = await puppeteer.launch({
            headless: true,
            args: [
              '--no-sandbox', 
              '--disable-setuid-sandbox', 
              '--disable-dev-shm-usage', 
              '--disable-gpu',
              '--no-zygote'
            ]
          });
          
          browserInfo.instance = browser;
          browserInfo.type = 'puppeteer';
          browserInfo.navigationOptions = getNavigationOptions('puppeteer');
          
          console.log('✅ Puppeteer launched with bundled Chromium!');
          console.log(`🔧 Browser type: ${browserInfo.type}, waitUntil: ${browserInfo.navigationOptions.waitUntil}`);
        }
        
      } catch (puppeteerErr) {
        console.error('❌ Both Playwright and Puppeteer failed:', puppeteerErr.message);
        throw new Error('Browser launch failed: Both Playwright and Puppeteer unavailable');
      }
    }

    const page = await browserInfo.instance.newPage();
    
    // Set viewport based on detected browser type
    if (browserInfo.type === 'puppeteer') {
      await page.setViewport({ width: 1280, height: 720 });
      console.log('🔧 Using Puppeteer viewport API');
    } else if (browserInfo.type === 'playwright') {
      await page.setViewportSize({ width: 1280, height: 720 });
      console.log('🔧 Using Playwright viewport API');
    } else {
      // Fallback for unknown browser type
      try {
        await page.setViewport({ width: 1280, height: 720 });
        console.log('🔧 Using Puppeteer viewport API (fallback)');
      } catch {
        await page.setViewportSize({ width: 1280, height: 720 });
        console.log('🔧 Using Playwright viewport API (fallback)');
      }
    }

    // Scrape multiple DO615 pages for comprehensive music coverage
    const urlsToScrape = [
      "https://do615.com/events",
      "https://do615.com/events/music", 
      "https://do615.com/events/concerts",
      "https://do615.com/events/live-music"
    ];
    
    const allEvents = [];
    
    for (const url of urlsToScrape) {
      try {
        console.log(`🌐 Starting navigation to ${url}...`);
        console.log(`🔧 Using ${browserInfo.type} with waitUntil: ${browserInfo.navigationOptions.waitUntil}`);
        
        // Use safe navigation with browser-specific options
        const navigationSuccess = await safeNavigation(page, url, browserInfo.type);
        
        if (!navigationSuccess) {
          throw new Error('Navigation failed after all attempts');
        }
        
        console.log(`📊 Extracting event data from ${url}...`);

        const pageEvents = await page.evaluate(() => {
      const eventElements = document.querySelectorAll(".event-card");
      
      return Array.from(eventElements).map((el, index) => {
        // Updated selectors based on actual DO615 structure
        const title = el.querySelector(".ds-listing-event-title-text")?.textContent?.trim() || "Untitled Event";
        const timeText = el.querySelector(".ds-event-time")?.textContent?.trim() || "";
        const location = el.querySelector(".ds-venue-name span[itemprop='name']")?.textContent?.trim() || "";
        
        // Extract image from background-image style
        const images = [];
        const coverImage = el.querySelector('.ds-cover-image');
        if (coverImage && coverImage.style.backgroundImage) {
          const imageMatch = coverImage.style.backgroundImage.match(/url\(['"]([^'"]+)['"]\)/);
          if (imageMatch) {
            images.push(imageMatch[1]);
          }
        }

        // Get the event URL from the main title link
        const linkEl = el.querySelector(".ds-listing-event-title");
        const url = linkEl?.href || null;

        // Extract date from meta tag for better accuracy
        const dateMetaEl = el.querySelector('meta[itemprop="startDate"]');
        const datetime = dateMetaEl?.getAttribute('datetime') || '';

        return {
          title,
          dateText: timeText,
          datetime,
          location,
          images: [...new Set(images)], // Remove duplicates
          url,
          eventIndex: index
        };
      });
    });

        console.log(`🪄 Found ${pageEvents.length} events from ${url}`);
        allEvents.push(...pageEvents);
        
        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (urlError) {
        console.log(`⚠️  Failed to scrape ${url}: ${urlError.message}`);
      }
    }

    // Remove duplicates by URL (same event might appear on multiple pages)
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.url === event.url && e.title === event.title)
    );

    console.log(`🪄 Found ${allEvents.length} total events, ${uniqueEvents.length} unique events`);

    if (uniqueEvents.length === 0) {
      console.log("No events found — check selectors or page structure.");
      return;
    }
    
    const events = uniqueEvents;

    // Process each event
    const formattedEvents = [];

    for (const [index, e] of events.entries()) {
      let parsedDate;
      try {
        // Try to parse from datetime meta tag first
        if (e.datetime) {
          // Clean up URL encoding issues in datetime string
          let cleanDateTime = e.datetime.replace(/%CDT/g, '-05:00').replace(/%CST/g, '-06:00');
          
          // Try parsing the cleaned datetime
          parsedDate = new Date(cleanDateTime);
          console.log(`Event "${e.title}": datetime="${e.datetime}" -> cleaned="${cleanDateTime}" -> parsed="${parsedDate.toDateString()}"`);
          
          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid datetime after cleaning');
          }
        } else if (e.dateText) {
          // Fallback to parsing from displayed time text
          const dateMatch = e.dateText.match(/(\w+)\s+(\d+)/);
          if (dateMatch) {
            const [, month, day] = dateMatch;
            const monthNum = new Date(`${month} 1, 2000`).getMonth();
            parsedDate = new Date(2025, monthNum, parseInt(day));
            console.log(`Event "${e.title}": parsed from dateText="${e.dateText}" -> ${parsedDate.toDateString()}`);
          } else {
            console.log(`Event "${e.title}": Could not parse dateText="${e.dateText}", using today`);
            parsedDate = new Date();
          }
        } else {
          console.log(`Event "${e.title}": No date info available, using today`);
          parsedDate = new Date();
        }
      } catch (err) {
        console.log(`Event "${e.title}": Date parsing error - ${err.message}, using today`);
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

    // MUSIC FILTERING: Apply music classification to filter out non-music events
    console.log(`🎵 Filtering ${formattedEvents.length} events for music content...`);
    
    const musicEvents = [];
    const nonMusicEvents = [];
    
    for (const event of formattedEvents) {
      // Classify the event using music classifier
      if (isMusicEvent(event.title, event.description, event.location)) {
        // Enhance classification
        const classification = classifyEvent(event);
        event.genre = classification.genre || event.genre;
        event.musicType = classification.musicType || event.musicType;
        event.venue = classification.venue || event.venue;
        
        musicEvents.push(event);
        console.log(`   🎵 MUSIC: "${event.title}" (${event.genre}/${event.musicType})`);
      } else {
        nonMusicEvents.push(event);
        console.log(`   🚫 NON-MUSIC: "${event.title}" - ${event.location}`);
      }
    }
    
    console.log(`\n🎯 Music filtering results:`);
    console.log(`   🎵 Music events: ${musicEvents.length}`);
    console.log(`   🚫 Non-music events: ${nonMusicEvents.length}`);
    console.log(`   📊 Music ratio: ${Math.round((musicEvents.length / formattedEvents.length) * 100)}%`);
    
    // Use only music events for insertion
    const eventsToInsert = musicEvents;
    console.log(`\n💾 Proceeding with ${eventsToInsert.length} music-only events`);

    // Basic duplicate checking by title only
    const titles = eventsToInsert.map((e) => e.title);
    
    console.log(`🔍 Checking for duplicate titles among ${titles.length} music events...`);
    
    const existing = await Event.find({ 
      title: { $in: titles }
    }).select("title source createdAt");
    
    console.log(`🔍 Found ${existing.length} existing events in database:`);
    existing.forEach(e => {
      console.log(`   - "${e.title}" (${e.source}) - ${new Date(e.createdAt).toISOString()}`);
    });
    
    const existingTitles = new Set(existing.map((e) => e.title));

    const newEvents = eventsToInsert.filter((e) => {
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
        console.error("📋 Error details:", {
          name: dbErr.name,
          message: dbErr.message,
          code: dbErr.code
        });
        
        // Try to insert events individually on bulk failure
        if (dbErr.name === 'BulkWriteError' && newEvents.length > 1) {
          console.log("🔄 Attempting individual event insertion as fallback...");
          let successCount = 0;
          
          for (const event of newEvents) {
            try {
              await Event.create(event);
              successCount++;
              console.log(`   ✅ Individual insert success: "${event.title}"`);
            } catch (individualErr) {
              console.log(`   ❌ Individual insert failed: "${event.title}" - ${individualErr.message}`);
            }
          }
          
          console.log(`📊 Individual insertion results: ${successCount}/${newEvents.length} successful`);
        } else {
          console.error("💥 Complete database operation failure");
        }
        
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
    if (browserInfo && browserInfo.instance) {
      console.log(`🔄 Closing ${browserInfo.type} browser...`);
      await browserInfo.instance.close();
    }
    
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