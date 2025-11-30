// server/utils/puppeteerConfig.js
// Centralized browser configuration for production environments

const puppeteer = require('puppeteer');
let playwright = null;

// Try to load playwright as fallback
try {
  playwright = require('playwright');
} catch (e) {
  // Playwright not available
}

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
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Try Method 1: Use bundled Chrome from Puppeteer
  try {
    const config = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    };
    
    console.log('Attempting to use bundled Chrome...');
    return await puppeteer.launch(config);
  } catch (error1) {
    console.log('Bundled Chrome failed:', error1.message);
  }

  // Try Method 2: Use system Chrome paths
  if (isProduction) {
    const systemPaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ];
    
    for (const path of systemPaths) {
      try {
        const fs = require('fs');
        if (fs.existsSync(path)) {
          console.log(`Attempting to use system Chrome at: ${path}`);
          return await puppeteer.launch({
            headless: 'new',
            executablePath: path,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu'
            ]
          });
        }
      } catch (error) {
        console.log(`Failed to use Chrome at ${path}:`, error.message);
        continue;
      }
    }
  }

  // Try Method 3: Environment variable path
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    try {
      console.log(`Attempting to use env Chrome at: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
      return await puppeteer.launch({
        headless: 'new',
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    } catch (error) {
      console.log('Environment Chrome failed:', error.message);
    }
  }
  
  // Try Method 4: Playwright as fallback
  if (playwright) {
    try {
      console.log('Attempting to use Playwright Chromium...');
      const browser = await playwright.chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      // Wrap playwright browser to work with puppeteer-like interface
      return {
        ...browser,
        newPage: async () => {
          const context = await browser.newContext();
          return await context.newPage();
        }
      };
    } catch (error) {
      console.log('Playwright failed:', error.message);
    }
  }
  
  throw new Error('Could not launch browser with any available method. Chrome/Chromium not found.');
}

module.exports = {
  getPuppeteerConfig,
  launchBrowser
};