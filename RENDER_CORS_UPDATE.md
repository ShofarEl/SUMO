# Update Backend CORS on Render

## Your Vercel URL
**Frontend:** https://sumo-pied.vercel.app

## Steps to Update CORS on Render

### 1. Go to Render Dashboard
Visit: https://dashboard.render.com

### 2. Select Your Backend Service
- Click on service: **sumo-d68k**
- Or go directly to: https://dashboard.render.com/web/srv-YOUR-SERVICE-ID

### 3. Update Environment Variable
1. Click **Environment** in the left sidebar
2. Find the `CORS_ORIGIN` variable
3. Update its value to:
   ```
   https://sumo-pied.vercel.app
   ```

4. Click **Save Changes**

### 4. Wait for Redeploy
- Render will automatically redeploy your backend
- This takes about 1-2 minutes
- Watch the "Events" tab for progress
- Wait for "Deploy live" status

### 5. Verify It's Working

#### Test Backend Health
```bash
curl https://sumo-d68k.onrender.com/health
```

Should return:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "..."
}
```

#### Test CORS
```bash
curl -H "Origin: https://sumo-pied.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://sumo-d68k.onrender.com/api/auth/login -v
```

Look for this header in response:
```
Access-Control-Allow-Origin: https://sumo-pied.vercel.app
```

### 6. Test from Frontend
1. Visit: https://sumo-pied.vercel.app
2. Open browser DevTools (F12)
3. Go to Console tab
4. Try to login or make an API call
5. Should work without CORS errors!

## Current Configuration

### Frontend (Vercel)
- **URL:** https://sumo-pied.vercel.app
- **Backend API:** https://sumo-d68k.onrender.com/api
- **Status:** ✅ Deployed

### Backend (Render)
- **URL:** https://sumo-d68k.onrender.com
- **Service:** sumo-d68k
- **CORS:** Update to `https://sumo-pied.vercel.app`
- **Status:** ⏳ Needs CORS update

## Troubleshooting

### Still Getting CORS Errors?

1. **Check the exact error in browser console**
   - Look for the blocked origin
   - Verify it matches your Vercel URL

2. **Verify backend redeployed**
   - Check "Events" tab on Render
   - Should see "Deploy triggered by config change"
   - Wait for "Deploy live"

3. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or try incognito/private window

4. **Check backend logs**
   - Go to Render dashboard
   - Click on your service
   - Click "Logs" tab
   - Look for CORS-related errors

5. **Verify environment variable**
   - Go back to Environment tab
   - Make sure CORS_ORIGIN shows: `https://sumo-pied.vercel.app`
   - No trailing slash
   - Exact match

### Backend Not Responding?

If backend is on free tier:
- It spins down after 15 minutes of inactivity
- First request takes 30-60 seconds to wake up
- Subsequent requests are fast

Test health endpoint:
```bash
curl https://sumo-d68k.onrender.com/health
```

## After CORS is Updated

### Test These Features:
- [ ] Login works
- [ ] Registration works
- [ ] Dashboard loads
- [ ] Map displays
- [ ] API calls succeed
- [ ] No CORS errors in console

### Optional: Add Custom Domain

If you want a custom domain for your frontend:
1. Go to Vercel project settings
2. Click "Domains"
3. Add your domain
4. Update backend CORS to include custom domain:
   ```
   CORS_ORIGIN=https://sumo-pied.vercel.app,https://yourdomain.com
   ```

## Summary

**What you need to do:**
1. Go to https://dashboard.render.com
2. Select service: sumo-d68k
3. Update CORS_ORIGIN to: `https://sumo-pied.vercel.app`
4. Save and wait for redeploy (~2 min)
5. Test your app at https://sumo-pied.vercel.app

**That's it!** Your full-stack app will be live and working.
