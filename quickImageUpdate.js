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

    // Update each event with a simple stock photo
    let updateCount = 0;
    for (let i = 0; i < allEvents.length; i++) {
      const event = allEvents[i];
      
      // Use simple Lorem Picsum URLs
      const newImage = `https://picsum.photos/800/600?random=${i + 300}`;

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