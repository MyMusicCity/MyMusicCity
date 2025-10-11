// server/scraping/scrapeNashvilleScene.js
const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("../mongoose");
const Event = require("../models/Event");
require("dotenv").config();

const TARGET_URL = "https://www.nashvillescene.com/music/events/";

async function scrapeNashvilleScene() {
  try {
    console.log("🌐 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, { dbName: "mymusiccity" });

    console.log("📄 Fetching event listings...");
    const { data } = await axios.get(TARGET_URL);
    const $ = cheerio.load(data);

    const events = [];

    // These selectors may need tweaking depending on the site's structure
    $(".event-listing, .event-item, article").each((_, el) => {
      const title =
        $(el).find("h2, .event-title, .listing-title").first().text().trim();
      const date =
        $(el).find(".event-date, time, .listing-date").first().text().trim();
      const location =
        $(el).find(".event-location, .venue-name").first().text().trim();

      if (title && date) {
        events.push({
          title,
          description: "Scraped from Nashville Scene",
          date,
          location: location || "Nashville, TN",
          createdBy: null, // optional: you can assign a system user later
        });
      }
    });

    console.log(`🪄 Found ${events.length} events`);
    if (events.length === 0) {
      console.log("⚠️ No events found — check HTML selectors");
      return;
    }

    // Optional: prevent duplicate titles
    const titles = events.map((e) => e.title);
    const existing = await Event.find({ title: { $in: titles } }).select("title");
    const existingTitles = new Set(existing.map((e) => e.title));

    const newEvents = events.filter((e) => !existingTitles.has(e.title));
    if (newEvents.length === 0) {
      console.log("✅ No new events to add (all already exist)");
    } else {
      await Event.insertMany(newEvents);
      console.log(`✅ Added ${newEvents.length} new events`);
    }
  } catch (err) {
    console.error("❌ Scrape failed:", err.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed.");
  }
}

scrapeNashvilleScene();
