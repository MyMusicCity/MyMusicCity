// updateEventImages.js
// Script to add images to existing events that don't have them

const mongoose = require("./server/mongoose");
const Event = require("./server/models/Event");
const { getEventImage } = require("./server/utils/eventImages");
require("dotenv").config({ path: "./.env" });

async function updateEventImages() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Missing MONGO_URI in .env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, { 
      dbName: "mymusiccity" 
    });
    console.log("Connected to MongoDB");

    // Find events without images or with placeholder images
    const eventsWithoutImages = await Event.find({
      $or: [
        { image: { $exists: false } },
        { image: null },
        { image: "" },
        { image: "https://placehold.co/300x180" }
      ]
    });

    console.log(`Found ${eventsWithoutImages.length} events without images`);

    if (eventsWithoutImages.length === 0) {
      console.log("All events already have images!");
      return;
    }

    // Update each event with an appropriate image
    let updateCount = 0;
    for (let i = 0; i < eventsWithoutImages.length; i++) {
      const event = eventsWithoutImages[i];
      
      // Generate image based on title, description, and index for variety
      const newImage = getEventImage(
        event.title, 
        event.description || "", 
        i
      );

      try {
        await Event.updateOne(
          { _id: event._id },
          { $set: { image: newImage } }
        );
        
        updateCount++;
        console.log(`Updated "${event.title}" with ${newImage.includes('jazz') ? 'jazz' : newImage.includes('rock') ? 'rock' : newImage.includes('hip') ? 'hip-hop' : 'general'} image`);
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

// Run the update if this script is called directly
if (require.main === module) {
  updateEventImages();
}

module.exports = updateEventImages;