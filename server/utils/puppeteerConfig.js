// server/utils/puppeteerConfig.js
// Centralized Puppeteer configuration for production environments

const puppeteer = require('puppeteer');

/**
 * Get optimized Puppeteer launch options for production environments
 */
function getPuppeteerConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const config = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  };

  // In production, add more restrictive args and try to use system Chrome
  if (isProduction) {
    config.args.push(
      '--single-process',
      '--memory-pressure-off',
      '--max_old_space_size=4096'
    );
    
    // Try multiple possible Chrome locations for Render
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ];
    
    for (const path of possiblePaths) {
      if (path) {
        try {
          const fs = require('fs');
          if (fs.existsSync(path)) {
            config.executablePath = path;
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }
    }
  }

  return config;
}

/**
 * Launch Puppeteer browser with optimized configuration and fallbacks
 */
async function launchBrowser() {
  try {
    const config = getPuppeteerConfig();
    console.log('Launching Puppeteer with config:', JSON.stringify(config, null, 2));
    return await puppeteer.launch(config);
  } catch (error) {
    console.error('Failed to launch Puppeteer:', error.message);
    
    // Fallback 1: Try without executable path
    console.log('Trying fallback configuration without executable path...');
    try {
      return await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    } catch (error2) {
      console.error('Fallback 1 failed:', error2.message);
      
      // Fallback 2: Minimal configuration
      console.log('Trying minimal configuration...');
      try {
        return await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      } catch (error3) {
        console.error('All Puppeteer launch attempts failed:', error3.message);
        throw new Error('Could not launch browser with any configuration');
      }
    }
  }
}

module.exports = {
  getPuppeteerConfig,
  launchBrowser
};