// utils/musicClassifier.js
// Automated music event detection and genre classification

const { detectGenre } = require('./eventImages');

// Keywords that indicate an event is music-related
const musicKeywords = [
  // General music terms
  'concert', 'music', 'band', 'singer', 'musician', 'artist', 'performance', 'show',
  'live music', 'acoustic', 'unplugged', 'open mic', 'jam session', 'karaoke',
  
  // Instruments
  'guitar', 'piano', 'drums', 'bass', 'violin', 'saxophone', 'trumpet', 'keyboard',
  'harmonica', 'banjo', 'fiddle', 'mandolin', 'vocals', 'singing',
  
  // Genres and styles
  'rock', 'pop', 'country', 'jazz', 'blues', 'folk', 'indie', 'alternative',
  'hip-hop', 'rap', 'r&b', 'soul', 'funk', 'reggae', 'electronic', 'techno',
  'house', 'edm', 'classical', 'opera', 'bluegrass', 'punk', 'metal',
  
  // Event types
  'festival', 'concert hall', 'amphitheater', 'club', 'venue', 'stage',
  'auditorium', 'theater', 'arena', 'pavilion', 'outdoor concert',
  
  // DJ and electronic
  'dj', 'disc jockey', 'turntables', 'mixing', 'beats', 'club night',
  'dance music', 'rave', 'club scene'
];

// Keywords that indicate NON-music events (to filter out)
const nonMusicKeywords = [
  'comedy', 'standup', 'comedian', 'theater', 'play', 'drama', 'musical theater',
  'sports', 'football', 'basketball', 'baseball', 'soccer', 'hockey', 'tennis',
  'lecture', 'seminar', 'conference', 'workshop', 'meeting', 'business',
  'art gallery', 'exhibition', 'museum', 'painting', 'sculpture',
  'food', 'restaurant', 'dining', 'cooking', 'culinary', 'wine tasting',
  'market', 'shopping', 'sale', 'vendor', 'craft fair',
  'movie', 'film', 'cinema', 'screening', 'catering',
  // Holiday/seasonal non-music events
  'lights', 'holiday lights', 'christmas lights', 'zoolumination', 'light display',
  'tour', 'tours', 'sightseeing', 'guided tour', 'distillery tour',
  // Other non-music activities  
  'trivia', 'quiz', 'game night', 'bingo', 'karaoke night',
  'networking', 'meetup', 'social event', 'party planning',
  'hotel', 'accommodation', 'lodging', 'stay',
  'photography', 'photos', 'exhibition', 'visual art',
  'nintendo', 'gaming', 'esports', 'video game'
];

// Nashville-specific music venues
const nashvilleMusicVenues = [
  // Major venues
  'ryman auditorium', 'grand ole opry', 'bridgestone arena', 'ascend amphitheater',
  'nissan stadium', 'municipal auditorium', 'war memorial auditorium',
  'schermerhorn symphony center', 'music city center',
  
  // Historic venues  
  'the bluebird cafe', 'station inn', 'tootsies', 'tootsies orchid lounge',
  'robert\'s western world', 'the stage on broadway', 'rippy rooftop bar',
  
  // Contemporary venues
  'exit/in', 'mercy lounge', 'cannery ballroom', 'marathon music works',
  'the basement', 'the basement east', 'the end', '3rd & lindsley',
  'the listening room', 'city winery', 'the woods amphitheater',
  
  // Clubs and smaller venues  
  'acme feed and seed', 'the 5 spot', 'drkmttr', 'eastside bowl',
  'the continental mid-town', 'the gulch', 'music valley',
  
  // Broadway area
  'honky tonk central', 'broadway', 'lower broadway', 'the district',
  'printer\'s alley', 'second fiddle', 'layla\'s',
  
  // Music Row and surrounding
  'music row', 'elliston place', 'the end', 'exit/in',
  
  // Outdoor venues
  'centennial park', 'musicians corner', 'riverfront park', 'bicentennial park',
  
  // Hotels with music venues
  'gaylord opryland', 'union station', 'omni nashville', 'the hermitage hotel'
];

/**
 * Determines if an event is music-related based on title, description, and location
 * @param {string} title - Event title
 * @param {string} description - Event description (optional)
 * @param {string} location - Event location (optional)
 * @returns {boolean} - True if event appears to be music-related
 */
function isMusicEvent(title, description = "", location = "") {
  const text = (title + " " + description + " " + location).toLowerCase();
  
  // Check for Nashville music venues first (high confidence)
  for (const venue of nashvilleMusicVenues) {
    if (text.includes(venue.toLowerCase())) {
      return true;
    }
  }
  
  // Count positive and negative indicators
  let musicScore = 0;
  let nonMusicScore = 0;
  
  // Check for music keywords
  for (const keyword of musicKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      musicScore++;
    }
  }
  
  // Check for non-music keywords
  for (const keyword of nonMusicKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      nonMusicScore += 2; // Weight non-music indicators more heavily
    }
  }
  
  // Decision logic: music event if music score > non-music score AND music score > 0
  // OR if it's from a known Nashville source (be more permissive for Nashville events)
  const isFromNashvilleSource = location.toLowerCase().includes('nashville') || 
                               location.toLowerCase().includes('music city') ||
                               text.includes('nashville') ||
                               text.includes('music city');
                               
  // More permissive logic for Nashville events
  if (isFromNashvilleSource && musicScore > 0 && nonMusicScore < 3) {
    return true;
  }
  
  // DO NOT assume everything from Nashville is music - be more selective
  if (isFromNashvilleSource && musicScore === 0 && nonMusicScore === 0) {
    // If no clear indicators either way, check for venue-based classification
    for (const venue of nashvilleMusicVenues) {
      if (text.includes(venue.toLowerCase())) {
        return true; // Only assume music for known music venues
      }
    }
    return false; // Default to NOT music if no clear indicators
  }
  
  // Original logic for other events
  return musicScore > nonMusicScore && musicScore > 0;
}

/**
 * Classifies the type of music event
 * @param {string} title - Event title
 * @param {string} description - Event description (optional)
 * @param {string} location - Event location (optional)
 * @returns {string} - Type of music event
 */
function classifyMusicType(title, description = "", location = "") {
  const text = (title + " " + description + " " + location).toLowerCase();
  
  // Festival indicators
  if (text.includes('festival') || text.includes('fest') || text.includes('multi-day')) {
    return 'festival';
  }
  
  // DJ/Electronic indicators
  if (text.includes('dj') || text.includes('electronic') || text.includes('edm') || 
      text.includes('club night') || text.includes('dance music')) {
    return 'dj-set';
  }
  
  // Open mic indicators
  if (text.includes('open mic') || text.includes('open mike') || text.includes('karaoke')) {
    return 'open-mic';
  }
  
  // Acoustic indicators
  if (text.includes('acoustic') || text.includes('unplugged') || text.includes('intimate')) {
    return 'acoustic';
  }
  
  // Jam session indicators
  if (text.includes('jam') || text.includes('session') || text.includes('improvisation')) {
    return 'jam-session';
  }
  
  // Default to concert
  return 'concert';
}

/**
 * Extracts venue name from location string
 * @param {string} location - Full location string
 * @returns {string} - Extracted venue name
 */
function extractVenue(location = "") {
  if (!location) return "";
  
  // Split by common delimiters and take the first part (usually venue name)
  const parts = location.split(/[,\-\|]/);
  return parts[0].trim();
}

/**
 * Complete classification of an event for music filtering
 * @param {Object} event - Event object with title, description, location
 * @returns {Object} - Classification result
 */
function classifyEvent(event) {
  const { title, description, location } = event;
  
  const isMusic = isMusicEvent(title, description, location);
  
  if (!isMusic) {
    return {
      isMusic: false,
      genre: null,
      musicType: null,
      venue: null
    };
  }
  
  return {
    isMusic: true,
    genre: detectGenre(title, description), // Use existing genre detection from eventImages.js
    musicType: classifyMusicType(title, description, location),
    venue: extractVenue(location)
  };
}

/**
 * Bypass function for debugging - always returns true
 * Use this temporarily to disable music filtering
 */
function bypassMusicFilter() {
  return true;
}

module.exports = {
  isMusicEvent,
  classifyMusicType,
  extractVenue,
  classifyEvent,
  bypassMusicFilter,
  musicKeywords,
  nonMusicKeywords,
  nashvilleMusicVenues
};