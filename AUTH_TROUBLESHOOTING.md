# 🔐 Authentication Troubleshooting Guide

## 🚨 Issue: "User not authenticated, showing guest mode"

If you're seeing this message even after logging in with Discord, here are the most common causes and solutions:

## 🔍 Quick Diagnosis

### 1. Check Browser Console
Open your browser's developer tools (F12) and check the Console tab for:
- Authentication errors
- Session cookie issues
- Network request failures

### 2. Check Network Tab
Look for requests to `/api/user` and check:
- Response status (should be 200)
- Response body (should show `authenticated: true`)
- Request headers (should include cookies)

## 🛠️ Common Solutions

### Solution 1: Session Configuration Issues

**Problem**: Session cookies not being set or read properly

**Fix**: The session configuration has been updated in `server.js`:
```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: true,
  saveUninitialized: false, // Changed from true
  cookie: {
    secure: isProduction, // true in production for HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Changed from 'strict' for better compatibility
  },
  name: 'tinglebot.sid' // Custom session name
}));
```

### Solution 2: Environment Variables

**Problem**: Missing or incorrect environment variables

**Check these variables in Railway:**
```bash
NODE_ENV=production
RAILWAY_ENVIRONMENT=true
DOMAIN=tinglebot.xyz
SESSION_SECRET=your_secure_session_secret
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=https://tinglebot.xyz/auth/discord/callback
```

### Solution 3: Discord OAuth Configuration

**Problem**: Discord OAuth callback URL mismatch

**Fix**: Update your Discord application settings:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to "OAuth2" → "General"
4. Add `https://tinglebot.xyz/auth/discord/callback` to "Redirects"
5. Save changes

### Solution 4: HTTPS/SSL Issues

**Problem**: Mixed content or SSL certificate issues

**Check**:
- Ensure your domain `tinglebot.xyz` has a valid SSL certificate
- Verify Railway is serving HTTPS
- Check that all requests use HTTPS

### Solution 5: Cookie Domain Issues

**Problem**: Cookies not being set for the correct domain

**Fix**: The domain setting has been removed from session configuration to prevent issues.

## 🔧 Debugging Steps

### Step 1: Test Authentication Endpoint

Visit `https://tinglebot.xyz/api/user` in your browser. You should see:
```json
{
  "authenticated": true,
  "username": "YourUsername",
  "discordId": "123456789",
  ...
}
```

If you see `"authenticated": false`, the session is not persisting.

### Step 2: Check Session Debug (Development Only)

If running locally, visit `http://localhost:5001/api/debug/session` to see:
- Session ID
- Passport data
- Authentication status
- Cookie information

### Step 3: Test OAuth Flow

1. Clear all cookies for your domain
2. Visit `https://tinglebot.xyz`
3. Click "Login with Discord"
4. Complete the OAuth flow
5. Check if you're redirected back with `?login=success`
6. Check the `/api/user` endpoint again

### Step 4: Browser Cookie Check

1. Open Developer Tools (F12)
2. Go to Application/Storage tab
3. Look for cookies under your domain
4. Check if `tinglebot.sid` cookie exists
5. Verify the cookie has the correct domain and secure flags

## 🚀 Production Deployment Checklist

### Before Deploying:
- [ ] All environment variables set in Railway
- [ ] Discord OAuth callback URL updated
- [ ] Session secret is secure and unique
- [ ] Domain DNS configured correctly

### After Deploying:
- [ ] Test OAuth flow from scratch
- [ ] Verify HTTPS is working
- [ ] Check session persistence
- [ ] Test logout functionality

## 🔍 Advanced Debugging

### Check Railway Logs
1. Go to your Railway project dashboard
2. Click on the deployment
3. Check the "Logs" tab for authentication errors
4. Look for session-related messages

### Test with Different Browsers
- Try incognito/private mode
- Test with different browsers
- Check if the issue is browser-specific

### Check Database Connection
Ensure your MongoDB connection is working:
- Visit `https://tinglebot.xyz/api/health`
- Check if all database connections show `true`

## 🆘 Still Having Issues?

If the problem persists:

1. **Check Railway Logs**: Look for authentication errors
2. **Verify Environment**: Ensure all variables are set correctly
3. **Test Locally**: Try reproducing the issue locally
4. **Clear Everything**: Clear cookies, cache, and try again
5. **Check Discord App**: Verify Discord application settings

## 📞 Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "User not authenticated" | Session not persisting | Check session configuration |
| "OAuth callback failed" | Wrong callback URL | Update Discord app settings |
| "Session expired" | Cookie issues | Check cookie domain/secure settings |
| "Database connection failed" | MongoDB issues | Check connection strings |

---

**Need more help?** Check the server logs in Railway dashboard for specific error messages. 