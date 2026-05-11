# Deployment Checklist

## Pre-Deployment

### Code Preparation
- [ ] All code committed to Git
- [ ] `.env` files not committed (check `.gitignore`)
- [ ] Frontend build works locally (`cd frontend && npm run build`)
- [ ] Backend starts locally (`cd backend && npm start`)
- [ ] All tests passing

### Database Setup
- [ ] MongoDB Atlas cluster created
- [ ] Database user created with strong password
- [ ] IP whitelist configured (0.0.0.0/0 for Render)
- [ ] Connection string tested locally

### Repository
- [ ] Code pushed to GitHub
- [ ] Repository is public or Render has access
- [ ] `render.yaml` in root directory
- [ ] `.node-version` file in backend directory

## Render Deployment

### Initial Setup
- [ ] Render account created
- [ ] GitHub repository connected to Render
- [ ] Blueprint deployed from `render.yaml`

### Backend Configuration
- [ ] Service name: georgetown-traffic-backend
- [ ] Environment: Node
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Health check path: `/health`

### Backend Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` set to Atlas connection string
- [ ] `JWT_SECRET` generated (use Render's auto-generate)
- [ ] `JWT_EXPIRES_IN=7d`
- [ ] `CORS_ORIGIN` set (update after frontend deploys)
- [ ] `MAX_REQUEST_SIZE=10mb`
- [ ] `REQUEST_TIMEOUT=30000`
- [ ] `RATE_LIMIT_WINDOW_MS=900000`
- [ ] `RATE_LIMIT_MAX_REQUESTS=100`

### Frontend Configuration
- [ ] Service name: georgetown-traffic-frontend
- [ ] Environment: Static Site
- [ ] Build command: `npm install && npm run build`
- [ ] Publish directory: `dist`

### Frontend Environment Variables
- [ ] `VITE_API_URL` set to backend URL

## Post-Deployment

### Verification
- [ ] Backend health check responds: `https://your-backend.onrender.com/health`
- [ ] Frontend loads: `https://your-frontend.onrender.com`
- [ ] CORS updated with frontend URL
- [ ] Backend redeployed after CORS update

### Database Initialization
- [ ] Admin user created via API
- [ ] Login works on frontend
- [ ] Network data imported (if available)

### Testing
- [ ] Can register new user
- [ ] Can login
- [ ] Can access protected routes
- [ ] API endpoints respond correctly
- [ ] WebSocket connections work (if applicable)

### Monitoring
- [ ] Check backend logs for errors
- [ ] Check frontend loads without console errors
- [ ] Monitor MongoDB Atlas metrics
- [ ] Set up Render alerts (optional)

## Security Checklist

- [ ] Strong passwords used everywhere
- [ ] JWT_SECRET is random and secure
- [ ] MongoDB user has minimal required permissions
- [ ] CORS only allows your frontend domain
- [ ] HTTPS enabled (Render does this automatically)
- [ ] Rate limiting configured
- [ ] No sensitive data in logs
- [ ] 2FA enabled on Render account
- [ ] 2FA enabled on MongoDB Atlas account

## Optional Enhancements

- [ ] Custom domain configured
- [ ] SSL certificate configured (if custom domain)
- [ ] Redis added for queue management
- [ ] Python AI service deployed
- [ ] Monitoring/alerting configured
- [ ] Backup strategy implemented
- [ ] CI/CD pipeline configured

## Troubleshooting

If deployment fails:

1. **Check Render logs** - Most issues show up here
2. **Verify environment variables** - Missing or incorrect values
3. **Test MongoDB connection** - Use connection string locally
4. **Check build logs** - npm install failures
5. **Verify Node version** - Should be 18+ 
6. **CORS issues** - Update CORS_ORIGIN and redeploy

## Rollback Plan

If something goes wrong:

1. Render keeps previous deployments
2. Can rollback from dashboard
3. Or redeploy previous Git commit
4. Database changes may need manual rollback

## Maintenance

Regular tasks:
- Update dependencies monthly
- Monitor logs weekly
- Check MongoDB storage usage
- Rotate JWT_SECRET quarterly
- Review and update rate limits as needed
- Keep Node.js version updated

## Cost Estimates

### Free Tier (Render)
- Backend: Free (750 hours/month, spins down after 15 min)
- Frontend: Free (100 GB bandwidth/month)
- MongoDB Atlas: Free (512 MB storage)

### Paid Tier (Recommended for Production)
- Backend Starter: $7/month (always on)
- Frontend: Free
- MongoDB Atlas M10: $57/month (2GB RAM, 10GB storage)

Total: ~$7-64/month depending on database needs
