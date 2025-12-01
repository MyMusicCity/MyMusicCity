const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const mongoose = require("../mongoose");
const Event = require("../models/Event");
const { imageProcessor } = require("../utils/imageProcessor");
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

async function scrapeSceneCalendar() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI not found in .env file!");
    return;
  }

  let browser = null;
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "mymusiccity" });

    const url = "https://calendar.nashvillescene.com";
    console.log(`Scraping Nashville Scene calendar: ${url}`);

    let html = await fetchWithAxios(url);
    let events = [];

    if (html) {
      const $ = cheerio.load(html);

      // Nashville Scene calendar uses client-side anchors like /calendar/#/details/<slug>/...
      // Select anchors that link to the event detail routes — more reliable than guessing classes.
      const anchors = $("a[href*='/calendar/#/details']");
      anchors.each((i, el) => {
        const $el = $(el);
        // Try common sources of title: aria-label, img alt, or anchor text
        const aria = ($el.attr("aria-label") || "").trim();
        const imgAlt = ($el.find("img").attr("alt") || "").trim();
        let text = ($el.text() || "").trim();
        // Collapse whitespace
        text = text.replace(/\s+/g, " ").trim();
        
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
        
        // Parent container images
        const parentContainer = $el.closest('.event, .calendar-item, .listing');
        if (parentContainer.length) {
          parentContainer.find('img').each((idx, img) => {
            const src = $(img).attr('src') || $(img).attr('data-src');
            if (src && !src.includes('placeholder')) {
              images.push(src.startsWith('//') ? 'https:' + src : src);
            }
          });
        }

        // Prefer aria or img alt if available, otherwise use anchor text
        let title = aria || imgAlt || text;

        // Some anchor text contains location/time separated by '|' — take the left side if so
        if (title && title.includes("|")) {
          title = title.split("|")[0].trim();
        }

        // Try to extract a datetime from the href (the calendar includes ISO-like datetime in the URL)
        const urlRel = $el.attr("href") || null;
        const fullUrl = urlRel && urlRel.startsWith("http") ? urlRel : (url + (urlRel || ""));
        let dateText = "";
        if (urlRel) {
          const m = urlRel.match(/\/(\d{4}-\d{2}-\d{2}T\d{2})/); // e.g. /2025-11-03T07
          if (m) dateText = m[1];
        }

        const location = ($el.find(".venue, .location").text() || "").trim();
        const image = $el.find("img").attr("src") || null;

        if (title) {
          events.push({ title, dateText, location, image, url: fullUrl });
        }
      });
    }

    // If nothing found, fallback to puppeteer (site may be JS heavy)
    if (!html || events.length === 0) {
      console.log("No items found with Axios/Cheerio; falling back to Puppeteer...");
      browser = await launchBrowser();
      const page = await browser.newPage();
      // Set a common desktop user agent to reduce bot detection differences
      if (page.setUserAgent && typeof page.setUserAgent === 'function') {
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        );
      }
      if (page.setExtraHTTPHeaders && typeof page.setExtraHTTPHeaders === 'function') {
        await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
      }

      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

      // Wait for a main container that usually holds calendar items; be tolerant
      try {
        await page.waitForSelector("#main-page-container, #main, .calendar, .content", { timeout: 10000 });
      } catch (e) {
        // ignore — we'll still try to scrape whatever is on the page
      }

      // Try closing cookie/consent overlays which can block anchors
      try {
        await page.evaluate(() => {
          const selectors = [
            '.cookie-consent button',
            '.cookie-banner button',
            "button[aria-label*='close']",
            "button[aria-label*='Close']",
            "button[class*='close']",
            "#cookie-banner button",
          ];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
              try { el.click(); } catch (e) {}
            }
          }
        });
      } catch (e) {
        // ignore
      }

      // Broad selector: match any event detail link fragments (hash-based or path)
      events = await page.evaluate(() => {
        const sel = Array.from(document.querySelectorAll("a[href*='#/details'], a[href*='/calendar/#/details'], a[href*='/calendar/']"));
        return sel.map((el) => {
          const aria = el.getAttribute('aria-label') || '';
          const img = el.querySelector('img');
          const imgAlt = img ? (img.alt || '') : '';
          let text = (el.textContent || '').trim().replace(/\s+/g, ' ');
          let title = aria || imgAlt || text;
          if (title && title.includes('|')) title = title.split('|')[0].trim();
          const link = el.href || el.getAttribute('href') || null;
          let dateText = '';
          try {
            const m = link && link.match(/(\\d{4}-\\d{2}-\\d{2}T\\d{2})/);
            if (m) dateText = m[1];
          } catch (e) {}
          const location = el.querySelector('.venue, .location')?.textContent?.trim() || '';
          
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
          const bgElements = el.querySelectorAll('[style*=\"background-image\"]');
          bgElements.forEach(element => {
            const style = getComputedStyle(element);
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none') {
              const match = bgImage.match(/url\\(['\"]?(.*?)['\"]?\\)/);
              if (match) images.push(match[1]);
            }
          });
          
          // Parent container images
          const parentContainer = el.closest('.event, .calendar-item, .listing');
          if (parentContainer) {
            const parentImages = parentContainer.querySelectorAll('img[src]');
            parentImages.forEach(img => {
              if (img.src && !img.src.includes('placeholder')) {
                images.push(img.src);
              }
            });
          }
          
          return { 
            title: title || '', 
            dateText, 
            location, 
            images: [...new Set(images)], // Remove duplicates
            url: link 
          };
        });
      });

      // If still empty, dump some page-level diagnostics to help debugging
      if ((!events || events.length === 0) && browser) {
        try {
          const debugAnchors = await page.evaluate(() => {
            const sel = Array.from(document.querySelectorAll("a[href*='#/details'], a[href*='/calendar/#/details'], a[href*='/calendar/']"));
            return sel.slice(0, 12).map((el) => {
              const href = el.href || el.getAttribute('href') || '';
              const aria = el.getAttribute('aria-label') || '';
              const img = el.querySelector('img');
              const imgAlt = img ? (img.alt || '') : '';
              const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
              return { href, aria, imgAlt, text };
            });
          });
          if (process.env.DEBUG_SCRAPE) console.log('DEBUG: first Scene calendar anchors:', JSON.stringify(debugAnchors, null, 2));

          // Also dump a short snippet of the main container so we can see structure
          try {
            const snippet = await page.evaluate(() => {
              const main = document.querySelector('#main-page-container') || document.querySelector('#main') || document.querySelector('.calendar') || document.querySelector('.content');
              return main ? main.innerHTML.slice(0, 4000) : document.body.innerHTML.slice(0, 4000);
            });
            if (process.env.DEBUG_SCRAPE) console.log('DEBUG: page snippet (first 4000 chars):\n', snippet);
          } catch (snipErr) {
            console.log('DEBUG: failed to extract page snippet:', snipErr && snipErr.message ? snipErr.message : snipErr);
          }
        } catch (dumpErr) {
          console.log('DEBUG: failed to collect anchor debug info:', dumpErr && dumpErr.message ? dumpErr.message : dumpErr);
        }
      }
    }

    console.log(`Found ${events.length} candidate events from Nashville Scene calendar`);

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
    const normalized = [];
    for (const [index, e] of events.entries()) {
      let parsedDate = new Date();
      try {
        const maybe = new Date(e.dateText);
        if (!isNaN(maybe)) parsedDate = maybe;
      } catch {}

      // Enhanced image processing
      const eventData = {
        id: `nashvillescene_${index}`,
        title: e.title || "Untitled Event",
        description: "Scraped from Nashville Scene calendar",
        venue: e.location || "Nashville, TN",
        date: parsedDate
      };

      // Process images using the enhanced pipeline
      let imageResult;
      if (e.images && e.images.length > 0) {
        console.log(`Processing ${e.images.length} images for event: ${eventData.title}`);
        imageResult = await imageProcessor.processEventImages(e.images, eventData);
      } else if (e.image) {
        console.log(`Processing single image for event: ${eventData.title}`);
        imageResult = await imageProcessor.processEventImage(e.image, eventData);
      } else {
        console.log(`No images found for event: ${eventData.title}, using fallback`);
        imageResult = imageProcessor.getFallbackResult(eventData);
      }

      const normalizedEvent = {
        title: (e.title || "Untitled Event").trim(),
        description: "Scraped from Nashville Scene calendar",
        date: parsedDate,
        location: e.location || "Nashville, TN",
        image: imageResult.url,
        imageSource: imageResult.source,
        imageQuality: imageResult.quality,
        imageProcessedAt: new Date(),
        url: e.url || url,
        normalizedTitle: normalizeTitle(e.title || ""),
        createdBy: null,
        source: "nashvillescene",
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
      console.log("No music events to save.");
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
      console.log("No new Nashville Scene calendar events to add.");
    } else {
      try {
        await Event.insertMany(newEvents, { ordered: false });
        console.log(`Added ${newEvents.length} new Nashville Scene calendar events.`);
      } catch (dbErr) {
        if (dbErr && dbErr.code === 11000) {
          console.warn("Some events were skipped due to duplicate keys (unique index)");
        } else {
          console.error("Failed to insert Scene calendar events:", dbErr && dbErr.message ? dbErr.message : dbErr);
        }
      }
    }
  } catch (err) {
    console.error("scrapeSceneCalendar failed:", err && err.message ? err.message : err);
  } finally {
    if (browser) await browser.close();
    await mongoose.connection.close();
    console.log("scrapeSceneCalendar finished and DB closed.");
  }
}

module.exports = scrapeSceneCalendar;
