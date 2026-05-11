# Vercel Deployment Guide

## Prerequisites

1. GitHub account with your repository
2. Vercel account (sign up at https://vercel.com)
3. Backend already deployed at: https://sumo-d68k.onrender.com

## Quick Deploy

### Option 1: Deploy Button (Fastest)

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Vercel will auto-detect the configuration from `vercel.json`
5. Click "Deploy"

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Configuration

### Environment Variables

The frontend is pre-configured to use your backend:
- `VITE_API_URL=https://sumo-d68k.onrender.com/api`
- `VITE_WS_URL=https://sumo-d68k.onrender.com`

These are set in `frontend/.env.production` and will be used automatically.

### Build Settings (Auto-detected from vercel.json)

- **Framework Preset**: Other
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm install`

## Update Backend CORS

After deploying to Vercel, you'll get a URL like:
`https://your-project.vercel.app`

Update your backend's CORS settings on Render:

1. Go to Render Dashboard
2. Select your backend service (sumo-d68k)
3. Go to Environment
4. Update `CORS_ORIGIN` to include your Vercel URL:
   ```
   CORS_ORIGIN=https://your-project.vercel.app,https://your-custom-domain.com
   ```
5. Save changes (backend will auto-redeploy)

## Custom Domain (Optional)

1. Go to your Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions
5. Update backend CORS_ORIGIN with your custom domain

## Deployment Checklist

- [x] Backend deployed at https://sumo-d68k.onrender.com
- [x] Frontend `.env.production` configured with backend URL
- [x] `vercel.json` configuration file created
- [ ] Code pushed to GitHub
- [ ] Vercel project created and connected to GitHub
- [ ] Frontend deployed successfully
- [ ] Backend CORS updated with Vercel URL
- [ ] Test login and API calls work
- [ ] WebSocket connections work (if applicable)

## Verify Deployment

After deployment:

1. **Check Frontend Loads**
   - Visit your Vercel URL
   - Check browser console for errors
   - Verify all assets load correctly

2. **Test API Connection**
   - Try logging in
   - Check Network tab for API calls
   - Verify requests go to https://sumo-d68k.onrender.com

3. **Test Features**
   - User authentication
   - Map visualization
   - Simulation controls
   - Data upload/download

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Check backend CORS_ORIGIN includes your Vercel URL
2. Verify backend is running: https://sumo-d68k.onrender.com/health
3. Check browser Network tab for the exact error
4. Make sure URLs don't have trailing slashes

### Build Fails

If Vercel build fails:

1. Check build logs in Vercel dashboard
2. Verify `npm run build` works locally
3. Check all dependencies are in package.json
4. Ensure Node version compatibility

### API Calls Fail

If API calls don't work:

1. Check `.env.production` has correct backend URL
2. Verify backend is accessible
3. Check browser console for errors
4. Test backend directly: `curl https://sumo-d68k.onrender.com/health`

### WebSocket Issues

If real-time features don't work:

1. Verify `VITE_WS_URL` is set correctly
2. Check backend WebSocket configuration
3. Some features may need backend updates for WebSocket support

## Automatic Deployments

Vercel automatically deploys when you push to GitHub:

- **Production**: Pushes to `main` or `master` branch
- **Preview**: Pushes to other branches or pull requests

```bash
# Deploy to production
git add .
git commit -m "Update feature"
git push origin master
```

## Environment-Specific Builds

### Development
```bash
npm run dev
# Uses .env or .env.local
```

### Production (Local Test)
```bash
npm run build
npm run preview
# Uses .env.production
```

### Vercel Production
```bash
vercel --prod
# Uses .env.production + Vercel environment variables
```

## Performance Optimization

Vercel automatically provides:
- ✅ Global CDN
- ✅ Automatic HTTPS
- ✅ Asset optimization
- ✅ Gzip/Brotli compression
- ✅ HTTP/2 support
- ✅ Smart caching

## Monitoring

### Vercel Analytics (Optional)

Add to your project:
```bash
npm install @vercel/analytics
```

In `frontend/src/main.jsx`:
```javascript
import { Analytics } from '@vercel/analytics/react';

// Add to your app
<Analytics />
```

### Check Deployment Status

- Vercel Dashboard: https://vercel.com/dashboard
- Deployment logs: Available in each deployment
- Real-time logs: `vercel logs`

## Cost

- **Hobby Plan**: Free
  - Unlimited deployments
  - 100 GB bandwidth/month
  - Automatic HTTPS
  - Perfect for personal projects

- **Pro Plan**: $20/month
  - Unlimited bandwidth
  - Advanced analytics
  - Team collaboration
  - Priority support

## Security Headers

Already configured in `vercel.json`:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: Restricted geolocation, microphone, camera

## Rollback

If something goes wrong:

1. Go to Vercel Dashboard
2. Select your project
3. Go to "Deployments"
4. Find a previous working deployment
5. Click "..." → "Promote to Production"

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
- Project Issues: Create an issue in your GitHub repository

## Next Steps

1. Deploy to Vercel
2. Get your Vercel URL
3. Update backend CORS
4. Test the application
5. (Optional) Add custom domain
6. (Optional) Set up monitoring
