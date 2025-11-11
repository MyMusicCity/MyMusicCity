// quickImageUpdate.js
// Quick script to update all events with reliable images

const mongoose = require("./server/mongoose");
const Event = require("./server/models/Event");
require("dotenv").config({ path: "./.env" });

async function quickUpdateImages() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Missing MONGO_URI in .env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, { 
      dbName: "mymusiccity" 
    });
    console.log("Connected to MongoDB");

    // Find all events
    const allEvents = await Event.find({});
    console.log(`Found ${allEvents.length} events`);

    if (allEvents.length === 0) {
      console.log("No events found. Try running 'npm run seed' first.");
      return;
    }

    // Update each event with a high-quality music photo
    const musicImages = [
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&auto=format', // Concert crowd
      'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=600&fit=crop&auto=format', // Stage lights
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&auto=format', // Live performance
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&auto=format', // Music equipment
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&auto=format', // Venue atmosphere
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop&auto=format', // Saxophone
      'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop&auto=format', // Jazz club
    ];

    let updateCount = 0;
    for (let i = 0; i < allEvents.length; i++) {
      const event = allEvents[i];
      
      // Cycle through the music images
      const newImage = musicImages[i % musicImages.length];

      try {
        await Event.updateOne(
          { _id: event._id },
          { $set: { image: newImage } }
        );
        
        updateCount++;
        console.log(`Updated "${event.title}" with image ${newImage}`);
      } catch (updateError) {
        console.error(`Failed to update event ${event.title}:`, updateError.message);
      }
    }

    console.log(`Successfully updated ${updateCount} events with images`);

  } catch (error) {
    console.error("Error updating event images:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

// Run the update
quickUpdateImages();

module.exports = quickUpdateImages;