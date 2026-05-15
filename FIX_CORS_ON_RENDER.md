# Fix CORS Error on Render

## Problem
Your Vercel frontend (`https://sumo-k7yb.vercel.app`) cannot access your Render backend (`https://sumo-d68k.onrender.com`) due to CORS policy.

## Solution

### Option 1: Add Vercel URL to CORS Whitelist (Recommended)

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your backend service (`sumo-d68k`)
3. Go to **Environment** tab
4. Find or add the `CORS_ORIGIN` variable
5. Set its value to:
   ```
   https://sumo-k7yb.vercel.app,http://localhost:3000
   ```
6. Click **Save Changes**
7. Render will automatically redeploy your backend

### Option 2: Temporary - Allow All Origins (For Testing Only)

If you want to test quickly, you can temporarily allow all origins:

1. In Render dashboard, set `CORS_ORIGIN` to:
   ```
   *
   ```
2. **Warning:** This is insecure for production! Only use for testing.

## After Fixing CORS

Once CORS is fixed, you still need to import the map data:

### Import Georgetown Map Data to MongoDB

Your Render backend needs the Georgetown GeoJSON data in MongoDB.

**Steps:**

1. Make sure your Render MongoDB is accessible
2. Run this command locally (it will connect to your Render MongoDB):
   ```bash
   node backend/scripts/import_georgetown_data.js
   ```

Or create a one-time job on Render:

1. Go to Render dashboard
2. Create a new **Background Worker** or **Cron Job**
3. Set command to: `node backend/scripts/import_georgetown_data.js`
4. Run it once to import the data

## Verify It Works

After both fixes:

1. Visit: `https://sumo-d68k.onrender.com/api/map/geojson`
2. You should see JSON data (not a CORS error)
3. Your Vercel frontend map should now display

## Current Error Breakdown

```
Access to XMLHttpRequest at 'https://sumo-d68k.onrender.com/api/map/geojson' 
from origin 'https://sumo-k7yb.vercel.app' has been blocked by CORS policy
```

This means:
- ✅ Backend is running
- ✅ Frontend is running
- ❌ Backend doesn't allow requests from your Vercel domain
- ❌ Map data might not be in MongoDB yet

## Quick Test

After adding CORS origin, test with curl:

```bash
curl https://sumo-d68k.onrender.com/api/map/geojson
```

If you see JSON data, CORS is fixed and data exists.
If you see 404, you need to import the data.
