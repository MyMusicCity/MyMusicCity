// server/scraping/scrapeNashvilleScene.js
const path = require("path");
const puppeteer = require("puppeteer");
const mongoose = require("../mongoose");
const Event = require("../models/Event");
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
    const formattedEvents = events.map((e) => {
      let parsedDate = null;
      try {
        const today = new Date();
        parsedDate = new Date(`${today.toISOString().split("T")[0]} ${e.dateText}`);
        if (isNaN(parsedDate)) parsedDate = today;
      } catch {
        parsedDate = new Date();
      }

      return {
        title: e.title,
        description: "Scraped from Do615 (Nashville Scene network)",
        date: parsedDate,
        location: e.location,
        image: e.image,
        url: e.url,
        createdBy: null, // avoid ObjectId casting issue
        source: "do615", // optional: mark origin
      };
    });

    // Avoid duplicates
    const titles = formattedEvents.map((e) => e.title);
    const existing = await Event.find({ title: { $in: titles } }).select("title");
    const existingTitles = new Set(existing.map((e) => e.title));

    const newEvents = formattedEvents.filter((e) => !existingTitles.has(e.title));

    if (newEvents.length === 0) {
      console.log("No new events to add (all already exist)");
    } else {
      await Event.insertMany(newEvents);
      console.log(`Added ${newEvents.length} new events to the database`);
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
