const { chromium } = require('playwright');

async function debugDates() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('Loading DO615 events page...');
    await page.goto('https://do615.com/events', { waitUntil: 'networkidle', timeout: 60000 });
    
    console.log('Extracting date information from first 5 events...');
    const dateInfo = await page.evaluate(() => {
      const eventElements = document.querySelectorAll('.event-card');
      
      return Array.from(eventElements).slice(0, 5).map((el, index) => {
        const title = el.querySelector('.ds-listing-event-title-text')?.textContent?.trim() || 'No title';
        
        // Get all possible date-related elements
        const timeText = el.querySelector('.ds-event-time')?.textContent?.trim() || '';
        const dateMetaEl = el.querySelector('meta[itemprop="startDate"]');
        const datetime = dateMetaEl?.getAttribute('datetime') || '';
        
        // Look for other potential date selectors
        const dateEl = el.querySelector('.ds-event-date, .event-date, [class*="date"]');
        const dateClass = dateEl?.textContent?.trim() || '';
        
        // Get all text content for analysis
        const allText = el.textContent;
        
        // Look for elements that might contain date info
        const timeElements = el.querySelectorAll('[class*="time"], [class*="date"], [class*="when"]');
        const timeElementsText = Array.from(timeElements).map(e => e.textContent?.trim()).filter(Boolean);
        
        return {
          index,
          title: title.substring(0, 50) + '...',
          timeText,
          datetime,
          dateClass,
          timeElementsText,
          // Look for date patterns in all text
          datePatterns: allText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}/gi) || []
        };
      });
    });
    
    console.log('\n=== DATE DEBUG INFO ===');
    dateInfo.forEach(event => {
      console.log(`\nEvent ${event.index}: ${event.title}`);
      console.log(`  timeText: "${event.timeText}"`);
      console.log(`  datetime: "${event.datetime}"`);
      console.log(`  dateClass: "${event.dateClass}"`);
      console.log(`  timeElementsText: ${JSON.stringify(event.timeElementsText)}`);
      console.log(`  datePatterns: ${JSON.stringify(event.datePatterns)}`);
    });
    
  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    if (browser) await browser.close();
  }
}

debugDates();