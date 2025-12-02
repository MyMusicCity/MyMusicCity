// Manual scraper trigger to get fresh events with enhanced images
require('dotenv').config();

async function triggerScrapingInProduction() {
    try {
        console.log("🚀 MANUAL SCRAPER TRIGGER");
        console.log("==========================");
        
        // Import fetch for Node.js
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        
        // Trigger production scrapers via API
        const scrapingEndpoints = [
            "https://mymusiccity.onrender.com/api/scrape/nashvillescene",
            "https://mymusiccity.onrender.com/api/scrape/do615", 
            "https://mymusiccity.onrender.com/api/scrape/visitmusiccity"
        ];
        
        console.log("\n📡 Triggering production scrapers...");
        
        for (const endpoint of scrapingEndpoints) {
            console.log(`🔄 Triggering: ${endpoint}`);
            try {
                const response = await fetch(endpoint);
                const data = await response.text();
                console.log(`✅ Response: ${response.status}`);
                if (data.length < 200) {
                    console.log(`   Data: ${data.substring(0, 100)}...`);
                } else {
                    console.log(`   Data length: ${data.length} chars`);
                }
            } catch (err) {
                console.error(`❌ Error triggering ${endpoint}:`, err.message);
            }
            
            // Wait between requests to avoid overwhelming
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        console.log("\n🎯 MANUAL TRIGGER COMPLETE");
        console.log("Wait 2-3 minutes, then check the frontend to see if new events appear with enhanced images.");
        
    } catch (error) {
        console.error("❌ Scraper trigger failed:", error);
    }
}

triggerScrapingInProduction();

triggerScrapingInProduction();