// server/scraping/scrapeNashvilleScene.js
const path = require("path");
const puppeteer = require("puppeteer");
const mongoose = require("../mongoose");
const Event = require("../models/Event");
const { getEventImage } = require("../utils/eventImages");
const { imageProcessor, imageExtractionStrategies } = require("../utils/imageProcessor");
// Simplified music detection - no longer using complex classifier
// const { classifyEvent } = require("../utils/musicClassifier");
const { launchBrowser } = require("../utils/puppeteerConfig");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Production environment detection
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
const BYPASS_MUSIC_FILTER = process.env.BYPASS_MUSIC_FILTER === 'true'; // Only bypass if explicitly set
const SCRAPING_CONFIG = {
  timeout: isProduction ? 180000 : 120000, // 3min for production, 2min for dev
  waitUntil: isProduction ? 'load' : 'networkidle', // Faster load event for production
  maxRetries: isProduction ? 3 : 1,
  retryDelay: 5000 // 5 second delay between retries
};

console.log(`🔧 Scraping config: timeout=${SCRAPING_CONFIG.timeout}ms, waitUntil=${SCRAPING_CONFIG.waitUntil}, retries=${SCRAPING_CONFIG.maxRetries}`);

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI not found in .env file!");
  process.exit(1);
}

async function scrapeDo615() {
  let browser;
  let shouldCloseConnection = false;
  try {
    // Check if we already have an active MongoDB connection
    const connectionStates = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    
    console.log(`MongoDB connection state: ${mongoose.connection.readyState} (${connectionStates[mongoose.connection.readyState]})`);
    
    // Only connect if we're completely disconnected
    if (mongoose.connection.readyState === 0) {
      console.log("Connecting to MongoDB...");
      await mongoose.connect(process.env.MONGO_URI, { dbName: "mymusiccity" });
      shouldCloseConnection = true; // Only close if we opened it
    } else {
      console.log("Using existing MongoDB connection...");
      shouldCloseConnection = false; // Don't close shared connection
    }

    console.log("Launching Puppeteer...");
    browser = await launchBrowser();
    const page = await browser.newPage();

    console.log("Navigating to https://do615.com/events ...");
    await page.goto("https://do615.com/events", {
      waitUntil: SCRAPING_CONFIG.waitUntil,
      timeout: SCRAPING_CONFIG.timeout,
    });

    await page.waitForSelector(".ds-listing.event-card", { timeout: 15000 });
    console.log("Extracting event data...");

    const events = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".ds-listing.event-card"));
      return items.map((el, index) => {
        const title =
          el.querySelector(".ds-listing-event-title-text")?.textContent?.trim() ||
          "Untitled Event";
        const timeText =
          el.querySelector(".ds-event-time")?.textContent?.trim() || "TBA";
        const location =
          el.querySelector(".ds-venue-name [itemprop='name']")?.textContent?.trim() ||
          "Nashville, TN";
        
        // Enhanced image extraction with multiple strategies
        const images = [];
        
        // Primary: background image from cover
        const coverImg = el.querySelector(".ds-cover-image")?.style?.backgroundImage
          ?.replace(/url\(['"]?(.*?)['"]?\)/, "$1");
        if (coverImg && !coverImg.includes('placeholder')) {
          images.push(coverImg);
        }
        
        // Secondary: direct img elements
        const imgElements = el.querySelectorAll('img[src]');
        imgElements.forEach(img => {
          if (img.src && !img.src.includes('placeholder') && !img.src.includes('loading')) {
            images.push(img.src);
          }
        });
        
        // Tertiary: data attributes
        const dataImgElements = el.querySelectorAll('[data-image], [data-src], [data-background]');
        dataImgElements.forEach(el => {
          const dataSrc = el.dataset.image || el.dataset.src || el.dataset.background;
          if (dataSrc) images.push(dataSrc);
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

    // Normalize and prepare data with enhanced image processing
    function normalizeTitle(s) {
      if (!s) return null;
      return s
        .toString()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[\W_]+/g, " ")
        .trim();
    }

    // Process events with enhanced image handling
    const formattedEvents = [];
    for (const [index, e] of events.entries()) {
      let parsedDate = null;
      try {
        const today = new Date();
        parsedDate = new Date(`${today.toISOString().split("T")[0]} ${e.dateText}`);
        if (isNaN(parsedDate)) parsedDate = today;
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
        url: e.url,
        createdBy: null, // avoid ObjectId casting issue
        source: "do615", // optional: mark origin
      };

      formattedEvents.push(formattedEvent);
      
      // Add small delay to avoid overwhelming image processing
      if (index < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // SIMPLIFIED MUSIC FILTERING: More inclusive to ensure we don't miss music events
    console.log(`🎵 Starting simplified music classification for ${formattedEvents.length} events...`);
    
    // Check if music filtering should be bypassed for debugging
    if (BYPASS_MUSIC_FILTER) {
      console.log('🚨 BYPASSING MUSIC FILTER - Including ALL events for debugging');
      const musicEvents = formattedEvents.map(event => {
        event.genre = 'Music'; // Mark all as music for debugging
        event.musicType = 'Live';
        console.log(`   ✅ BYPASS: ${event.title}`);
        return event;
      });
      
      console.log(`🎯 BYPASS MODE: Included all ${musicEvents.length} events as music events`);
    } else {
      // Normal filtering logic...
    }
    
    const musicEvents = BYPASS_MUSIC_FILTER ? formattedEvents.map(event => {
      event.genre = 'Music';
      event.musicType = 'Live';
      return event;
    }) : formattedEvents.filter(event => {
      // Simple music detection - if it mentions music, instruments, venues, or performance terms
      const text = `${event.title} ${event.description} ${event.location}`.toLowerCase();
      
      const isMusicEvent = (
        // Direct music keywords
        text.includes('music') || text.includes('concert') || text.includes('band') ||
        text.includes('singer') || text.includes('artist') || text.includes('performance') ||
        text.includes('live') || text.includes('show') || text.includes('acoustic') ||
        
        // Instruments
        text.includes('guitar') || text.includes('piano') || text.includes('drums') ||
        text.includes('vocal') || text.includes('singing') ||
        
        // Music genres
        text.includes('rock') || text.includes('pop') || text.includes('country') ||
        text.includes('jazz') || text.includes('blues') || text.includes('folk') ||
        text.includes('hip-hop') || text.includes('rap') || text.includes('electronic') ||
        
        // Nashville music venues (known music spots)
        text.includes('ryman') || text.includes('opry') || text.includes('bridgestone') ||
        text.includes('ascend') || text.includes('bluebird') || text.includes('tootsie') ||
        text.includes('honky tonk') || text.includes('broadway') || text.includes('exit/in') ||
        text.includes('mercy lounge') || text.includes('cannery ballroom') ||
        text.includes('marathon music works') || text.includes('basement') ||
        
        // Event types at music venues
        text.includes('festival') && (text.includes('music') || text.includes('live'))
      );
      
      // Only exclude OBVIOUS non-music events (be more restrictive on exclusions)
      const isNonMusicEvent = (
        (text.includes('comedy') && !text.includes('music')) ||
        (text.includes('standup') && !text.includes('music')) ||
        text.includes('comedian') ||
        text.includes('sports') || text.includes('football') || text.includes('basketball') ||
        text.includes('baseball') || text.includes('soccer') ||
        text.includes('lecture') || text.includes('seminar') || 
        (text.includes('conference') && !text.includes('music')) ||
        text.includes('business meeting') || 
        (text.includes('workshop') && !text.includes('music')) ||
        text.includes('art gallery') || text.includes('museum') ||
        text.includes('movie') || text.includes('film screening')
      );
      
      // PERMISSIVE LOGIC: If it's from Nashville/music city sources and not obviously non-music, include it
      const isFromNashvilleSource = text.includes('nashville') || text.includes('music city') ||
                                   event.source === 'do615';
      
      // Much more permissive: include if music indicators OR (Nashville source AND not obviously non-music)
      if (isMusicEvent || (isFromNashvilleSource && !isNonMusicEvent)) {
        // Add simplified music fields
        event.genre = 'Music'; // Simplified - just mark as music
        event.musicType = 'Live'; // Simplified - assume live music
        console.log(`   ✅ MUSIC: ${event.title}`);
        return true;
      } else {
        console.log(`   ❌ NOT MUSIC: ${event.title} (reason: ${isNonMusicEvent ? 'excluded category' : 'no music indicators'})`);
        return false;
      }
    });

    console.log(`🎯 Filtered ${formattedEvents.length} total events to ${musicEvents.length} music events`);

    // Avoid duplicates (check by title OR url)
    const titles = musicEvents.map((e) => e.title);
    const urls = musicEvents.map((e) => e.url).filter(Boolean);
    
    console.log(`🔍 Checking for duplicates among ${titles.length} titles and ${urls.length} URLs...`);
    
    const queryOr = [];
    if (titles.length) queryOr.push({ title: { $in: titles } });
    if (urls.length) queryOr.push({ url: { $in: urls } });
    
    console.log('🔍 Duplicate check query:', JSON.stringify(queryOr, null, 2));
    
    const existing = queryOr.length ? await Event.find({ $or: queryOr }).select("title url source createdAt") : [];
    
    console.log(`🔍 Found ${existing.length} existing events in database:`);
    existing.forEach(e => {
      console.log(`   - "${e.title}" (${e.source}) - ${new Date(e.createdAt).toISOString()}`);
    });
    
    const existingTitles = new Set(existing.map((e) => e.title));
    const existingUrls = new Set(existing.map((e) => e.url).filter(Boolean));

    const newEvents = musicEvents.filter((e) => {
      const urlExists = existingUrls.has(e.url);
      const titleExists = existingTitles.has(e.title);
      
      if (urlExists || titleExists) {
        console.log(`   🚫 SKIPPING DUPLICATE: "${e.title}" (URL exists: ${urlExists}, Title exists: ${titleExists})`);
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
        await Event.insertMany(newEvents, { ordered: false });
        console.log(`Added ${newEvents.length} new events to the database`);
      } catch (dbErr) {
        if (dbErr && dbErr.code === 11000) {
          console.warn("Some events were skipped due to duplicate keys (unique index)");
        } else {
          console.error("Failed to insert DO615 events:", dbErr && dbErr.message ? dbErr.message : dbErr);
        }
      }
    }
  } catch (err) {
    console.error("Scrape failed:", err.message);
  } finally {
    if (browser) await browser.close();
    // Only close connection if we opened it (running standalone)
    if (shouldCloseConnection) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    } else {
      console.log("Keeping shared MongoDB connection open.");
    }
  }
}

// Export the function for API triggers, but also run if called directly
module.exports = scrapeDo615;

// Only run if this file is executed directly (not required)
if (require.main === module) {
  scrapeDo615();
}
