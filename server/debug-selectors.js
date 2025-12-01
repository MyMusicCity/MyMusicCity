const { chromium } = require('playwright');

async function debugDO615Selectors() {
  console.log('🔍 Debugging DO615 page structure...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://do615.com/events', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded. Title:', await page.title());
    
    // Try different selectors to find events
    const selectors = [
      '.ds-listing-event',
      '.event-listing', 
      '.event-item',
      '.listing-item',
      'article',
      '.card',
      '.event-card',
      '.event',
      '.listing',
      '[class*="event"]',
      '[class*="listing"]'
    ];
    
    for (const selector of selectors) {
      try {
        const count = await page.$$eval(selector, els => els.length);
        if (count > 0) {
          console.log(`🎯 Found ${count} elements with selector: ${selector}`);
          
          // Get sample content
          const sample = await page.$eval(selector, el => ({
            className: el.className,
            textContent: el.textContent.substring(0, 200) + '...',
            innerHTML: el.innerHTML.substring(0, 300) + '...'
          }));
          console.log('   Sample element:', JSON.stringify(sample, null, 2));
          break; // Found events, stop searching
        }
      } catch (e) {
        // Selector not found, continue
      }
    }
    
    // Check page structure
    const bodyText = await page.$eval('body', el => el.textContent.substring(0, 500));
    console.log('📄 Body text sample:', bodyText);
    
    // Look for any elements with "event" or "listing" in their class names
    const allElements = await page.$$eval('*[class]', elements => {
      return elements
        .filter(el => el.className.toLowerCase().includes('event') || 
                     el.className.toLowerCase().includes('listing'))
        .slice(0, 10)
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          textSample: el.textContent.substring(0, 100)
        }));
    });
    
    console.log('🔍 Elements with "event" or "listing" in class:', allElements);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await browser.close();
}

debugDO615Selectors().catch(console.error);