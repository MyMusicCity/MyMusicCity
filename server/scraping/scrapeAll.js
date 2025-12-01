const path = require("path");
const { spawn } = require("child_process");
// DISABLED - scrapeSceneCalendar broken (site redirects to ad trackers)
// const scrapeSceneCalendar = require("./scrapeSceneCalendar");
// DISABLED - scrapeVisitMusicCity broken (403 errors + ad redirects)
// const scrapeVisitMusicCity = require("./scrapeVisitMusicCity");
const { fallbackScrape } = require("./fallbackScraper");

// Production environment detection
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
const SCRAPING_CONFIG = {
  timeout: isProduction ? 180000 : 120000, // 3min for production scrapeAll, 2min for dev
  maxRetries: isProduction ? 2 : 1,
  fallbackOnFailure: true
};

console.log(`🔧 Production mode: ${isProduction}, timeout: ${SCRAPING_CONFIG.timeout}ms`);

async function run() {
  console.log("🚀 Starting optimized scraping run: DO615 (primary music events source)");
  console.log("📋 Disabled scrapers: Scene Calendar (broken), Visit Music City (blocked)");
  
  let successfulScrapers = 0;
  let totalErrors = 0;

  // DISABLED - Nashville Scene Calendar (site broken, redirects to ads)
  // Note: Site now redirects to ad trackers instead of serving event content
  /*
  try {
    await scrapeSceneCalendar();
    successfulScrapers++;
    console.log("✅ scrapeSceneCalendar completed");
  } catch (err) {
    totalErrors++;
    console.error("❌ scrapeSceneCalendar error:", err && err.message ? err.message : err);
  }
  */

  // DISABLED - Visit Music City (403 errors, site blocks scrapers)
  // Note: Site actively blocks automated requests with 403 responses
  /*
  try {
    await scrapeVisitMusicCity();
    successfulScrapers++;
    console.log("✅ scrapeVisitMusicCity completed");
  } catch (err) {
    totalErrors++;
    console.error("❌ scrapeVisitMusicCity error:", err && err.message ? err.message : err);
  }
  */

  // PRIMARY SOURCE: DO615 scraper (working and reliable)
  // This scraper extracts Nashville music events from do615.com/events
  console.log("🎯 Running DO615 scraper (primary music events source)");
  
  let scraperSuccess = false;
  let attempt = 0;
  
  while (attempt < SCRAPING_CONFIG.maxRetries && !scraperSuccess) {
    try {
      attempt++;
      console.log(`📡 DO615 scraper attempt ${attempt}/${SCRAPING_CONFIG.maxRetries}`);
      
      const exitCode = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [path.resolve(__dirname, "./scrapeNashvilleScene.js")], {
          stdio: "inherit",
        });

        // Add timeout for the entire scraper process
        const timeout = setTimeout(() => {
          console.log(`⏰ DO615 scraper timeout after ${SCRAPING_CONFIG.timeout}ms, terminating...`);
          child.kill('SIGTERM');
          setTimeout(() => child.kill('SIGKILL'), 5000); // Force kill after 5s
          reject(new Error(`DO615 scraper timeout after ${SCRAPING_CONFIG.timeout}ms`));
        }, SCRAPING_CONFIG.timeout);

        child.on("close", async (code) => {
          clearTimeout(timeout);
          console.log(`DO615 scraper exited with code ${code}`);
          
          if (code === 0) {
            successfulScrapers++;
            scraperSuccess = true;
            console.log("✅ DO615 scraper completed successfully");
          } else {
            totalErrors++;
            console.error("❌ DO615 scraper failed");
          }
          
          resolve(code);
        });

        child.on("error", (err) => {
          clearTimeout(timeout);
          console.error("Failed to start DO615 scraper child process:", err);
          totalErrors++;
          reject(err);
        });
      });
      
    } catch (err) {
      console.error(`❌ DO615 scraper attempt ${attempt} failed:`, err.message);
      
      if (attempt < SCRAPING_CONFIG.maxRetries) {
        console.log(`⏳ Waiting 15 seconds before retry attempt ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }
  }
    });

    console.log(`📊 Scraping Summary: ${successfulScrapers} successful, ${totalErrors} failed`);
    
    // Enhanced fallback system for presentation reliability
    if (successfulScrapers === 0) {
      console.log("🚨 All scrapers failed - activating enhanced fallback system for presentation");
      try {
        console.log("🎭 Running enhanced fallback scraper with curated music events...");
        await fallbackScrape();
        console.log("✅ Enhanced fallback scraper completed - presentation-ready events loaded");
        console.log("🎵 Fallback events include: concerts, live music, and music festivals");
      } catch (fallbackError) {
        console.error("❌ Enhanced fallback scraper also failed:", fallbackError.message);
        console.error("🔥 CRITICAL: No event sources working. Check database connection and site availability.");
        console.log("💡 Consider using presentation mode with pre-loaded mock events for demo reliability");
      }
    }
    
    console.log("🏁 Combined scraping run complete.");
    console.log("📈 Active sources: DO615 (reliable music events)");
    console.log("📊 Check /api/debug/events endpoint to verify event count");
    process.exit(exitCode === 0 && totalErrors === 0 ? 0 : 1);
    
  } catch (error) {
    console.error("❌ Critical error during scraping:", error);
    process.exit(1);
  }
}

run();
