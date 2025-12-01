const { chromium } = require('playwright');

async function findCorrectSelectors() {
  console.log('🔍 Finding correct selectors...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://do615.com/events', { waitUntil: 'networkidle' });
    
    // Get first few events and their data
    const events = await page.$$eval('.event-card', eventElements => {
      return eventElements.slice(0, 3).map(event => {
        // Title - looks like it's in .ds-listing-event-title-text
        const titleEl = event.querySelector('.ds-listing-event-title-text');
        const title = titleEl ? titleEl.textContent.trim() : 'No title';
        
        // Venue - looks like it's in .ds-venue-name span[itemprop="name"]
        const venueEl = event.querySelector('.ds-venue-name span[itemprop="name"]');
        const venue = venueEl ? venueEl.textContent.trim() : 'No venue';
        
        // Time - looks like it's in .ds-event-time
        const timeEl = event.querySelector('.ds-event-time');
        const time = timeEl ? timeEl.textContent.trim() : 'No time';
        
        // Date - need to extract from meta tag or series info
        const dateMetaEl = event.querySelector('meta[itemprop="startDate"]');
        const seriesEl = event.querySelector('.ds-listing-series span:last-child');
        const date = dateMetaEl ? dateMetaEl.getAttribute('datetime') : 
                    seriesEl ? seriesEl.textContent.trim() : 'No date';
        
        // Link - from the main anchor tag
        const linkEl = event.querySelector('.ds-listing-event-title');
        const link = linkEl ? linkEl.getAttribute('href') : 'No link';
        
        // Image - from background-image style
        const imageEl = event.querySelector('.ds-cover-image');
        const imageStyle = imageEl ? imageEl.style.backgroundImage : '';
        const image = imageStyle.match(/url\(['"]([^'"]+)['"]\)/)?.[1] || 'No image';
        
        // Description/byline
        const bylineEl = event.querySelector('.ds-byline');
        const description = bylineEl ? bylineEl.textContent.trim() : 'No description';
        
        return {
          title,
          venue, 
          time,
          date,
          link,
          image,
          description,
          rawHTML: event.innerHTML.substring(0, 500) + '...'
        };
      });
    });
    
    console.log('📄 Found events:', JSON.stringify(events, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await browser.close();
}

findCorrectSelectors().catch(console.error);