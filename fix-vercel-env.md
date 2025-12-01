# Fix Vercel Environment Variable

The MONGO_URI environment variable is missing from Vercel, which is why the API endpoints return HTML instead of JSON.

## Quick Fix:

Run this command to set the MONGO_URI in Vercel:

```bash
npx vercel env add MONGO_URI
```

When prompted, paste this value:
```
mongodb+srv://jdsea:jakeSeay2024@cluster0.v1spt.mongodb.net/MyMusicCity?retryWrites=true&w=majority
```

Then redeploy:
```bash
npx vercel --prod
```

## Alternative: Set via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Open your project "my-music-city"  
3. Go to Settings > Environment Variables
4. Add new variable:
   - Name: `MONGO_URI`
   - Value: `mongodb+srv://jdsea:jakeSeay2024@cluster0.v1spt.mongodb.net/MyMusicCity?retryWrites=true&w=majority`
   - Environments: Production, Preview, Development

5. Redeploy the project

This will make the API endpoints work and show the 56+ real events instead of 3 mock events.