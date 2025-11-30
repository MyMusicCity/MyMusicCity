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
 * Launch browser with multiple fallback strategies for Render deployment
 */
async function launchBrowser() {
  console.log('Starting enhanced browser launch sequence...');
  
  // Strategy 1: Try Playwright first (often more reliable on cloud platforms)
  if (playwright) {
    try {
      console.log('Attempting Playwright Chromium launch...');
      const browser = await playwright.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      console.log('✅ Playwright Chromium launched successfully!');
      
      // Create Puppeteer-compatible interface
      const playwrightAdapter = {
        async newPage() {
          const context = await browser.newContext();
          const page = await context.newPage();
          
          // Add Puppeteer-like methods
          page.goto = async (url, options) => {
            return await page.goto(url, { 
              waitUntil: options?.waitUntil || 'networkidle',
              timeout: options?.timeout || 30000
            });
          };
          
          return page;
        },
        async close() {
          return await browser.close();
        }
      };
      
      return playwrightAdapter;
    } catch (error) {
      console.log('Playwright failed:', error.message);
    }
  } else {
    console.log('Playwright not available, trying Puppeteer...');
  }
  
  // Strategy 2: Try Puppeteer with minimal config
  try {
    console.log('Attempting Puppeteer with minimal configuration...');
    return await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } catch (error) {
    console.log('Minimal Puppeteer failed:', error.message);
  }
  
  // Strategy 3: Try with system Chrome paths
  const chromePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  
  for (const chromePath of chromePaths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(chromePath)) {
        console.log(`Attempting system Chrome at: ${chromePath}`);
        return await puppeteer.launch({
          headless: 'new',
          executablePath: chromePath,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }
    } catch (error) {
      console.log(`System Chrome at ${chromePath} failed:`, error.message);
    }
  }
  
  // Strategy 4: Last resort - try environment variable
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    try {
      console.log(`Attempting env Chrome: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
      return await puppeteer.launch({
        headless: 'new',
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (error) {
      console.log('Environment Chrome failed:', error.message);
    }
  }
  
  throw new Error('❌ All browser launch strategies failed. No browser available.');
}

module.exports = {
  getPuppeteerConfig,
  launchBrowser
};