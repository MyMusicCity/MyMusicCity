const path = require("path");
const { spawn } = require("child_process");
const scrapeSceneCalendar = require("./scrapeSceneCalendar");
const scrapeVisitMusicCity = require("./scrapeVisitMusicCity");
const { fallbackScrape } = require("./fallbackScraper");

async function run() {
  console.log("Starting combined scraping run: Scene Calendar + VisitMusicCity + DO615");
  
  let successfulScrapers = 0;
  let totalErrors = 0;

  try {
    await scrapeSceneCalendar();
    successfulScrapers++;
    console.log("✅ scrapeSceneCalendar completed");
  } catch (err) {
    totalErrors++;
    console.error("❌ scrapeSceneCalendar error:", err && err.message ? err.message : err);
  }

  try {
    await scrapeVisitMusicCity();
    successfulScrapers++;
    console.log("✅ scrapeVisitMusicCity completed");
  } catch (err) {
    totalErrors++;
    console.error("❌ scrapeVisitMusicCity error:", err && err.message ? err.message : err);
  }

  // Now run the existing DO615 scraper as a separate Node process to avoid importing
  // a file that self-executes on require. This preserves current behavior.
  console.log("Spawning existing DO615 scraper (scrapeNashvilleScene.js)");
  
  try {
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.resolve(__dirname, "./scrapeNashvilleScene.js")], {
        stdio: "inherit",
      });

      child.on("close", async (code) => {
        console.log(`DO615 scraper exited with code ${code}`);
        
        if (code === 0) {
          successfulScrapers++;
        } else {
          totalErrors++;
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
    
    // If all scrapers failed due to browser issues, run fallback scraper
    if (successfulScrapers === 0 && totalErrors >= 3) {
      console.log("🚨 All scrapers failed, running fallback scraper to provide basic events...");
      try {
        await fallbackScrape();
        console.log("✅ Fallback scraper completed - basic events available");
      } catch (fallbackError) {
        console.error("❌ Fallback scraper also failed:", fallbackError.message);
      }
    }
    
    console.log("Combined scraping run complete.");
    process.exit(exitCode === 0 && totalErrors === 0 ? 0 : 1);
    
  } catch (error) {
    console.error("❌ Critical error during scraping:", error);
    process.exit(1);
  }
}

run();
