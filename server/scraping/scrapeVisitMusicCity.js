const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const mongoose = require("../mongoose");
const Event = require("../models/Event");
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
        const image = $el.find("img").attr("src") || null;
        const link = $el.find("a").attr("href") || null;
        const fullUrl = link && link.startsWith("http") ? link : (link ? new URL(link, url).toString() : url);

        if (title) events.push({ title, dateText, location, image, url: fullUrl });
      });
    }

    if (!html || events.length === 0) {
      console.log("No items found with Axios/Cheerio on VisitMusicCity; falling back to Puppeteer...");
      browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
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
          const img = el.querySelector("img")?.src || null;
          const link = el.querySelector("a")?.href || null;
          return { title, dateText, location, image: img, url: link };
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

    const normalized = events.map((e) => {
      let parsedDate = new Date();
      try {
        const maybe = new Date(e.dateText);
        if (!isNaN(maybe)) parsedDate = maybe;
      } catch {}

      return {
        title: (e.title || "Untitled Event").trim(),
        description: "Scraped from Visit Music City",
        date: parsedDate,
        location: e.location || "Nashville, TN",
        image: e.image || null,
        url: e.url || url,
        normalizedTitle: normalizeTitle(e.title || ""),
        createdBy: null,
        source: "visitmusiccity",
      };
    });

    if (normalized.length === 0) {
      console.log("No normalized events to save for Visit Music City.");
      return;
    }

    const titles = normalized.map((e) => e.title);
    const urls = normalized.map((e) => e.url).filter(Boolean);
    const queryOr = [];
    if (titles.length) queryOr.push({ title: { $in: titles } });
    if (urls.length) queryOr.push({ url: { $in: urls } });
    const existing = queryOr.length ? await Event.find({ $or: queryOr }).select("title url") : [];
    const existingTitles = new Set(existing.map((x) => x.title));
    const existingUrls = new Set(existing.map((x) => x.url).filter(Boolean));
    const newEvents = normalized.filter((e) => {
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
