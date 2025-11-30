// server/utils/puppeteerConfig.js
// Centralized browser configuration for production environments

const puppeteer = require('puppeteer');
const { installBrowsers } = require('../scripts/install-browsers');
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
 * Map Puppeteer waitUntil options to Playwright equivalents
 */
function mapWaitUntilOption(waitUntil) {
  const mapping = {
    'load': 'load',
    'domcontentloaded': 'domcontentloaded', 
    'networkidle0': 'networkidle',
    'networkidle2': 'networkidle'
  };
  return mapping[waitUntil] || 'networkidle';
}

/**
 * Launch browser with multiple fallback strategies for Render deployment
 */
async function launchBrowser() {
  console.log('Starting enhanced browser launch sequence...');
  
  // Ensure browsers are installed before attempting launch
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  if (isProduction) {
    console.log('🔧 Production environment detected, ensuring browsers are installed...');
    try {
      await installBrowsers();
    } catch (error) {
      console.log('⚠️ Browser installation completed with some warnings:', error.message);
    }
  }
  
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
          const context = await browser.newContext({
            // Set default user agent at context level
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
          });
          const page = await context.newPage();
          
          // Store original methods to avoid infinite recursion
          const originalGoto = page.goto;
          const originalWaitForSelector = page.waitForSelector;
          const originalSetExtraHTTPHeaders = page.setExtraHTTPHeaders;
          
          // Override goto to handle Puppeteer options
          page.goto = async function(url, options = {}) {
            const playwrightOptions = {
              timeout: options.timeout || 30000
            };
            
            // Map waitUntil option
            if (options.waitUntil) {
              playwrightOptions.waitUntil = mapWaitUntilOption(options.waitUntil);
            } else {
              playwrightOptions.waitUntil = 'networkidle';
            }
            
            return await originalGoto.call(this, url, playwrightOptions);
          };
          
          // Add Puppeteer-compatible setUserAgent method
          page.setUserAgent = async function(userAgent) {
            try {
              // For Playwright, we need to set user agent at context level
              // Since we can't change context after creation, we'll use setExtraHTTPHeaders as fallback
              await page.setExtraHTTPHeaders({
                'User-Agent': userAgent
              });
              return Promise.resolve();
            } catch (error) {
              console.log('setUserAgent fallback failed, continuing...', error.message);
              return Promise.resolve();
            }
          };
          
          // Add Puppeteer-compatible setExtraHTTPHeaders method
          page.setExtraHTTPHeaders = async function(headers) {
            try {
              // Use the original method if available
              if (originalSetExtraHTTPHeaders) {
                return await originalSetExtraHTTPHeaders.call(this, headers);
              }
              return Promise.resolve();
            } catch (error) {
              console.log('setExtraHTTPHeaders failed, continuing...', error.message);
              return Promise.resolve();
            }
          };
          
          // Override waitForSelector to handle potential differences
          page.waitForSelector = async function(selector, options = {}) {
            try {
              return await originalWaitForSelector.call(this, selector, {
                timeout: options.timeout || 30000,
                state: options.visible ? 'visible' : 'attached'
              });
            } catch (error) {
              // If selector not found, return null to match Puppeteer behavior
              if (error.message.includes('Timeout')) {
                return null;
              }
              throw error;
            }
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
  
  // Strategy 3: Try with system Chrome paths (more comprehensive)
  const chromePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser', 
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/usr/local/bin/chromium',
    '/usr/local/bin/google-chrome'
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