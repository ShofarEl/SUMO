# Quick Deploy Guide

## 🚀 Deploy in 3 Steps

### Step 1: Deploy Frontend to Vercel
```bash
# Option A: Use helper script
deploy-to-vercel.bat

# Option B: Web interface
# Go to https://vercel.com/new
# Import your GitHub repo
# Click Deploy
```

### Step 2: Update Backend CORS
After getting your Vercel URL (e.g., `https://your-project.vercel.app`):

1. Go to https://dashboard.render.com
2. Select service: **sumo-d68k**
3. Click **Environment**
4. Update `CORS_ORIGIN` to: `https://your-project.vercel.app`
5. Save (auto-redeploys in ~2 min)

### Step 3: Test
1. Visit your Vercel URL
2. Try logging in
3. Check browser console for errors
4. Test main features

## ✅ Pre-Deployment Checklist

Run verification:
```bash
node verify-vercel-ready.js
```

Should show: **14 passed, 0 failed**

## 📋 Current Configuration

### Backend (Already Deployed)
- URL: https://sumo-d68k.onrender.com
- Health: https://sumo-d68k.onrender.com/health
- Status: ✅ Running

### Frontend (Ready to Deploy)
- Platform: Vercel
- Config: ✅ vercel.json
- Env: ✅ .env.production
- Backend URL: ✅ Configured

## 🔧 Configuration Files

All set up and ready:
- ✅ `vercel.json` - Vercel config
- ✅ `frontend/.env.production` - Backend URL
- ✅ `frontend/.env.example` - Template
- ✅ Build tested and working

## 📖 Detailed Guides

- **DEPLOYMENT_SUMMARY.md** - Overview
- **VERCEL_DEPLOYMENT.md** - Full Vercel guide
- **UPDATE_CORS.md** - CORS configuration
- **DEPLOYMENT_CHECKLIST.md** - Complete checklist

## 🆘 Troubleshooting

### CORS Errors?
→ Update backend CORS_ORIGIN with your Vercel URL
→ See UPDATE_CORS.md

### Build Fails?
→ Run `cd frontend && npm run build` locally
→ Check error messages

### Backend Not Responding?
→ Check https://sumo-d68k.onrender.com/health
→ Free tier spins down (30-60s first request)

## 💰 Cost

Everything is free:
- Vercel: Free (Hobby plan)
- Render: Free tier (with spin-down)
- MongoDB: Free tier (512 MB)

**Total: $0/month**

## 🎯 After Deployment

1. ✅ Frontend deployed
2. ✅ CORS updated
3. ✅ Application tested
4. Optional: Add custom domain
5. Optional: Set up monitoring
6. Optional: Upgrade to paid tiers

---

**Ready?** Run `deploy-to-vercel.bat` or go to https://vercel.com/new
