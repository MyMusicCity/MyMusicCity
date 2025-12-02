const crypto = require('crypto');
const { isValidImageUrl, getHighResVersion } = require('./imageValidator');
const { ConfigManager } = require('../config/imageConfig');

// Enhanced event image selection with configurable context awareness
function getEnhancedEventImage(title, description, venue, date, index = 0) {
  const text = `${title || ''} ${description || ''} ${venue || ''}`.toLowerCase();
  
  // 1. Check for venue-specific images first
  const venueConfig = ConfigManager.getVenueConfig(venue || '');
  if (venueConfig) {
    return venueConfig.imageUrl + '?w=800&h=600&fit=crop&auto=format&q=85';
  }
  
  // 2. Check for artist type patterns
  const artistTypesConfig = ConfigManager.config?.artistTypes;
  if (artistTypesConfig) {
    for (const [artistType, config] of Object.entries(artistTypesConfig)) {
      if (text.includes(artistType)) {
        return config.imageUrl + '?w=800&h=600&fit=crop&auto=format&q=85';
      }
    }
  }
  
  // 3. Time-based selection
  if (date) {
    const timeSlot = ConfigManager.getTimeSlot(date);
    const timeImages = timeSlot.config.images;
    if (timeImages && timeImages.length > 0) {
      return timeImages[index % timeImages.length];
    }
  }
  
  // 4. Fallback to genre-based selection
  return getGenreBasedImage(text, index);
}

// Genre-based fallback system using configuration
function getGenreBasedImage(text, index) {
  const genres = ConfigManager.config?.genres;
  
  if (genres) {
    // Detect genre from text using configuration
    for (const [genre, config] of Object.entries(genres)) {
      if (config.keywords && config.keywords.some(keyword => text.includes(keyword))) {
        return config.images[index % config.images.length];
      }
    }
  }
  
  // Default to general music images as fallback
  const generalImages = [
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&auto=format&q=85',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&auto=format&q=85',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&auto=format&q=85',
    'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&h=600&fit=crop&auto=format&q=85',
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop&auto=format&q=85'
  ];
  
  return generalImages[index % generalImages.length];
}

// Generate consistent fallback image based on event ID
function getFallbackImage(eventId, eventData = {}) {
  const hash = crypto.createHash('md5').update((eventId || 'default').toString()).digest('hex');
  const fallbackIndex = parseInt(hash.slice(0, 8), 16) % 5;
  
  return getEnhancedEventImage(
    eventData.title || '',
    eventData.description || '',
    eventData.venue || '',
    eventData.date,
    fallbackIndex
  );
}

// Check if event is high-profile (for priority processing)
function isHighProfileEvent(event) {
  const venueConfig = ConfigManager.getVenueConfig(event.venue || '');
  return venueConfig && venueConfig.priority === 'high';
}

module.exports = {
  getEnhancedEventImage,
  getFallbackImage,
  isHighProfileEvent,
  getGenreBasedImage
};