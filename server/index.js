// server/index.js - start server when executed directly
require("dotenv").config();
const mongoose = require("./mongoose");
const app = require("./app");

const PORT = process.env.PORT || 5050;
const MONGO_URI = process.env.MONGO_URI;
const NODE_ENV = process.env.NODE_ENV || "development";

// Fail fast if critical env vars are missing in production
if (NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("❌ Missing JWT_SECRET in environment (required in production)");
  process.exit(1);
}

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in .env file");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { dbName: "mymusiccity" })
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
  const HOST = process.env.HOST || "0.0.0.0";
    // Only start listening when this module is the entrypoint
    if (require.main === module) {
      app.listen(PORT, HOST, () => {
        console.log(`🚀 Server running on http://${HOST}:${PORT}`);
        console.log(`Binding host: ${HOST}; ENV PORT=${process.env.PORT}; NODE_ENV=${process.env.NODE_ENV}`);
        if (process.env.PORT === "5000") {
          console.warn(
            "⚠️  Warning: PORT is set to 5000. If you're deploying to a platform that assigns a dynamic port (Render/Heroku), remove hard-coded PORT from environment variables so the host can provide the port."
          );
        }
      });
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
