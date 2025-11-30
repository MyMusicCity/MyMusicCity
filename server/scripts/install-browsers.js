#!/usr/bin/env node
// Script to ensure browsers are installed at runtime
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Browser Installation Script Starting...');

async function installBrowsers() {
  // Check if we're in a production environment
  const isRender = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';
  
  if (isRender) {
    console.log('🌐 Detected Render environment, ensuring browsers are installed...');
  }
  
  // Install Puppeteer Chrome
  try {
    console.log('📥 Installing Puppeteer Chrome...');
    execSync('npx puppeteer browsers install chrome', { 
      stdio: 'inherit',
      timeout: 120000 // 2 minutes timeout
    });
    console.log('✅ Puppeteer Chrome installed successfully');
  } catch (error) {
    console.log('⚠️ Puppeteer Chrome installation failed:', error.message);
  }
  
  // Install Playwright Chromium
  try {
    console.log('📥 Installing Playwright Chromium...');
    execSync('npx playwright install chromium', { 
      stdio: 'inherit',
      timeout: 120000 // 2 minutes timeout
    });
    console.log('✅ Playwright Chromium installed successfully');
  } catch (error) {
    console.log('⚠️ Playwright Chromium installation failed:', error.message);
  }
  
  // If still no browsers, try system package manager (Render/Ubuntu)
  if (isRender) {
    try {
      console.log('📦 Attempting system Chrome installation...');
      execSync('apt-get update && apt-get install -y google-chrome-stable || apt-get install -y chromium-browser', {
        stdio: 'inherit',
        timeout: 180000 // 3 minutes timeout
      });
      console.log('✅ System Chrome installed successfully');
    } catch (error) {
      console.log('⚠️ System Chrome installation failed:', error.message);
    }
  }
  
  // Verify installations
  console.log('🔍 Verifying browser installations...');
  
  const playwrightPath = '/opt/render/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell';
  const puppeteerPath = '/opt/render/.cache/puppeteer';
  
  if (fs.existsSync(playwrightPath)) {
    console.log('✅ Playwright Chromium found at:', playwrightPath);
  } else {
    console.log('❌ Playwright Chromium NOT found at expected path');
  }
  
  if (fs.existsSync(puppeteerPath)) {
    console.log('✅ Puppeteer cache found at:', puppeteerPath);
  } else {
    console.log('❌ Puppeteer cache NOT found at expected path');
  }
  
  // Check system Chrome
  const systemChromePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome', 
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  
  for (const chromePath of systemChromePaths) {
    if (fs.existsSync(chromePath)) {
      console.log('✅ System Chrome found at:', chromePath);
      break;
    }
  }
  
  console.log('🏁 Browser installation script completed');
}

// Run if called directly
if (require.main === module) {
  installBrowsers().catch(console.error);
}

module.exports = { installBrowsers };