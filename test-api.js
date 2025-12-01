// Simple test script to check API endpoints locally
require('dotenv').config();

const https = require('https');
const http = require('http');

async function testLocalAPI() {
  console.log('🔧 Testing local API endpoints...');
  
  // Test the debug endpoint first
  console.log('\n📊 Testing debug endpoint...');
  
  const debugReq = http.get('http://localhost:5001/api/debug/events', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('Debug endpoint result:', result);
        
        // Now test the main events endpoint
        testMainAPI();
      } catch (e) {
        console.log('Debug endpoint response was not JSON:', data);
        testMainAPI();
      }
    });
  });

  debugReq.on('error', (e) => {
    console.error('Debug API test failed:', e.message);
    console.log('Make sure server is running on port 5001');
  });
}

function testMainAPI() {
  console.log('\n📊 Testing main events endpoint...');
  
  const mainReq = http.get('http://localhost:5001/api/events/current', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const events = JSON.parse(data);
        console.log(`Main API returned: ${events.length} events`);
        if (events.length > 0) {
          console.log('First 3 events:');
          events.slice(0, 3).forEach((e, i) => {
            console.log(`  ${i+1}. ${e.title} (${e.source}) - ${e.date ? new Date(e.date).toISOString().split('T')[0] : 'NO DATE'}`);
          });
        } else {
          console.log('❌ No events returned by main API');
        }
      } catch (e) {
        console.log('Main API response was not JSON:', data.substring(0, 200));
      }
    });
  });

  mainReq.on('error', (e) => {
    console.error('Main API test failed:', e.message);
  });
}

// Run the test
testLocalAPI();