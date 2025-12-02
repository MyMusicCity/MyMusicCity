const { isValidImageUrl, validateImageQuality, getHighResVersion } = require('./imageValidator');
const { getFallbackImage, getEnhancedEventImage, isHighProfileEvent } = require('./enhancedEventImages');
const { ConfigManager } = require('../config/imageConfig');

class ImageProcessor {
  constructor() {
    this.cache = new Map();
    this.processingQueue = [];
    this.maxConcurrent = 3;
    this.currentProcessing = 0;
    this.stats = {
      processed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      enhanced: 0,
      fallbacks: 0
    };
    
    // Initialize cache cleanup
    this.startCacheCleanup();
  }

  // Start periodic cache cleanup
  startCacheCleanup() {
    const config = ConfigManager.getImageProcessingConfig();
    if (config.cacheEnabled && process.env.NODE_ENV !== 'test') {
      // Only start cleanup in non-test environments to prevent Jest hanging
      this.cleanupInterval = setInterval(() => {
        this.cleanupCache();
      }, config.cacheTTL / 4); // Cleanup every quarter of TTL
      
      // Make sure the interval doesn't keep Node.js alive unnecessarily
      this.cleanupInterval.unref();
    }
  }
  
  // Stop cache cleanup (useful for tests and graceful shutdown)
  stopCacheCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Clean up expired cache entries and enforce size limits
  cleanupCache() {
    const config = ConfigManager.getImageProcessingConfig();
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp && (now - value.timestamp) > config.cacheTTL) {
        this.cache.delete(key);
      }
    }
    
    // Enforce max cache size (LRU eviction)
    if (this.cache.size > config.maxCacheSize) {
      const sortedEntries = [...this.cache.entries()].sort((a, b) => 
        (a[1].timestamp || 0) - (b[1].timestamp || 0)
      );
      
      const entriesToRemove = this.cache.size - config.maxCacheSize;
      for (let i = 0; i < entriesToRemove; i++) {
        this.cache.delete(sortedEntries[i][0]);
      }
    }
  }

  // Process image with full pipeline
  async processEventImage(imageUrl, eventData, options = {}) {
    const config = ConfigManager.getImageProcessingConfig();
    const { useCache = config.cacheEnabled, priority = false } = options;
    
    this.stats.processed++;
    
    // Check cache first
    const cacheKey = this.getCacheKey(imageUrl, eventData);
    if (useCache && this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      const cached = this.cache.get(cacheKey);
      // Update timestamp for LRU
      cached.timestamp = Date.now();
      return cached;
    }
    
    this.stats.cacheMisses++;
    
    try {
      const result = await this._processImageInternal(imageUrl, eventData, priority);
      
      // Cache the result with timestamp
      if (useCache && result.url) {
        result.timestamp = Date.now();
        this.cache.set(cacheKey, result);
      }
      
      if (result.source === 'scraped') {
        this.stats.enhanced++;
      } else {
        this.stats.fallbacks++;
      }
      
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('Image processing error:', error.message);
      return this.getFallbackResult(eventData);
    }
  }

  // Internal processing logic
  async _processImageInternal(imageUrl, eventData, priority = false) {
    // Step 1: Validate URL
    if (!imageUrl || !isValidImageUrl(imageUrl)) {
      return this.getFallbackResult(eventData);
    }

    // Step 2: Quality validation
    const validation = await validateImageQuality(imageUrl);
    if (!validation.isValid) {
      console.log(`Image validation failed for ${imageUrl}: ${validation.reason}`);
      return this.getFallbackResult(eventData);
    }

    // Step 3: Try to get high-res version
    let finalUrl = imageUrl;
    try {
      const highResUrl = getHighResVersion(imageUrl);
      if (highResUrl !== imageUrl) {
        const highResValidation = await validateImageQuality(highResUrl);
        if (highResValidation.isValid) {
          finalUrl = highResUrl;
        }
      }
    } catch (error) {
      console.log(`High-res conversion failed for ${imageUrl}, using original`);
    }

    return {
      url: finalUrl,
      quality: validation.quality,
      source: 'scraped',
      processedAt: new Date().toISOString()
    };
  }

  // Generate fallback result
  getFallbackResult(eventData) {
    const fallbackUrl = getFallbackImage(
      eventData.id || eventData.title,
      eventData
    );

    return {
      url: fallbackUrl,
      quality: 'fallback',
      source: 'generated',
      processedAt: new Date().toISOString()
    };
  }

  // Generate cache key
  getCacheKey(imageUrl, eventData) {
    return `${imageUrl || 'null'}_${eventData.id || eventData.title || 'default'}`;
  }

  // Process multiple images with priority
  async processEventImages(imageUrls, eventData, options = {}) {
    const { maxAttempts = 3 } = options;
    const priority = isHighProfileEvent(eventData);
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return this.getFallbackResult(eventData);
    }

    // Try each URL until we find a valid one
    for (let i = 0; i < Math.min(imageUrls.length, maxAttempts); i++) {
      const result = await this.processEventImage(imageUrls[i], eventData, { priority });
      
      // If we got a valid scraped image, use it
      if (result.source === 'scraped') {
        return result;
      }
    }

    // If no scraped images worked, return fallback
    return this.getFallbackResult(eventData);
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache stats with enhanced metrics
  getCacheStats() {
    return {
      size: this.cache.size,
      stats: { ...this.stats },
      hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0,
      enhancementRate: this.stats.enhanced / this.stats.processed || 0,
      errorRate: this.stats.errors / this.stats.processed || 0,
      recentKeys: Array.from(this.cache.keys()).slice(-5) // Last 5 keys for debugging
    };
  }

  // Reset stats
  resetStats() {
    this.stats = {
      processed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      enhanced: 0,
      fallbacks: 0
    };
  }
}

// Enhanced image extraction functions for scrapers
const imageExtractionStrategies = {
  
  // Nashville Scene image extraction
  nashvilleScene: async (page, eventElement) => {
    const images = [];
    
    try {
      // Strategy 1: Direct image selectors
      const directImages = await eventElement.$$eval(
        'img[src*="nashvillescene"], img[src*="static"], .event-image img, .ds-cover-image img',
        imgs => imgs.map(img => img.src).filter(src => src && !src.includes('placeholder'))
      );
      images.push(...directImages);

      // Strategy 2: Background images
      const bgImages = await eventElement.$$eval(
        '.ds-cover-image, .event-cover, .hero-image, [style*="background-image"]',
        elements => {
          return elements.map(el => {
            const style = getComputedStyle(el);
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none') {
              const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
              return match ? match[1] : null;
            }
            return null;
          }).filter(Boolean);
        }
      );
      images.push(...bgImages);

      // Strategy 3: Data attributes
      const dataImages = await eventElement.$$eval(
        '[data-image], [data-src], [data-background]',
        elements => elements.map(el => 
          el.dataset.image || el.dataset.src || el.dataset.background
        ).filter(Boolean)
      );
      images.push(...dataImages);

      // Strategy 4: Venue or artist images
      const venueImages = await eventElement.$$eval(
        '.venue-image img, .artist-image img, .event-photo img',
        imgs => imgs.map(img => img.src).filter(src => src && !src.includes('placeholder'))
      );
      images.push(...venueImages);

    } catch (error) {
      console.error('Nashville Scene image extraction error:', error);
    }
    
    return [...new Set(images)]; // Remove duplicates
  },

  // Visit Music City image extraction
  visitMusicCity: async ($, element) => {
    const images = [];
    
    try {
      // Strategy 1: Direct image sources
      $(element).find('img').each((i, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !src.includes('placeholder') && !src.includes('loading')) {
          images.push(src.startsWith('//') ? 'https:' + src : src);
        }
      });

      // Strategy 2: Background images from style attributes
      $(element).find('[style*="background-image"]').each((i, el) => {
        const style = $(el).attr('style');
        if (style) {
          const match = style.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/);
          if (match) {
            images.push(match[1]);
          }
        }
      });

      // Strategy 3: Specific selectors for Visit Music City
      const specificSelectors = [
        '.event-image img',
        '.calendar-event-image img',
        '.event-photo img',
        '.listing-image img',
        '.attraction-image img'
      ];

      specificSelectors.forEach(selector => {
        $(element).find(selector).each((i, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src');
          if (src && !src.includes('placeholder')) {
            images.push(src.startsWith('//') ? 'https:' + src : src);
          }
        });
      });

    } catch (error) {
      console.error('Visit Music City image extraction error:', error);
    }
    
    return [...new Set(images)]; // Remove duplicates
  },

  // Generic image extraction for other sources
  generic: async (page, eventElement) => {
    const images = [];
    
    try {
      // Common image selectors
      const commonSelectors = [
        'img[src]',
        '.event-image img',
        '.hero img',
        '.cover img',
        '.photo img',
        '[style*="background-image"]'
      ];

      for (const selector of commonSelectors) {
        const selectorImages = await eventElement.$$eval(
          selector,
          (elements, sel) => {
            return elements.map(el => {
              if (sel.includes('background-image')) {
                const style = getComputedStyle(el);
                const bgImage = style.backgroundImage;
                if (bgImage && bgImage !== 'none') {
                  const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
                  return match ? match[1] : null;
                }
                return null;
              } else {
                return el.src || el.dataset.src || el.dataset.image;
              }
            }).filter(Boolean);
          },
          selector
        );
        images.push(...selectorImages);
      }

    } catch (error) {
      console.error('Generic image extraction error:', error);
    }
    
    return [...new Set(images)]; // Remove duplicates
  }
};

// Create singleton instance
const imageProcessor = new ImageProcessor();

// Graceful cleanup for tests
process.on('exit', () => {
  if (imageProcessor) {
    imageProcessor.stopCacheCleanup();
  }
});

module.exports = {
  ImageProcessor,
  imageProcessor,
  imageExtractionStrategies
};