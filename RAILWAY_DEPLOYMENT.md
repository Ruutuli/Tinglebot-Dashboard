# 🚀 Railway Deployment Guide for Tinglebot Dashboard

This guide will help you deploy your Tinglebot Dashboard to Railway with the custom domain `tinglebot.xyz`.

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Domain**: You own `tinglebot.xyz` and can configure DNS
4. **MongoDB Atlas**: Database hosted on MongoDB Atlas
5. **Discord Application**: OAuth2 application configured

## 🔧 Step 1: Prepare Your Environment Variables

### 1.1 Copy Production Environment Template
Copy the contents from `.env.production` and update with your actual values:

```bash
# Core Configuration
NODE_ENV=production
RAILWAY_ENVIRONMENT=true
DOMAIN=tinglebot.xyz
PORT=5001

# Database URLs (MongoDB Atlas)
MONGODB_TINGLEBOT_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/tinglebot
MONGODB_INVENTORIES_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/inventories
MONGODB_VENDING_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/vendingInventories

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=https://tinglebot.xyz/auth/discord/callback

# Session Security
SESSION_SECRET=your_secure_random_string_here

# Google Services
GOOGLE_PROJECT_ID=your_google_project_id
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=your_service_account_email
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_X509_CERT_URL=your_cert_url

# Discord Bot
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_bot_client_id
PROD_GUILD_ID=your_production_guild_id

# Google Sheets
ITEMS_SPREADSHEET_ID=your_items_spreadsheet_id
```

### 1.2 Generate Secure Session Secret
Generate a secure random string for `SESSION_SECRET`:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 64
```

## 🚀 Step 2: Deploy to Railway

### 2.1 Connect Your Repository
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your Tinglebot Dashboard repository
5. Railway will automatically detect it's a Node.js project

### 2.2 Configure Environment Variables
1. In your Railway project dashboard, go to the "Variables" tab
2. Add all the environment variables from Step 1.1
3. Make sure to set `NODE_ENV=production` and `RAILWAY_ENVIRONMENT=true`

### 2.3 Deploy
1. Railway will automatically build and deploy your application
2. Monitor the build logs for any errors
3. Once deployed, you'll get a Railway URL like `https://your-app-name.railway.app`

## 🌐 Step 3: Configure Custom Domain

### 3.1 Add Domain in Railway
1. In your Railway project, go to the "Settings" tab
2. Scroll down to "Domains"
3. Click "Add Domain"
4. Enter `tinglebot.xyz`
5. Railway will provide you with DNS records to configure

### 3.2 Configure DNS Records
Configure your domain's DNS with the records Railway provides:

**Type A Record:**
```
Name: @
Value: [Railway provided IP]
TTL: 300
```

**Type CNAME Record (if needed):**
```
Name: www
Value: tinglebot.xyz
TTL: 300
```

### 3.3 Wait for DNS Propagation
DNS changes can take up to 48 hours to propagate globally, but usually take 15-30 minutes.

## 🔐 Step 4: Update Discord OAuth Configuration

### 4.1 Update Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to "OAuth2" → "General"
4. Add `https://tinglebot.xyz/auth/discord/callback` to the "Redirects" section
5. Save changes

### 4.2 Update Environment Variables
Make sure your Railway environment variables include:
```
DISCORD_CALLBACK_URL=https://tinglebot.xyz/auth/discord/callback
```

## ✅ Step 5: Verify Deployment

### 5.1 Health Check
Visit `https://tinglebot.xyz/api/health` to verify the application is running.

### 5.2 Test OAuth Flow
1. Visit `https://tinglebot.xyz`
2. Try logging in with Discord
3. Verify the callback works correctly

### 5.3 Check Logs
Monitor Railway logs for any errors:
1. Go to your Railway project
2. Click on the deployment
3. Check the "Logs" tab for any issues

## 🔧 Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility (>=18.0.0)

2. **Database Connection Issues**
   - Ensure MongoDB Atlas IP whitelist includes Railway's IPs
   - Verify connection strings are correct
   - Check database user permissions

3. **OAuth Callback Issues**
   - Verify Discord callback URL is exactly `https://tinglebot.xyz/auth/discord/callback`
   - Check that `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are correct

4. **Session Issues**
   - Ensure `SESSION_SECRET` is set and secure
   - Verify `DOMAIN` is set to `tinglebot.xyz`

### Useful Commands:

```bash
# Check Railway CLI status
railway status

# View logs
railway logs

# Redeploy
railway up

# Check environment variables
railway variables
```

## 📊 Monitoring

### Railway Dashboard
- Monitor resource usage in Railway dashboard
- Set up alerts for high CPU/memory usage
- Check deployment logs regularly

### Application Health
- The `/api/health` endpoint provides system status
- Monitor database connections
- Check OAuth authentication flow

## 🔄 Continuous Deployment

Railway automatically deploys when you push to your main branch. To set up:

1. Connect your GitHub repository
2. Railway will watch for changes
3. Automatic deployments on push to main branch
4. Preview deployments for pull requests

## 🛡️ Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **HTTPS**: Railway provides automatic HTTPS certificates
3. **Session Security**: Use strong session secrets
4. **Database**: Use MongoDB Atlas with proper authentication
5. **OAuth**: Configure Discord OAuth with correct redirect URLs

## 📞 Support

If you encounter issues:
1. Check Railway documentation: [docs.railway.app](https://docs.railway.app)
2. Review application logs in Railway dashboard
3. Verify all environment variables are set correctly
4. Test locally with production environment variables

---

**Your Tinglebot Dashboard should now be live at `https://tinglebot.xyz`! 🎉** 