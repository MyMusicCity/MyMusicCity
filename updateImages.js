// Simple script to update all database event images
const https = require('https');
const http = require('http');

const APP_URL = 'https://my-music-city.onrender.com'; // Your Render app URL
const ENDPOINT = '/api/admin/update-all-images';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    console.log(`Making request to: ${url}`);
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function updateImages() {
  try {
    console.log('🎵 Updating event images in database...');
    
    const result = await makeRequest(APP_URL + ENDPOINT);
    
    console.log(`Response status: ${result.status}`);
    
    if (result.status === 200 && result.data.success) {
      console.log('✅ Success!');
      console.log(`📸 Updated ${result.data.updatedCount} events with new images`);
      console.log(`💭 ${result.data.message}`);
    } else {
      console.log('❌ Something went wrong:');
      console.log(result.data);
    }
    
  } catch (error) {
    console.error('❌ Error updating images:', error.message);
    console.log('\n💡 Tips:');
    console.log('1. Make sure your app is deployed and running on Render');
    console.log('2. Wait a few minutes after pushing for deployment to complete');
    console.log('3. Check the app URL is correct in this script');
  }
}

// Run the update
updateImages();