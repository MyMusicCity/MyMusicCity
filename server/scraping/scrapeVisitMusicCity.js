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
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "mymusiccity" });

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
          const title = el.querySelector("h2,h3,.title")?.textContent?.trim() || "";
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
          return { 
            title, 
            dateText, 
            location, 
            images: [...new Set(images)], // Remove duplicates
            url: link 
          };
        });
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
        console.log(`Processing ${e.images.length} images for event: ${eventData.title}`);
        imageResult = await imageProcessor.processEventImages(e.images, eventData);
      } else {
        console.log(`No images found for event: ${eventData.title}, using fallback`);
        imageResult = imageProcessor.getFallbackResult(eventData);
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
    const musicEvents = normalized.filter(event => {
      const classification = classifyEvent(event);
      if (classification.isMusic) {
        // Add music-specific fields
        event.genre = classification.genre;
        event.musicType = classification.musicType;
        event.venue = classification.venue;
        return true;
      }
      return false;
    });

    console.log(`Filtered ${normalized.length} total events to ${musicEvents.length} music events`);

    if (musicEvents.length === 0) {
      console.log("No music events to save for Visit Music City.");
      return;
    }

    const titles = musicEvents.map((e) => e.title);
    const urls = musicEvents.map((e) => e.url).filter(Boolean);
    const queryOr = [];
    if (titles.length) queryOr.push({ title: { $in: titles } });
    if (urls.length) queryOr.push({ url: { $in: urls } });
    const existing = queryOr.length ? await Event.find({ $or: queryOr }).select("title url") : [];
    const existingTitles = new Set(existing.map((x) => x.title));
    const existingUrls = new Set(existing.map((x) => x.url).filter(Boolean));
    const newEvents = musicEvents.filter((e) => {
      if (existingUrls.has(e.url)) return false;
      if (existingTitles.has(e.title)) return false;
      return true;
    });

    if (newEvents.length === 0) {
      console.log("No new Visit Music City events to add.");
    } else {
      try {
        await Event.insertMany(newEvents, { ordered: false });
        console.log(`Added ${newEvents.length} new Visit Music City events.`);
      } catch (dbErr) {
        if (dbErr && dbErr.code === 11000) {
          console.warn("Some VisitMusicCity events were skipped due to duplicate keys (unique index)");
        } else {
          console.error("Failed to insert VisitMusicCity events:", dbErr && dbErr.message ? dbErr.message : dbErr);
        }
      }
    }
  } catch (err) {
    console.error("scrapeVisitMusicCity failed:", err && err.message ? err.message : err);
  } finally {
    if (browser) await browser.close();
    await mongoose.connection.close();
    console.log("scrapeVisitMusicCity finished and DB closed.");
  }
}

module.exports = scrapeVisitMusicCity;
