const path = require("path");
const { spawn } = require("child_process");
const scrapeSceneCalendar = require("./scrapeSceneCalendar");
const scrapeVisitMusicCity = require("./scrapeVisitMusicCity");

async function run() {
  console.log("Starting combined scraping run: Scene Calendar + VisitMusicCity + DO615");

  try {
    await scrapeSceneCalendar();
  } catch (err) {
    console.error("scrapeSceneCalendar error:", err && err.message ? err.message : err);
  }

  try {
    await scrapeVisitMusicCity();
  } catch (err) {
    console.error("scrapeVisitMusicCity error:", err && err.message ? err.message : err);
  }

  // Now run the existing DO615 scraper as a separate Node process to avoid importing
  // a file that self-executes on require. This preserves current behavior.
  console.log("Spawning existing DO615 scraper (scrapeNashvilleScene.js)");
  const child = spawn(process.execPath, [path.resolve(__dirname, "./scrapeNashvilleScene.js")], {
    stdio: "inherit",
  });

  child.on("close", (code) => {
    console.log(`DO615 scraper exited with code ${code}`);
    console.log("Combined scraping run complete.");
    process.exit(code === 0 ? 0 : 1);
  });

  child.on("error", (err) => {
    console.error("Failed to start DO615 scraper child process:", err);
    process.exit(1);
  });
}

run();
