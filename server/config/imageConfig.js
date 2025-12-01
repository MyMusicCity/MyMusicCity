// Configuration system for enhanced image processing
// This makes venues, genres, and image sources configurable rather than hard-coded

const config = {
  // Image processing settings
  imageProcessing: {
    timeout: 10000, // 10 seconds
    maxRetries: 3,
    cacheEnabled: true,
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxCacheSize: 1000,
    highResConversion: true,
    qualityThresholds: {
      minFileSize: 5 * 1024, // 5KB
      minWidth: 200,
      minHeight: 150,
      preferredWidth: 800,
      preferredHeight: 600
    }
  },

  // Nashville venue configuration
  venues: {
    // Major venues with specific imagery
    'ryman auditorium': {
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7',
      priority: 'high',
      genres: ['country', 'folk', 'bluegrass', 'americana']
    },
    'grand ole opry': {
      imageUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14',
      priority: 'high',
      genres: ['country', 'folk', 'bluegrass']
    },
    'the bluebird cafe': {
      imageUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae',
      priority: 'high',
      genres: ['folk', 'acoustic', 'singer-songwriter']
    },
    'tpac': {
      imageUrl: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76',
      priority: 'high',
      genres: ['classical', 'opera', 'musical-theatre']
    },
    'music city center': {
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
      priority: 'medium',
      genres: ['conference', 'exhibition']
    },
    'bridgestone arena': {
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745',
      priority: 'high',
      genres: ['rock', 'pop', 'hip-hop', 'arena-rock']
    },
    'nissan stadium': {
      imageUrl: 'https://images.unsplash.com/photo-1459865264687-595d652de67e',
      priority: 'high',
      genres: ['stadium-rock', 'country', 'festival']
    },
    'ascend amphitheater': {
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
      priority: 'high',
      genres: ['rock', 'pop', 'country', 'festival']
    },
    'the listening room': {
      imageUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae',
      priority: 'medium',
      genres: ['acoustic', 'singer-songwriter', 'folk']
    },
    'marathon music works': {
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
      priority: 'medium',
      genres: ['indie', 'alternative', 'rock']
    },
    'exit/in': {
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745',
      priority: 'medium',
      genres: ['indie', 'alternative', 'punk', 'rock']
    },
    'the basement': {
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
      priority: 'medium',
      genres: ['indie', 'alternative', 'rock']
    },
    'mercy lounge': {
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7',
      priority: 'medium',
      genres: ['indie', 'alternative', 'rock']
    },
    '3rd and lindsley': {
      imageUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae',
      priority: 'medium',
      genres: ['blues', 'rock', 'indie']
    },
    'the station inn': {
      imageUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14',
      priority: 'medium',
      genres: ['bluegrass', 'country', 'folk']
    }
  },

  // Genre-based image mappings
  genres: {
    country: {
      images: [
        'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=600&fit=crop&auto=format&q=85',
        'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop&auto=format&q=85'
      ],
      keywords: ['country', 'nashville', 'honky tonk', 'acoustic', 'banjo', 'fiddle']
    },
    rock: {
      images: [
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&auto=format&q=85',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&auto=format&q=85'
      ],
      keywords: ['rock', 'guitar', 'electric', 'band', 'concert']
    },
    jazz: {
      images: [
        'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&h=600&fit=crop&auto=format&q=85',
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&auto=format&q=85'
      ],
      keywords: ['jazz', 'saxophone', 'piano', 'blues', 'improvisation']
    },
    blues: {
      images: [
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&auto=format&q=85',
        'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop&auto=format&q=85'
      ],
      keywords: ['blues', 'guitar', 'harmonica', 'soul']
    },
    folk: {
      images: [
        'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop&auto=format&q=85',
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop&auto=format&q=85'
      ],
      keywords: ['folk', 'acoustic', 'singer-songwriter', 'storytelling']
    },
    classical: {
      images: [
        'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&h=600&fit=crop&auto=format&q=85'
      ],
      keywords: ['classical', 'orchestra', 'symphony', 'piano', 'violin']
    }
  },

  // Artist type patterns
  artistTypes: {
    'tribute band': {
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
      keywords: ['tribute', 'covers', 'impersonator']
    },
    'cover band': {
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745',
      keywords: ['cover', 'covers', 'tribute']
    },
    'solo artist': {
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
      keywords: ['solo', 'singer-songwriter', 'acoustic']
    },
    'acoustic': {
      imageUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae',
      keywords: ['acoustic', 'unplugged', 'singer-songwriter']
    },
    'duo': {
      imageUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae',
      keywords: ['duo', 'pair', 'two']
    },
    'trio': {
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
      keywords: ['trio', 'three', 'group']
    },
    'orchestra': {
      imageUrl: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76',
      keywords: ['orchestra', 'symphony', 'classical', 'ensemble']
    }
  },

  // Time-based image selection
  timeSlots: {
    morning: {
      hours: [6, 7, 8, 9, 10, 11],
      images: [
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&auto=format&q=85',
        'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop&auto=format&q=85'
      ]
    },
    afternoon: {
      hours: [12, 13, 14, 15, 16],
      images: [
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&auto=format&q=85',
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop&auto=format&q=85'
      ]
    },
    evening: {
      hours: [17, 18, 19, 20, 21],
      images: [
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&auto=format&q=85',
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&auto=format&q=85',
        'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&h=600&fit=crop&auto=format&q=85'
      ]
    },
    night: {
      hours: [22, 23, 0, 1, 2, 3, 4, 5],
      images: [
        'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=600&fit=crop&auto=format&q=85',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&auto=format&q=85'
      ]
    }
  },

  // Image sources configuration
  imageSources: {
    primary: 'unsplash',
    fallback: ['pexels', 'pixabay'], // Future enhancement
    unsplash: {
      baseUrl: 'https://images.unsplash.com',
      defaultParams: '?w=800&h=600&fit=crop&auto=format&q=85'
    }
  },

  // Scraper-specific settings
  scrapers: {
    nashvilleScene: {
      selectors: {
        images: ['.ds-cover-image', 'img[src]', '[data-image]', '[data-src]'],
        backgroundImages: ['[style*="background-image"]'],
        containers: ['.ds-listing.event-card', '.event-item']
      },
      timeout: 15000
    },
    visitMusicCity: {
      selectors: {
        images: ['.event-image img', '.calendar-event-image img', '.event-photo img'],
        containers: ['.event', '.card', '.listing', 'article', '.vmc-event']
      },
      timeout: 20000
    },
    sceneCalendar: {
      selectors: {
        images: ['img[src]', '[data-image]'],
        containers: ['.event', '.calendar-item', '.listing'],
        anchors: ["a[href*='#/details']", "a[href*='/calendar/#/details']"]
      },
      timeout: 10000
    }
  }
};

// Utility functions for configuration access
const ConfigManager = {
  getVenueConfig(venueName) {
    const normalizedName = venueName.toLowerCase();
    return config.venues[normalizedName] || null;
  },

  getGenreConfig(genre) {
    const normalizedGenre = genre.toLowerCase();
    return config.genres[normalizedGenre] || null;
  },

  getTimeSlot(date) {
    const hour = new Date(date).getHours();
    for (const [slot, timeConfig] of Object.entries(config.timeSlots)) {
      if (timeConfig.hours.includes(hour)) {
        return { name: slot, config: timeConfig };
      }
    }
    return { name: 'evening', config: config.timeSlots.evening }; // Default
  },

  getScraperConfig(scraperName) {
    return config.scrapers[scraperName] || {};
  },

  getImageProcessingConfig() {
    return config.imageProcessing;
  },

  // Add new venue dynamically
  addVenue(name, venueConfig) {
    config.venues[name.toLowerCase()] = venueConfig;
  },

  // Update existing configuration
  updateConfig(path, value) {
    const keys = path.split('.');
    let current = config;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
};

module.exports = {
  config,
  ConfigManager
};