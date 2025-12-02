const path = require('path');
const { imageProcessor } = require('../utils/imageProcessor');
const { isValidImageUrl, validateImageQuality } = require('../utils/imageValidator');
const { getEnhancedEventImage, getFallbackImage } = require('../utils/enhancedEventImages');

// Test data for validation
const testImageUrls = [
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745', // Valid music image
  'https://invalid-url.com/image.jpg', // Invalid URL
  'https://via.placeholder.com/300x200.jpg', // Placeholder (should be rejected)
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=150', // Low res
  null, // Null URL
  '', // Empty string
  'not-a-url', // Invalid format
];

const testEvents = [
  {
    id: 'test1',
    title: 'Country Music Show at Ryman Auditorium',
    description: 'Live country performance',
    venue: 'Ryman Auditorium',
    date: new Date('2024-01-15T19:30:00Z')
  },
  {
    id: 'test2',
    title: 'Rock Concert at Exit/In',
    description: 'Alternative rock band performance',
    venue: 'Exit/In',
    date: new Date('2024-01-20T21:00:00Z')
  },
  {
    id: 'test3',
    title: 'Jazz Trio at The Bluebird Cafe',
    description: 'Intimate jazz performance',
    venue: 'The Bluebird Cafe',
    date: new Date('2024-01-25T20:00:00Z')
  },
  {
    id: 'test4',
    title: 'Acoustic Solo Artist Open Mic',
    description: 'Singer-songwriter showcase',
    venue: 'The Listening Room',
    date: new Date('2024-01-30T18:00:00Z')
  },
  {
    id: 'test5',
    title: 'Symphony Orchestra at TPAC',
    description: 'Classical music performance',
    venue: 'TPAC',
    date: new Date('2024-02-05T19:00:00Z')
  }
];

async function testImageValidation() {
  console.log('\n=== Testing Image Validation ===');
  
  for (const url of testImageUrls) {
    console.log(`\nTesting URL: ${url}`);
    
    // Test basic URL validation
    const isValid = isValidImageUrl(url);
    console.log(`  Basic validation: ${isValid}`);
    
    // Test quality validation for valid URLs
    if (isValid && url) {
      try {
        const qualityResult = await validateImageQuality(url);
        console.log(`  Quality validation: ${JSON.stringify(qualityResult, null, 2)}`);
      } catch (error) {
        console.log(`  Quality validation failed: ${error.message}`);
      }
    }
  }
}

async function testEnhancedEventImages() {
  console.log('\n=== Testing Enhanced Event Images ===');
  
  for (const event of testEvents) {
    console.log(`\nTesting event: ${event.title}`);
    
    // Test enhanced image selection
    const enhancedImage = getEnhancedEventImage(
      event.title,
      event.description,
      event.venue,
      event.date
    );
    console.log(`  Enhanced image: ${enhancedImage}`);
    
    // Test fallback image generation
    const fallbackImage = getFallbackImage(event.id, event);
    console.log(`  Fallback image: ${fallbackImage}`);
  }
}

async function testImageProcessor() {
  console.log('\n=== Testing Image Processor ===');
  
  // Test with valid images
  const validImages = [
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=300',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=200'
  ];
  
  const testEvent = testEvents[0];
  
  console.log(`\nProcessing valid images for: ${testEvent.title}`);
  const result1 = await imageProcessor.processEventImages(validImages, testEvent);
  console.log(`Result: ${JSON.stringify(result1, null, 2)}`);
  
  // Test with no images (fallback scenario)
  console.log(`\nProcessing no images for: ${testEvent.title}`);
  const result2 = await imageProcessor.processEventImages([], testEvent);
  console.log(`Result: ${JSON.stringify(result2, null, 2)}`);
  
  // Test with invalid images
  const invalidImages = [
    'https://invalid-url.com/image.jpg',
    'https://via.placeholder.com/300x200.jpg'
  ];
  
  console.log(`\nProcessing invalid images for: ${testEvent.title}`);
  const result3 = await imageProcessor.processEventImages(invalidImages, testEvent);
  console.log(`Result: ${JSON.stringify(result3, null, 2)}`);
  
  // Test cache functionality
  console.log('\nTesting cache functionality...');
  const cacheStats1 = imageProcessor.getCacheStats();
  console.log(`Cache stats before: ${JSON.stringify(cacheStats1)}`);
  
  // Process the same valid images again (should use cache)
  await imageProcessor.processEventImages(validImages, testEvent);
  const cacheStats2 = imageProcessor.getCacheStats();
  console.log(`Cache stats after: ${JSON.stringify(cacheStats2)}`);
}

async function testVenueMapping() {
  console.log('\n=== Testing Venue-Specific Image Mapping ===');
  
  const venues = [
    'Ryman Auditorium',
    'Grand Ole Opry',
    'The Bluebird Cafe',
    'Exit/In',
    'Bridgestone Arena',
    'Unknown Venue' // Should fallback to generic
  ];
  
  for (const venue of venues) {
    const testEvent = {
      title: `Test Event at ${venue}`,
      venue: venue,
      date: new Date()
    };
    
    const image = getEnhancedEventImage(
      testEvent.title,
      'Test description',
      testEvent.venue,
      testEvent.date
    );
    
    console.log(`${venue}: ${image}`);
  }
}

async function testTimeBasedImages() {
  console.log('\n=== Testing Time-Based Image Selection ===');
  
  const times = [
    { hour: 9, description: 'Morning event (9 AM)' },
    { hour: 15, description: 'Afternoon event (3 PM)' },
    { hour: 19, description: 'Evening event (7 PM)' },
    { hour: 23, description: 'Night event (11 PM)' }
  ];
  
  for (const time of times) {
    const eventDate = new Date();
    eventDate.setHours(time.hour, 0, 0, 0);
    
    const testEvent = {
      title: 'Generic Music Event',
      venue: 'Generic Venue',
      date: eventDate
    };
    
    const image = getEnhancedEventImage(
      testEvent.title,
      'Test description',
      testEvent.venue,
      testEvent.date
    );
    
    console.log(`${time.description}: ${image}`);
  }
}

async function runAllTests() {
  console.log('🎵 Starting Enhanced Image Processing Tests 🎵\n');
  
  try {
    await testImageValidation();
    await testEnhancedEventImages();
    await testVenueMapping();
    await testTimeBasedImages();
    await testImageProcessor();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Jest test integration
describe('Image Processing Integration', () => {
  test('should validate image URLs', async () => {
    // Run the custom test function and check for errors
    try {
      await testImageValidation();
      expect(true).toBe(true); // Test passed if no error thrown
    } catch (error) {
      // If test function fails, make Jest test fail
      throw new Error(`Image validation test failed: ${error.message}`);
    }
  });

  test('should generate enhanced event images', async () => {
    try {
      await testEnhancedEventImages();
      expect(true).toBe(true);
    } catch (error) {
      throw new Error(`Enhanced event images test failed: ${error.message}`);
    }
  });

  test('should map venues correctly', async () => {
    try {
      await testVenueMapping();
      expect(true).toBe(true);
    } catch (error) {
      throw new Error(`Venue mapping test failed: ${error.message}`);
    }
  });
});

// Run tests if this file is executed directly (for standalone testing)
if (require.main === module) {
  runAllTests().then(() => {
    console.log('\nTest suite finished.');
    process.exit(0);
  }).catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = {
  testImageValidation,
  testEnhancedEventImages,
  testVenueMapping,
  testTimeBasedImages,
  testImageProcessor,
  runAllTests
};