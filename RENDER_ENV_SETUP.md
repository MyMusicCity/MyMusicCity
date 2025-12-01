# Render Environment Variables

**CRITICAL:** These environment variables must be set in your Render dashboard for the backend service.

## Required Environment Variables for Render Deployment

Copy these exact values into your Render service environment variables:

```bash
# Database Configuration
MONGO_URI=mongodb+srv://jakedseals_db_user:zGsll0PkzRDsDZzd@mymusiccity.nlcnv6s.mongodb.net/mymusiccity?retryWrites=true&w=majority

# Auth0 Configuration  
AUTH0_AUDIENCE=https://dev-marf1ou3h5lcf4a7.us.auth0.com/api/v2/
AUTH0_DOMAIN=dev-marf1ou3h5lcf4a7.us.auth0.com

# Frontend Configuration
CLIENT_URL=https://my-music-city.vercel.app
CORS_ORIGIN=https://my-music-city.vercel.app

# Security & Performance
JWT_SECRET=someRandomSecretKey
LOG_LEVEL=info
NODE_ENV=production
NODE_VERSION=20
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Puppeteer Configuration for Linux
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

## How to Set Environment Variables on Render

1. Go to your Render dashboard
2. Select your MyMusicCity backend service
3. Go to "Environment" tab
4. Add each variable above as a new environment variable
5. Deploy the service

## Important Notes

- **MONGO_URI**: Must point to the production cluster `mymusiccity.nlcnv6s.mongodb.net`
- **NODE_ENV**: Must be set to `production` for correct scraper behavior
- **CORS_ORIGIN**: Must match your Vercel frontend URL exactly
- **PUPPETEER_EXECUTABLE_PATH**: Required for browser-based scraping on Linux

## Verification

After setting these variables and deploying:

1. Check scraper logs show "Added X new events to the database"  
2. Verify API endpoint `/api/debug/events` shows events with `source: "do615"`
3. Confirm frontend displays the scraped events

## Root Cause

The scraper was connecting to the wrong database cluster due to mismatched environment variables. The DO615 scraper was saving events to a different database than what the API was reading from, causing the "phantom events" issue where scraper showed success but API showed no new events.