require('dotenv').config({ path: '../.env' });

// Test the current events filtering logic to understand why events aren't showing
console.log('📊 Testing current events filtering logic...');

// Mock events similar to what scrapers would produce
const mockEventsFromDB = [
  {
    _id: '1',
    title: 'Test Event 1',
    date: '2025-12-05T19:00:00.000Z',
    location: 'Nashville, TN',
    source: 'test',
    imageSource: 'scraped'
  },
  {
    _id: '2', 
    title: 'Test Event 2',
    date: '2025-12-08T20:00:00.000Z',
    location: 'Music City',
    source: 'test',
    imageSource: 'scraped'
  },
  {
    _id: '3',
    title: 'Old Event',
    date: '2025-10-01T19:00:00.000Z',
    location: 'Nashville, TN',
    source: 'test',
    imageSource: 'scraped'
  }
];

// Replicate the filtering logic from /api/events/current
const today = new Date();
const defaultStartDate = new Date();
defaultStartDate.setDate(defaultStartDate.getDate() - 14);

console.log('Today:', today.toISOString().split('T')[0]);
console.log('Filter date (2 weeks ago):', defaultStartDate.toISOString().split('T')[0]);
console.log('\nEvent filtering:');

const filteredEvents = mockEventsFromDB.filter(event => {
  const eventDate = new Date(event.date);
  const isRecent = eventDate >= defaultStartDate;
  console.log(`  ${event.title}: ${eventDate.toISOString().split('T')[0]} -> ${isRecent ? 'PASS' : 'FILTERED OUT'}`);
  return isRecent;
});

console.log(`\nResult: ${mockEventsFromDB.length} events filtered to ${filteredEvents.length} recent events`);

// Test what happens with "Untitled Event" duplicates
console.log('\n🔍 Testing duplicate detection issue:');
const duplicateEvents = [
  { title: 'Untitled Event', url: 'http://example1.com' },
  { title: 'Untitled Event', url: 'http://example2.com' },
  { title: 'Untitled Event', url: 'http://example3.com' }
];

console.log('Original events:', duplicateEvents.length);
const existingTitles = new Set(['Untitled Event']); // Simulate one already exists
const newEvents = duplicateEvents.filter(e => !existingTitles.has(e.title));
console.log('After duplicate filtering:', newEvents.length);
console.log('Issue: All "Untitled Event" entries are considered duplicates!');