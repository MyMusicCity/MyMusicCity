const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const mongoose = require("../mongoose");
const Event = require("../models/Event");
const { getEventImage } = require("../utils/eventImages");
const { imageProcessor, imageExtractionStrategies } = require("../utils/imageProcessor");
const { classifyEvent } = require("../utils/musicClassifier");
const { launchBrowser } = require("../utils/puppeteerConfig");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

async function fetchWithAxios(url) {
  try {
    const res = await axios.get(url, { timeout: 20000 });
    return res.data;
  } catch (err) {
    return null;
  }
}

async function scrapeVisitMusicCity() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI not found in .env file!");
    return;
  }

  let browser = null;
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

    const url = "https://www.visitmusiccity.com/nashville-events";
    console.log(`Scraping Visit Music City events: ${url}`);

    let html = await fetchWithAxios(url);
    let events = [];

    if (html) {
      const $ = cheerio.load(html);
      const candidates = $(".event, .card, .listing, article, .vmc-event");
      candidates.each((i, el) => {
        const $el = $(el);
        const title = ($el.find("h2,h3,.title").first().text() || "").trim();
        const dateText = ($el.find("time").attr("datetime") || $el.find(".date, .event-date").text() || "").trim();
        const location = ($el.find(".venue, .location").text() || "").trim();
        
        // Enhanced image extraction
        const images = [];
        
        // Direct image sources
        $el.find("img").each((idx, img) => {
          const src = $(img).attr("src") || $(img).attr("data-src");
          if (src && !src.includes('placeholder') && !src.includes('loading')) {
            images.push(src.startsWith('//') ? 'https:' + src : src);
          }
        });
        
        // Background images from style attributes
        $el.find('[style*="background-image"]').each((idx, element) => {
          const style = $(element).attr('style');
          if (style) {
            const match = style.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/);
            if (match) {
              images.push(match[1]);
            }
          }
        });
        
        // Specific Visit Music City selectors
        const specificSelectors = [
          '.event-image img', '.calendar-event-image img', '.event-photo img',
          '.listing-image img', '.attraction-image img'
        ];
        specificSelectors.forEach(selector => {
          $el.find(selector).each((idx, img) => {
            const src = $(img).attr('src') || $(img).attr('data-src');
            if (src && !src.includes('placeholder')) {
              images.push(src.startsWith('//') ? 'https:' + src : src);
            }
          });
        });

        const link = $el.find("a").attr("href") || null;
        const fullUrl = link && link.startsWith("http") ? link : (link ? new URL(link, url).toString() : url);

        if (title) events.push({ 
          title, 
          dateText, 
          location, 
          images: [...new Set(images)], // Remove duplicates
          url: fullUrl 
        });
      });
    }

    if (!html || events.length === 0) {
      console.log("No items found with Axios/Cheerio on VisitMusicCity; falling back to Puppeteer...");
      browser = await launchBrowser();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      try {
        await page.waitForSelector("body", { timeout: 5000 });
      } catch (e) {
        /* ignore */
      }

      events = await page.evaluate(() => {
        const sel = Array.from(document.querySelectorAll(".event, .card, article, .vmc-event, .listing"));
        return sel.map((el) => {
          // Try multiple title selectors to avoid "Untitled Event"
          const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.name', '[class*="Title"]'];
          let title = "";
          
          for (const selector of titleSelectors) {
            const titleEl = el.querySelector(selector);
            if (titleEl && titleEl.textContent.trim()) {
              title = titleEl.textContent.trim();
              break;
            }
          }
          
          const dateText = el.querySelector("time")?.getAttribute("datetime") || el.querySelector(".date, .event-date")?.textContent?.trim() || "";
          const location = el.querySelector(".venue, .location")?.textContent?.trim() || "";
          
          // Enhanced image extraction for Puppeteer
          const images = [];
          
          // Direct images
          const imgElements = el.querySelectorAll('img[src]');
          imgElements.forEach(img => {
            if (img.src && !img.src.includes('placeholder') && !img.src.includes('loading')) {
              images.push(img.src);
            }
          });
          
          // Data attributes
          const dataElements = el.querySelectorAll('[data-image], [data-src], [data-background]');
          dataElements.forEach(element => {
            const dataSrc = element.dataset.image || element.dataset.src || element.dataset.background;
            if (dataSrc) images.push(dataSrc);
          });
          
          // Background images
          const bgElements = el.querySelectorAll('[style*="background-image"]');
          bgElements.forEach(element => {
            const style = getComputedStyle(element);
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none') {
              const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
              if (match) images.push(match[1]);
            }
          });

          const link = el.querySelector("a")?.href || null;
          
          // Only return if we found a meaningful title (not empty, not just whitespace, not "undefined")
          if (title && title.length > 3 && !title.toLowerCase().includes('undefined')) {
            return { 
              title, 
              dateText, 
              location, 
              images: [...new Set(images)], // Remove duplicates
              url: link 
            };
          }
          return null; // Filter out events without proper titles
        }).filter(Boolean); // Remove null entries
      });
    }

    console.log(`Found ${events.length} candidate events from Visit Music City`);

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
    function normalizeTitle(s) {
      if (!s) return null;
      return s
        .toString()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[\W_]+/g, " ")
        .trim();
    }

    const normalized = [];
    for (const [index, e] of events.entries()) {
      let parsedDate = new Date();
      try {
        const maybe = new Date(e.dateText);
        if (!isNaN(maybe)) parsedDate = maybe;
      } catch {}

      // Enhanced image processing
      const eventData = {
        id: `visitmusiccity_${index}`,
        title: e.title || "Untitled Event",
        description: "Scraped from Visit Music City",
        venue: e.location || "Nashville, TN",
        date: parsedDate
      };

      // Process images using the enhanced pipeline
      let imageResult;
      if (e.images && e.images.length > 0) {
        console.log(`🎨 Processing ${e.images.length} images for event: ${eventData.title}`);
        imageResult = await imageProcessor.processEventImages(e.images, eventData);
        console.log(`   ✅ Image processed: ${imageResult.source}/${imageResult.quality}`);
      } else {
        console.log(`⚠️ No images found for event: ${eventData.title}, using fallback`);
        imageResult = imageProcessor.getFallbackResult(eventData);
        console.log(`   🔄 Fallback image: ${imageResult.source}/${imageResult.quality}`);
      }

      const normalizedEvent = {
        title: (e.title || "Untitled Event").trim(),
        description: "Scraped from Visit Music City",
        date: parsedDate,
        location: e.location || "Nashville, TN",
        image: imageResult.url,
        imageSource: imageResult.source,
        imageQuality: imageResult.quality,
        url: e.url || url,
        normalizedTitle: normalizeTitle(e.title || ""),
        createdBy: null,
        source: "visitmusiccity",
      };

      normalized.push(normalizedEvent);
      
      // Add small delay to avoid overwhelming image processing
      if (index < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Filter for music events only and add genre classification
    console.log(`🎵 Starting music classification for ${normalized.length} events...`);
    const musicEvents = [];
    const rejectedEvents = [];
    
    normalized.forEach(event => {
      const classification = classifyEvent(event);
      if (classification.isMusic) {
        // Add music-specific fields
        event.genre = classification.genre;
        event.musicType = classification.musicType;
        event.venue = classification.venue;
        musicEvents.push(event);
        console.log(`   ✅ MUSIC: ${event.title} (${classification.genre})`);
      } else {
        rejectedEvents.push(event);
        console.log(`   ❌ NOT MUSIC: ${event.title}`);
      }
    });

    console.log(`🎯 Filtered ${normalized.length} total events to ${musicEvents.length} music events`);
    if (rejectedEvents.length > 0) {
      console.log(`📋 Rejected ${rejectedEvents.length} non-music events`);
    }

    if (musicEvents.length === 0) {
      console.log("No music events to save for Visit Music City.");
      return;
    }

    const titles = musicEvents.map((e) => e.title);
    const urls = musicEvents.map((e) => e.url).filter(Boolean);
    // Enhanced duplicate detection - prioritize URL over title for "Untitled Event" cases
    const queryOr = [];
    if (urls.length) queryOr.push({ url: { $in: urls } }); // Check URLs first
    if (titles.length) {
      // Only check titles if they're not all "Untitled Event"
      const uniqueTitles = [...new Set(titles)];
      if (uniqueTitles.length > 1 || !uniqueTitles[0].includes('Untitled')) {
        queryOr.push({ title: { $in: titles } });
      }
    }
    
    const existing = queryOr.length ? await Event.find({ $or: queryOr }).select("title url") : [];
    const existingUrls = new Set(existing.map((x) => x.url).filter(Boolean));
    const existingTitles = new Set(existing.map((x) => x.title));
    
    const newEvents = musicEvents.filter((e) => {
      // For events with URLs, use URL as primary duplicate check
      if (e.url && existingUrls.has(e.url)) return false;
      
      // For titled events (not "Untitled Event"), check title duplicates
      if (e.title && !e.title.includes('Untitled') && existingTitles.has(e.title)) return false;
      
      return true;
    });

    console.log(`🔍 Duplicate detection: found ${existing.length} existing events`);
    existing.forEach(ex => console.log(`   🔄 Existing: ${ex.title}`));
    
    if (newEvents.length === 0) {
      console.log(`⚠️ No new Visit Music City events to add (${musicEvents.length} were duplicates)`);
    } else {
      console.log(`💾 Attempting to save ${newEvents.length} new events...`);
      newEvents.forEach((ev, i) => {
        console.log(`   ${i+1}. ${ev.title} | ${ev.source} | ${ev.imageSource}/${ev.imageQuality}`);
      });
      
      try {
        const insertResult = await Event.insertMany(newEvents, { ordered: false });
        console.log(`✅ Successfully added ${insertResult.length} new Visit Music City events.`);
      } catch (dbErr) {
        if (dbErr && dbErr.code === 11000) {
          console.warn(`⚠️ Some VisitMusicCity events were skipped due to duplicate keys (unique index)`);
        } else {
          console.error(`❌ Failed to insert VisitMusicCity events:`, dbErr && dbErr.message ? dbErr.message : dbErr);
          console.error(`   Error code: ${dbErr.code}`);
          console.error(`   Error name: ${dbErr.name}`);
        }
      }
    }
  } catch (err) {
    console.error("scrapeVisitMusicCity failed:", err && err.message ? err.message : err);
  } finally {
    if (browser) await browser.close();
    // Only close connection if we opened it (running standalone)
    if (shouldCloseConnection) {
      await mongoose.connection.close();
      console.log("scrapeVisitMusicCity finished and DB closed.");
    } else {
      console.log("scrapeVisitMusicCity finished, keeping shared DB connection open.");
    }
  }
}

module.exports = scrapeVisitMusicCity;
