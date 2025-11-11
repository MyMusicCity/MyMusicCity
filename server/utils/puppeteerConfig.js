// server/utils/puppeteerConfig.js
// Centralized Puppeteer configuration for production environments

const puppeteer = require('puppeteer');

/**
 * Get optimized Puppeteer launch options for production environments
 */
function getPuppeteerConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const config = {
    headless: true,
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
    
    // Use system Chrome if available via environment variable
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      config.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
  }

  return config;
}

/**
 * Launch Puppeteer browser with optimized configuration
 */
async function launchBrowser() {
  try {
    const config = getPuppeteerConfig();
    console.log('Launching Puppeteer with config:', JSON.stringify(config, null, 2));
    return await puppeteer.launch(config);
  } catch (error) {
    console.error('Failed to launch Puppeteer:', error.message);
    
    // Fallback: try with minimal configuration
    console.log('Trying fallback configuration...');
    return await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
}

module.exports = {
  getPuppeteerConfig,
  launchBrowser
};