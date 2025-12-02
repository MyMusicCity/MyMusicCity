// Test script to diagnose Visit Music City scraping issues
const axios = require('axios');
const cheerio = require('cheerio');

async function diagnoseSite() {
  try {
    console.log('🔍 Diagnosing Visit Music City website structure...');
    
    const url = "https://www.visitmusiccity.com/nashville-events";
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    console.log('✅ Successfully fetched page');
    console.log('Page title:', $('title').text());
    console.log('Page length:', html.length, 'characters');
    
    // Test different potential selectors
    const selectors = [
      '.event',
      '.card', 
      '.listing',
      'article',
      '.vmc-event',
      '.event-card',
      '.event-item',
      '[class*="event"]',
      '[class*="card"]',
      '.list-item',
      '.content-card',
      '.event-listing'
    ];
    
    console.log('\\n🎯 Testing selectors for events:');
    selectors.forEach(selector => {
      const count = $(selector).length;
      if (count > 0) {
        console.log(`✅ ${selector}: ${count} elements found`);
        
        // Test first element for titles
        const first = $(selector).first();
        const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.name'];
        titleSelectors.forEach(titleSel => {
          const title = first.find(titleSel).first().text().trim();
          if (title) {
            console.log(`   📝 Title with ${titleSel}: "${title.substring(0, 50)}..."`);
          }
        });
      } else {
        console.log(`❌ ${selector}: 0 elements`);
      }
    });
    
    // Sample the page structure
    console.log('\\n📋 Sample page structure:');
    $('body').find('*').each((i, el) => {
      if (i < 20) { // First 20 elements
        const $el = $(el);
        const tag = el.tagName;
        const classes = $el.attr('class') || '';
        const id = $el.attr('id') || '';
        const text = $el.text().trim().substring(0, 30);
        
        if (classes.includes('event') || classes.includes('card') || classes.includes('listing')) {
          console.log(`🎯 ${tag}${id ? '#'+id : ''}${classes ? '.'+classes.replace(' ', '.') : ''}: "${text}"`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

diagnoseSite();