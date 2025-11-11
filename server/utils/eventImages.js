// utils/eventImages.js
// Helper to match events with appropriate images based on their content

const musicGenreImages = {
  // Rock/Indie images - Back to high-quality music photos
  rock: [
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&auto=format", // Rock concert crowd
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&auto=format", // Guitar on stage
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&auto=format", // Band performing
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&auto=format", // Electric guitar close-up
  ],
  indie: [
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=600&fit=crop&auto=format", // Indie band setup
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&auto=format", // Small venue stage
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&auto=format", // Intimate concert
    "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800&h=600&fit=crop&auto=format", // Indie venue atmosphere
  ],
  
  // Jazz images
  jazz: [
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop&auto=format", // Saxophone close-up
    "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop&auto=format", // Jazz club atmosphere
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&auto=format", // Piano and sax
    "https://images.unsplash.com/photo-1618609377864-68609b857e90?w=800&h=600&fit=crop&auto=format", // Jazz musicians
  ],
  
  // Hip-hop images
  hiphop: [
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&auto=format", // Rapper on stage
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&auto=format", // Urban concert
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&auto=format", // DJ setup
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=600&fit=crop&auto=format", // Hip hop event
  ],
  
  // Country images
  country: [
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&auto=format", // Country venue
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&auto=format", // Acoustic guitar
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=600&fit=crop&auto=format", // Honky tonk
    "https://images.unsplash.com/photo-1520637836862-4d197d17c89a?w=800&h=600&fit=crop&auto=format", // Country guitar
  ],
  
  // Electronic/DJ images
  electronic: [
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&auto=format", // DJ booth
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&auto=format", // Electronic setup
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&auto=format", // Dance floor
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&auto=format", // DJ mixing
  ],
  
  // General music images
  general: [
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&auto=format", // Concert crowd
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=600&fit=crop&auto=format", // Stage lights
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&auto=format", // Live performance
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&auto=format", // Music equipment
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&auto=format", // Venue atmosphere
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&auto=format", // Musical instruments
  ]
};

// Function to detect genre from event title and description
function detectGenre(title, description = "") {
  const text = (title + " " + description).toLowerCase();
  
  // Check for specific genre keywords
  if (text.includes("jazz") || text.includes("saxophone") || text.includes("blues")) return "jazz";
  if (text.includes("hip-hop") || text.includes("hip hop") || text.includes("rap") || text.includes("rapper")) return "hiphop";
  if (text.includes("indie") || text.includes("independent")) return "indie";
  if (text.includes("rock") || text.includes("metal") || text.includes("punk")) return "rock";
  if (text.includes("country") || text.includes("folk") || text.includes("bluegrass")) return "country";
  if (text.includes("electronic") || text.includes("dj") || text.includes("edm") || text.includes("techno") || text.includes("house")) return "electronic";
  
  // Default to general
  return "general";
}

// Function to get a random image for an event
function getEventImage(title, description = "", index = 0) {
  const genre = detectGenre(title, description);
  const images = musicGenreImages[genre];
  
  // Use index to ensure different images for different events, but consistent for same event
  const imageIndex = index % images.length;
  return images[imageIndex];
}

module.exports = {
  getEventImage,
  detectGenre,
  musicGenreImages
};