// server/utils/gracefulScraper.js
// Wrapper for scrapers with graceful failure handling

const { getEventImage } = require('./eventImages');

/**
 * Graceful scraper that can fall back to creating sample events if scraping fails
 */
class GracefulScraper {
  constructor(scraperName) {
    this.scraperName = scraperName;
  }

  /**
   * Execute a scraper function with graceful error handling
   */
  async execute(scraperFunction, fallbackEvents = []) {
    try {
      console.log(`Starting ${this.scraperName} scraper...`);
      await scraperFunction();
      console.log(`${this.scraperName} scraper completed successfully`);
    } catch (error) {
      console.error(`${this.scraperName} scraper failed:`, error.message);
      
      // If we have fallback events, try to create them
      if (fallbackEvents.length > 0) {
        console.log(`Creating ${fallbackEvents.length} fallback events for ${this.scraperName}...`);
        await this.createFallbackEvents(fallbackEvents);
      } else {
        console.log(`No fallback events available for ${this.scraperName}`);
      }
    }
  }

  /**
   * Create fallback events when scraping fails
   */
  async createFallbackEvents(events) {
    const Event = require('../models/Event');
    
    try {
      // Add images to fallback events
      const eventsWithImages = events.map((event, index) => ({
        ...event,
        image: event.image || getEventImage(event.title, event.description, index),
        source: `${this.scraperName}-fallback`
      }));

      // Check for duplicates
      const titles = eventsWithImages.map(e => e.title);
      const existing = await Event.find({ title: { $in: titles } }).select('title');
      const existingTitles = new Set(existing.map(e => e.title));
      
      const newEvents = eventsWithImages.filter(e => !existingTitles.has(e.title));
      
      if (newEvents.length > 0) {
        await Event.insertMany(newEvents, { ordered: false });
        console.log(`Created ${newEvents.length} fallback events for ${this.scraperName}`);
      } else {
        console.log(`All fallback events for ${this.scraperName} already exist`);
      }
    } catch (fallbackError) {
      console.error(`Failed to create fallback events for ${this.scraperName}:`, fallbackError.message);
    }
  }
}

module.exports = GracefulScraper;