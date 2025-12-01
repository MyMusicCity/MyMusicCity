const { chromium } = require('playwright');

async function analyzeEventStructure() {
  console.log('🔍 Analyzing event structure...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://do615.com/events', { waitUntil: 'networkidle' });
    
    // Get the first event and analyze its structure
    const eventData = await page.$eval('.event-card', event => {
      return {
        fullHTML: event.outerHTML,
        title: event.querySelector('h3')?.textContent?.trim() || 'No title found',
        date: event.querySelector('.ds-listing-date')?.textContent?.trim() || 'No date found',
        venue: event.querySelector('.ds-listing-venue')?.textContent?.trim() || 'No venue found',
        description: event.querySelector('.ds-listing-description')?.textContent?.trim() || 'No description found',
        link: event.getAttribute('href') || event.querySelector('a')?.getAttribute('href') || 'No link found',
        image: event.querySelector('.ds-cover-image')?.style?.backgroundImage?.match(/url\(['"]([^'"]+)['"]\)/)?.[1] || 'No image found'
      };
    });
    
    console.log('📄 Event structure:', JSON.stringify(eventData, null, 2));
    
    // Check all possible selectors for different fields
    const fieldSelectors = await page.$eval('.event-card', event => {
      const selectors = {};
      
      // Try different title selectors
      ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.ds-listing-title'].forEach(sel => {
        const el = event.querySelector(sel);
        if (el) selectors.title = sel;
      });
      
      // Try different date selectors
      ['.date', '.event-date', '.ds-listing-date', '.ds-date'].forEach(sel => {
        const el = event.querySelector(sel);
        if (el) selectors.date = sel;
      });
      
      // Try different venue selectors  
      ['.venue', '.location', '.event-venue', '.ds-listing-venue', '.ds-venue'].forEach(sel => {
        const el = event.querySelector(sel);
        if (el) selectors.venue = sel;
      });
      
      // Try different description selectors
      ['.description', '.event-description', '.ds-listing-description', '.ds-description'].forEach(sel => {
        const el = event.querySelector(sel);
        if (el) selectors.description = sel;
      });
      
      return selectors;
    });
    
    console.log('🎯 Working selectors:', fieldSelectors);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await browser.close();
}

analyzeEventStructure().catch(console.error);