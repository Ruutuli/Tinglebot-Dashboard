# Deployment Checklist

## Before Deploying

### 1. Environment Variables Check
Ensure these are set in Railway:
- `DOMAIN=tinglebot.xyz` (not `tionglebot.xyz`)
- `SESSION_SECRET=your_secure_session_secret`
- `DISCORD_CLIENT_ID=your_discord_client_id`
- `DISCORD_CLIENT_SECRET=your_discord_client_secret`
- `MONGODB_TINGLEBOT_URI_PROD=your_mongodb_uri`
- `MONGODB_INVENTORIES_URI_PROD=your_inventories_uri`
- `MONGODB_VENDING_URI_PROD=your_vending_uri`

### 2. Discord OAuth Settings
- Go to Discord Developer Portal
- Check your OAuth app settings
- Ensure redirect URI is: `https://tinglebot.xyz/auth/discord/callback`

### 3. Code Changes Made
- ✅ Session cookies set to `secure: false` to avoid HTTPS issues
- ✅ Simplified Discord callback
- ✅ Removed complex debugging middleware
- ✅ Added proxy trust for Railway

## Deployment Steps

### 1. Commit and Push
```bash
git add .
git commit -m "Fix authentication issues - simplify session config"
git push origin main
```

### 2. Monitor Railway Deployment
- Watch the Railway dashboard for deployment progress
- Check logs for any startup errors
- Wait for health check to pass

### 3. Test After Deployment
```bash
# Test the endpoints
node test-auth.js
```

## Common Deployment Issues

### Service Unavailable Error
**Cause**: Application fails to start due to configuration issues
**Solution**: 
- Check environment variables are set correctly
- Verify database connections
- Look at Railway logs for specific error messages

### Health Check Failure
**Cause**: `/api/health` endpoint returns error
**Solution**:
- Check database connections
- Verify all required environment variables
- Look for startup errors in logs

### Authentication Still Not Working
**Cause**: Session configuration issues
**Solution**:
1. Clear browser cookies for `tinglebot.xyz`
2. Try logging in again
3. Check `/api/debug/session` endpoint
4. Verify Discord OAuth settings

## Post-Deployment Testing

### 1. Health Check
Visit: `https://tinglebot.xyz/api/health`
Should return: `{"status":"ok",...}`

### 2. Debug Session
Visit: `https://tinglebot.xyz/api/debug/session`
Should show session information

### 3. Authentication Flow
1. Visit: `https://tinglebot.xyz/login`
2. Click "Continue with Discord"
3. Complete OAuth flow
4. Should redirect to dashboard as authenticated user

## If Deployment Still Fails

### Check Railway Logs
1. Go to Railway dashboard
2. Click on your service
3. Go to "Deployments" tab
4. Click on the failed deployment
5. Check the logs for specific error messages

### Common Error Messages
- `MongoServerSelectionError`: Database connection issue
- `EADDRINUSE`: Port already in use
- `MODULE_NOT_FOUND`: Missing dependencies
- `ENOENT`: Missing environment variables

### Rollback Plan
If deployment fails:
1. Revert to previous working commit
2. Push the revert
3. Railway will automatically redeploy the working version

## Success Indicators

✅ Health check passes (`/api/health` returns 200)
✅ Debug endpoint accessible (`/api/debug/session`)
✅ Discord OAuth flow completes
✅ User shows as authenticated after login
✅ Session persists across page refreshes 