# Pre-Deployment Checklist for Crawlix

Use this checklist before deploying to Render or any production environment.

## ✅ Code Preparation

- [ ] All code changes committed
- [ ] No sensitive data in code (API keys, passwords)
- [ ] `.env` file is in `.gitignore`
- [ ] `node_modules` is in `.gitignore`
- [ ] All dependencies in `package.json`
- [ ] Build script works locally: `npm run build`
- [ ] Production start works locally: `npm start`

## ✅ Git Repository

- [ ] Code pushed to GitHub/GitLab/Bitbucket
- [ ] Repository is accessible to Render
- [ ] Correct branch set as default (usually `main`)
- [ ] Repository is public OR Render has access to private repo

## ✅ Render Configuration

- [ ] Render account created
- [ ] New Web Service created
- [ ] Repository connected to Render
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] Node version: 20.19.0 (set in render.yaml or env vars)

## ✅ Environment Variables

Required for production:
- [ ] `NODE_ENV=production`
- [ ] `PORT=10000` (or Render's default)

Optional but recommended:
- [ ] `DATABASE_URL` (PostgreSQL connection string)
- [ ] `WEBFLOW_API_TOKEN` (for Webflow integration)

## ✅ Database Setup (if using PostgreSQL)

- [ ] PostgreSQL database created on Render
- [ ] Database URL copied to environment variables
- [ ] Database schema initialized: `npm run db:push`
- [ ] Database accessible from web service

## ✅ Testing

Before going live:
- [ ] Build completes successfully
- [ ] Application starts without errors
- [ ] Home page loads correctly
- [ ] Navigation works (/, /extract, /jobs, /templates)
- [ ] Dashboard (/extract) is accessible
- [ ] Webflow integration works (if configured)
- [ ] No console errors in browser
- [ ] Mobile responsive design works

## ✅ Post-Deployment

After deployment:
- [ ] Application is live at Render URL
- [ ] Health check endpoint works: `/api/health`
- [ ] All pages load correctly
- [ ] Test core functionality
- [ ] Check server logs for errors
- [ ] Set up monitoring/alerts (optional)
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS (enabled by default on Render)

## ✅ Security

- [ ] HTTPS enabled
- [ ] Environment variables secured in Render dashboard
- [ ] No API keys in client-side code
- [ ] Database password is strong
- [ ] CORS configured properly (if needed)

## ✅ Performance

- [ ] Static assets cached properly
- [ ] Images optimized
- [ ] Bundle size reasonable
- [ ] First load time acceptable
- [ ] Consider upgrading from free tier if needed

## Common Issues & Solutions

### Build fails
- Check Node version matches requirements
- Verify all dependencies are in package.json
- Review build logs for specific errors

### Application won't start
- Check `PORT` environment variable
- Verify start command is correct
- Check server logs for errors

### Database connection fails
- Verify `DATABASE_URL` format
- Check database is running
- Test connection string locally first

### Environment variables not loading
- Double-check variable names (case-sensitive)
- Restart web service after adding variables
- Check Render dashboard, not .env files

---

**Ready to deploy?** Follow the [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md) for step-by-step instructions.
