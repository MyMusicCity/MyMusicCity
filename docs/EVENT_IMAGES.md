# Event Images System

This system automatically assigns relevant images to events based on their content (title and description).

## How it works:

### 1. Genre Detection
The system analyzes event titles and descriptions to detect music genres:
- **Jazz**: Events with "jazz", "saxophone", "blues"
- **Hip-hop**: Events with "hip-hop", "rap", "rapper" 
- **Indie**: Events with "indie", "independent"
- **Rock**: Events with "rock", "metal", "punk"
- **Country**: Events with "country", "folk", "bluegrass"
- **Electronic**: Events with "electronic", "dj", "edm", "techno", "house"
- **General**: Fallback for all other events

### 2. Image Assignment
- Each genre has 4+ curated Unsplash images
- Images are rotated based on event index to ensure variety
- All images are high-quality and music-related

### 3. Usage

#### For new events (seed data):
```javascript
const { getEventImage } = require("./server/utils/eventImages");

const event = {
  title: "Jazz Night",
  description: "Live saxophone performances",
  image: getEventImage("Jazz Night", "Live saxophone performances", 0)
};
```

#### For existing events without images:
```bash
npm run update-images
```

#### For scraped events:
The scrapers automatically use fallback images when no image is found from the source.

### 4. Files:
- `server/utils/eventImages.js` - Core image selection logic
- `updateEventImages.js` - Script to update existing events
- `seed.js` - Updated to include images
- `server/scraping/*` - Updated to use fallback images

All images are optimized Unsplash URLs with automatic format detection and compression.