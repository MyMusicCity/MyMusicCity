const express = require('express');
const Event = require('../models/Event');
const { getEventImage } = require('../utils/eventImages');

const router = express.Router();

// Route to update all events with proper Unsplash images
router.post('/update-all-images', async (req, res) => {
  try {
    const events = await Event.find({});
    let updateCount = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Check if event has a picsum URL or no image
      if (!event.image || event.image.includes('picsum.photos')) {
        const newImage = getEventImage(event.title, event.description, i);
        
        await Event.updateOne(
          { _id: event._id },
          { $set: { image: newImage } }
        );
        
        updateCount++;
        console.log(`Updated "${event.title}" with new image`);
      }
    }

    res.json({ 
      success: true, 
      message: `Updated ${updateCount} events with new images`,
      updatedCount: updateCount 
    });
  } catch (error) {
    console.error('Error updating images:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update images', 
      error: error.message 
    });
  }
});

module.exports = router;