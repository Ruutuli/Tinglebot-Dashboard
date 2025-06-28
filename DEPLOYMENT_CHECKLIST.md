# 🚀 Railway Deployment Checklist

## ✅ Pre-Deployment Fixes Applied

### 1. **Fixed Variable Declaration Order**
- ✅ Moved `isProduction` variable declaration before usage in `server.js`
- ✅ This was causing a ReferenceError during startup

### 2. **Updated Package Configuration**
- ✅ Changed Node.js engine from `>=18.0.0` to `18.x` for better Railway compatibility
- ✅ Added `build` script to `package.json`
- ✅ Removed conflicting `buildCommand` from `railway.json`

### 3. **Added Nixpacks Configuration**
- ✅ Created `nixpacks.toml` with explicit Node.js 18 configuration
- ✅ Specified build and start commands

### 4. **Optimized Build Process**
- ✅ Created `.dockerignore` to exclude unnecessary files
- ✅ This speeds up the Docker build process

## 🔧 Railway Environment Variables Required

Make sure these are set in your Railway project:

### **Essential Variables:**
```bash
NODE_ENV=production
RAILWAY_ENVIRONMENT=true
PORT=5001
```

### **Database Variables:**
```bash
MONGODB_TINGLEBOT_URI_PROD=your_mongodb_connection_string
MONGODB_INVENTORIES_URI_PROD=your_inventories_connection_string
MONGODB_VENDING_URI_PROD=your_vending_connection_string
```

### **Discord OAuth (Optional):**
```bash
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=https://your-domain.railway.app/auth/discord/callback
SESSION_SECRET=your_secure_session_secret
```

### **Domain Configuration:**
```bash
DOMAIN=your-domain.railway.app
```

## 🚀 Deployment Steps

1. **Commit and Push Changes:**
   ```bash
   git add .
   git commit -m "Fix Railway deployment issues"
   git push origin main
   ```

2. **Verify Railway Configuration:**
   - Check that `railway.json` is in your repository
   - Ensure all environment variables are set in Railway dashboard
   - Verify the health check path: `/api/health`

3. **Monitor Deployment:**
   - Watch the Railway deployment logs
   - Check for any startup errors
   - Verify the health check endpoint responds

## 🔍 Troubleshooting

### **If Deployment Still Fails:**

1. **Check Railway Logs:**
   - Look for specific error messages
   - Check if the application starts successfully

2. **Verify Environment Variables:**
   - Ensure all required variables are set
   - Check for typos in variable names

3. **Test Health Endpoint:**
   - Once deployed, visit: `https://your-domain.railway.app/api/health`
   - Should return a JSON response with status information

4. **Database Connection Issues:**
   - Verify MongoDB connection strings are correct
   - Check if databases are accessible from Railway's network

## 📊 Expected Behavior

After successful deployment:
- ✅ Application starts without errors
- ✅ Health check endpoint responds at `/api/health`
- ✅ Main dashboard loads at the root URL
- ✅ Database connections are established
- ✅ Static files are served correctly

## 🆘 Common Issues

1. **Build Timeout:** The `.dockerignore` file should help with this
2. **Startup Errors:** Fixed the `isProduction` variable issue
3. **Environment Variables:** Make sure all required variables are set in Railway
4. **Database Connections:** Verify connection strings and network access

## 📞 Next Steps

If deployment still fails after these fixes:
1. Check Railway deployment logs for specific error messages
2. Verify all environment variables are correctly set
3. Test the application locally with production environment variables
4. Contact Railway support if issues persist 