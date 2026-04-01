# Crawlix - Render Deployment Guide

This guide will walk you through deploying Crawlix on Render.com.

---

## Prerequisites

1. A [Render.com](https://render.com) account (free tier available)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. (Optional) A PostgreSQL database for persistent storage
4. (Optional) A Webflow API token for CMS integration

---

## Method 1: Deploy with render.yaml (Recommended)

### Step 1: Push Your Code to Git

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Crawlix application"

# Add your remote repository (replace with your repo URL)
git remote add origin https://github.com/yourusername/crawlix.git

# Push to GitHub/GitLab/Bitbucket
git push -u origin main
```

### Step 2: Create New Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** button
3. Select **"Web Service"**
4. Connect your Git repository
5. Render will automatically detect the `render.yaml` file

### Step 3: Configure Environment Variables (Optional)

In the Render dashboard, add these environment variables if needed:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | No (uses in-memory storage if not set) |
| `WEBFLOW_API_TOKEN` | Your Webflow API token | Yes (for Webflow features) |

**Example DATABASE_URL format:**
```
postgresql://username:password@hostname:5432/database_name
```

### Step 4: Deploy

- Render will automatically build and deploy your application
- The build process will:
  1. Install dependencies (`npm install`)
  2. Build the application (`npm run build`)
  3. Start the server (`npm start`)

### Step 5: Access Your Application

- Once deployed, Render will provide you with a URL like: `https://crawlix.onrender.com`
- Your application will be live at this URL!

---

## Method 2: Manual Deployment (Alternative)

If you prefer to configure manually without `render.yaml`:

### Step 1: Create New Web Service

1. Go to Render Dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository

### Step 2: Configure Service Settings

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `crawlix` |
| **Region** | Choose nearest to your users |
| **Branch** | `main` (or your default branch) |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Free (or your preferred plan) |

### Step 3: Add Environment Variables

Add the following environment variables in the **Environment** section:

```
NODE_VERSION=20.19.0
PORT=10000
NODE_ENV=production
```

Optional variables:
```
DATABASE_URL=your_postgresql_connection_string
WEBFLOW_API_TOKEN=your_webflow_token
```

### Step 4: Deploy

Click **"Create Web Service"** and Render will start building your app.

---

## Setting Up PostgreSQL Database (Optional but Recommended)

For persistent data storage, add a PostgreSQL database:

### Option A: Render PostgreSQL (Recommended)

1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `crawlix-db`
   - **Database**: `crawlix`
   - **User**: Auto-generated
   - **Region**: Same as your web service
   - **Plan**: Free (or your preference)

3. After creation, copy the **Internal Database URL**

4. Add to your web service environment variables:
   ```
   DATABASE_URL=<paste_internal_database_url_here>
   ```

### Option B: External PostgreSQL

You can also use external PostgreSQL providers like:
- Supabase
- Neon
- ElephantSQL
- Railway

Just add their connection string to `DATABASE_URL`.

---

## Post-Deployment Steps

### 1. Initialize Database Schema

If using PostgreSQL, run the database migration:

```bash
# SSH into your Render instance or use Render Shell
npm run db:push
```

Or manually connect to your database and run the schema.

### 2. Test Your Application

Visit your Render URL and test:
- ✅ Home page loads
- ✅ Navigation works
- ✅ Can access /extract dashboard
- ✅ Webflow integration works (if token configured)

### 3. Configure Custom Domain (Optional)

1. Go to your web service settings
2. Click **"Custom Domains"**
3. Add your domain (e.g., `crawlix.com`)
4. Update your DNS records as instructed by Render

---

## Monitoring & Logs

### View Logs

1. Go to your web service in Render Dashboard
2. Click **"Logs"** tab
3. View real-time application logs

### Monitor Performance

1. Click **"Metrics"** tab
2. View:
   - CPU usage
   - Memory usage
   - Request rate
   - Response time

---

## Troubleshooting

### Build Fails

**Issue**: Build command fails

**Solution**: 
- Check that all dependencies are in `package.json`
- Ensure Node version is 20.x or higher
- Check build logs for specific errors

### Application Crashes on Start

**Issue**: App starts then immediately crashes

**Solution**:
- Check that `PORT` environment variable is set
- Review logs for error messages
- Ensure `npm start` command is correct

### Database Connection Issues

**Issue**: Can't connect to PostgreSQL

**Solution**:
- Verify `DATABASE_URL` is correctly formatted
- Check database is running and accessible
- Ensure database firewall allows connections from Render

### Environment Variables Not Working

**Issue**: Environment variables not loading

**Solution**:
- Double-check variable names (case-sensitive)
- Restart the web service after adding variables
- Use Render's environment tab, not `.env` files

---

## Scaling & Performance

### Free Tier Limitations

- Service spins down after 15 minutes of inactivity
- First request after spin-down will be slow (30-60 seconds)
- 750 hours/month free

### Upgrade for Better Performance

Consider upgrading to paid plans for:
- ✅ No spin-down (always active)
- ✅ More CPU & memory
- ✅ Faster build times
- ✅ Custom domains with SSL
- ✅ Better support

---

## Updating Your Application

### Deploy Updates

Render automatically deploys when you push to your connected branch:

```bash
# Make your changes
git add .
git commit -m "Update feature X"
git push origin main
```

Render will automatically:
1. Detect the push
2. Build the new version
3. Deploy with zero-downtime

### Manual Deploy

You can also trigger manual deploys from the Render Dashboard:
1. Go to your web service
2. Click **"Manual Deploy"**
3. Select **"Clear build cache & deploy"** (if needed)

---

## Security Best Practices

1. **Never commit `.env` files** - Use Render's environment variables
2. **Use strong database passwords** - Auto-generated by Render
3. **Enable HTTPS** - Enabled by default on Render
4. **Rotate API tokens** - Update Webflow tokens periodically
5. **Monitor logs** - Check for suspicious activity

---

## Support & Resources

- **Render Documentation**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Node.js on Render**: https://render.com/docs/deploy-node-express-app

---

## Quick Deployment Checklist

- [ ] Code pushed to Git repository
- [ ] Repository connected to Render
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] Environment variables configured (if needed)
- [ ] PostgreSQL database created (optional)
- [ ] `DATABASE_URL` set (if using PostgreSQL)
- [ ] `WEBFLOW_API_TOKEN` set (if using Webflow)
- [ ] Application deployed successfully
- [ ] Test all functionality
- [ ] Custom domain configured (optional)

---

**🎉 Congratulations! Your Crawlix application is now live on Render!**

For questions or issues, check the troubleshooting section or Render's documentation.
