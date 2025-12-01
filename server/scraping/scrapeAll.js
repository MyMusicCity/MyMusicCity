const path = require("path");
const { spawn } = require("child_process");
// DISABLED - scrapeSceneCalendar broken (site redirects to ad trackers)
// const scrapeSceneCalendar = require("./scrapeSceneCalendar");
// DISABLED - scrapeVisitMusicCity broken (403 errors + ad redirects)
// const scrapeVisitMusicCity = require("./scrapeVisitMusicCity");
const { fallbackScrape } = require("./fallbackScraper");

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
  
  try {
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.resolve(__dirname, "./scrapeNashvilleScene.js")], {
        stdio: "inherit",
      });

      child.on("close", async (code) => {
        console.log(`DO615 scraper exited with code ${code}`);
        
        if (code === 0) {
          successfulScrapers++;
          console.log("✅ DO615 scraper completed successfully");
        } else {
          totalErrors++;
          console.error("❌ DO615 scraper failed");
        }
        
        resolve(code);
      });

      child.on("error", (err) => {
        console.error("Failed to start DO615 scraper child process:", err);
        totalErrors++;
        reject(err);
      });
    });

    console.log(`📊 Scraping Summary: ${successfulScrapers} successful, ${totalErrors} failed`);
    
    // If DO615 scraper failed, run fallback scraper for basic events
    if (successfulScrapers === 0) {
      console.log("🚨 Primary scraper failed, running fallback scraper...");
      try {
        await fallbackScrape();
        console.log("✅ Fallback scraper completed - basic events available");
        console.log("💡 Note: These are placeholder events. Check DO615 scraper logs for issues.");
      } catch (fallbackError) {
        console.error("❌ Fallback scraper also failed:", fallbackError.message);
        console.error("🔥 CRITICAL: No event sources working. Check database connection and site availability.");
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
