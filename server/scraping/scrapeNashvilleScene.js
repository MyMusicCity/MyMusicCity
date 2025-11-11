// server/scraping/scrapeNashvilleScene.js
const path = require("path");
const puppeteer = require("puppeteer");
const mongoose = require("../mongoose");
const Event = require("../models/Event");
const { getEventImage } = require("../utils/eventImages");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI not found in .env file!");
  process.exit(1);
}

async function scrapeDo615() {
  let browser;
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, { dbName: "mymusiccity" });

    console.log("Launching Puppeteer...");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    console.log("Navigating to https://do615.com/events ...");
    await page.goto("https://do615.com/events", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.waitForSelector(".ds-listing.event-card", { timeout: 15000 });
    console.log("Extracting event data...");

    const events = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".ds-listing.event-card"));
      return items.map((el) => {
        const title =
          el.querySelector(".ds-listing-event-title-text")?.textContent?.trim() ||
          "Untitled Event";
        const timeText =
          el.querySelector(".ds-event-time")?.textContent?.trim() || "TBA";
        const location =
          el.querySelector(".ds-venue-name [itemprop='name']")?.textContent?.trim() ||
          "Nashville, TN";
        const image =
          el.querySelector(".ds-cover-image")?.style?.backgroundImage
            ?.replace(/url\(['"]?(.*?)['"]?\)/, "$1") || null;
        const url = el.querySelector(".ds-listing-event-title")?.href || null;

        return {
          title,
          dateText: timeText,
          location,
          image,
          url,
        };
      });
    });

    console.log(`🪄 Found ${events.length} events`);

    if (events.length === 0) {
      console.log("No events found — check selectors or page structure.");
      return;
    }

    // Normalize and prepare data
    function normalizeTitle(s) {
      if (!s) return null;
      return s
        .toString()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[\W_]+/g, " ")
        .trim();
    }

    const formattedEvents = events.map((e, index) => {
      let parsedDate = null;
      try {
        const today = new Date();
        parsedDate = new Date(`${today.toISOString().split("T")[0]} ${e.dateText}`);
        if (isNaN(parsedDate)) parsedDate = today;
      } catch {
        parsedDate = new Date();
      }

      // Use scraped image if available, otherwise generate one based on content
      const eventImage = e.image || getEventImage(e.title, "Scraped from Do615 (Nashville Scene network)", index);

      return {
        title: e.title,
        normalizedTitle: normalizeTitle(e.title),
        description: "Scraped from Do615 (Nashville Scene network)",
        date: parsedDate,
        location: e.location,
        image: eventImage,
        url: e.url,
        createdBy: null, // avoid ObjectId casting issue
        source: "do615", // optional: mark origin
      };
    });

    // Avoid duplicates (check by title OR url)
    const titles = formattedEvents.map((e) => e.title);
    const urls = formattedEvents.map((e) => e.url).filter(Boolean);
    const queryOr = [];
    if (titles.length) queryOr.push({ title: { $in: titles } });
    if (urls.length) queryOr.push({ url: { $in: urls } });
    const existing = queryOr.length ? await Event.find({ $or: queryOr }).select("title url") : [];
    const existingTitles = new Set(existing.map((e) => e.title));
    const existingUrls = new Set(existing.map((e) => e.url).filter(Boolean));

    const newEvents = formattedEvents.filter((e) => {
      if (existingUrls.has(e.url)) return false;
      if (existingTitles.has(e.title)) return false;
      return true;
    });

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
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  }
}

scrapeDo615();
