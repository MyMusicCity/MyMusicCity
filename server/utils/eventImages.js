// utils/eventImages.js
// Helper to match events with appropriate images based on their content

const musicGenreImages = {
  // Rock/Indie images - Using reliable stock photo services
  rock: [
    "https://picsum.photos/800/600?random=1", // Concert crowd
    "https://picsum.photos/800/600?random=2", // Guitar on stage
    "https://picsum.photos/800/600?random=3", // Band performing
    "https://picsum.photos/800/600?random=4", // Electric guitar close-up
  ],
  indie: [
    "https://picsum.photos/800/600?random=5", // Indie band setup
    "https://picsum.photos/800/600?random=6", // Small venue stage
    "https://picsum.photos/800/600?random=7", // Intimate concert
    "https://picsum.photos/800/600?random=8", // Indie venue atmosphere
  ],
  
  // Jazz images
  jazz: [
    "https://picsum.photos/800/600?random=9", // Saxophone close-up
    "https://picsum.photos/800/600?random=10", // Jazz club atmosphere
    "https://picsum.photos/800/600?random=11", // Piano and sax
    "https://picsum.photos/800/600?random=12", // Jazz musicians
  ],
  
  // Hip-hop images
  hiphop: [
    "https://picsum.photos/800/600?random=13", // Rapper on stage
    "https://picsum.photos/800/600?random=14", // Urban concert
    "https://picsum.photos/800/600?random=15", // DJ setup
    "https://picsum.photos/800/600?random=16", // Hip hop event
  ],
  
  // Country images
  country: [
    "https://picsum.photos/800/600?random=17", // Country venue
    "https://picsum.photos/800/600?random=18", // Acoustic guitar
    "https://picsum.photos/800/600?random=19", // Honky tonk
    "https://picsum.photos/800/600?random=20", // Country guitar
  ],
  
  // Electronic/DJ images
  electronic: [
    "https://picsum.photos/800/600?random=21", // DJ booth
    "https://picsum.photos/800/600?random=22", // Electronic setup
    "https://picsum.photos/800/600?random=23", // Dance floor
    "https://picsum.photos/800/600?random=24", // DJ mixing
  ],
  
  // General music images
  general: [
    "https://picsum.photos/800/600?random=25", // Concert crowd
    "https://picsum.photos/800/600?random=26", // Stage lights
    "https://picsum.photos/800/600?random=27", // Live performance
    "https://picsum.photos/800/600?random=28", // Music equipment
    "https://picsum.photos/800/600?random=29", // Venue atmosphere
    "https://picsum.photos/800/600?random=30", // Musical instruments
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