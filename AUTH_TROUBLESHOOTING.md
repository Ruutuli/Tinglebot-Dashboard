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

## Issue: User Not Authenticated After Discord Login

### Symptoms
- User completes Discord OAuth flow
- Session exists but `passport` is `undefined` in session
- User shows as "Guest" instead of authenticated user
- `isAuthenticated: false` in API responses

### Root Causes & Solutions

#### 1. Secure Cookie Issues (Most Common)

**Problem**: Session cookies are set to `secure: true` but site is accessed over HTTP or through a proxy.

**Solution**: 
- Set `FORCE_HTTPS=true` in your environment variables if you're using HTTPS
- Or remove the `FORCE_HTTPS` variable to disable secure cookies

```bash
# In your .env file or Railway environment variables:
FORCE_HTTPS=true  # Only if you're using HTTPS
```

#### 2. Domain Configuration Issues

**Problem**: Session cookies are not being sent due to domain mismatch.

**Check**:
- Ensure `DOMAIN=tinglebot.xyz` is set correctly (not `tionglebot.xyz`)
- Verify the domain in your Discord OAuth app settings matches exactly

#### 3. Proxy/Reverse Proxy Issues

**Problem**: App is behind a reverse proxy (Railway, etc.) and headers are not being trusted.

**Solution**: The app now automatically enables `trust proxy` in production.

#### 4. Session Store Issues

**Problem**: Sessions are not being saved properly.

**Debug Steps**:
1. Check the `/api/debug/session` endpoint
2. Look for session save errors in server logs
3. Verify `SESSION_SECRET` is set

### Debugging Steps

#### Step 1: Check Session Debug Endpoint
Visit: `https://tinglebot.xyz/api/debug/session`

This will show:
- Session ID and passport data
- Authentication status
- Request headers
- Environment configuration

#### Step 2: Test Authentication Flow
1. Clear browser cookies for the domain
2. Visit `https://tinglebot.xyz/login`
3. Complete Discord OAuth
4. Check `/api/debug/session` again

#### Step 3: Check Server Logs
Look for these log messages:
- `✅ Discord login successful for user: [username]`
- `🔍 Session after login:` with passport data
- Any session save errors

#### Step 4: Environment Variables Check
Ensure these are set correctly:
```bash
DOMAIN=tinglebot.xyz
SESSION_SECRET=your_secure_session_secret
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
FORCE_HTTPS=true  # Only if using HTTPS
```

### Quick Fixes

#### Fix 1: Disable Secure Cookies (Temporary)
If you're not using HTTPS, remove or set:
```bash
FORCE_HTTPS=false
```

#### Fix 2: Clear Browser Data
1. Clear all cookies for `tinglebot.xyz`
2. Clear browser cache
3. Try logging in again

#### Fix 3: Check Discord App Settings
1. Go to Discord Developer Portal
2. Check your OAuth app settings
3. Ensure redirect URI is: `https://tinglebot.xyz/auth/discord/callback`

### Testing Script

Run the test script to check all endpoints:
```bash
node test-auth.js
```

Or set a custom URL:
```bash
TEST_URL=https://your-domain.com node test-auth.js
```

### Common Environment Issues

#### Railway Deployment
- Ensure all environment variables are set in Railway dashboard
- Check that `RAILWAY_ENVIRONMENT=true` is set
- Verify domain configuration

#### Local Development
- Use `http://localhost:5001` for local testing
- Set `NODE_ENV=development`
- Don't set `FORCE_HTTPS` locally

### Still Having Issues?

1. Check the server logs for detailed error messages
2. Use the debug endpoint to see session state
3. Verify all environment variables are correct
4. Test with a different browser or incognito mode
5. Check if the issue occurs on all devices or just one

### Contact Support

If you're still experiencing issues:
1. Include the output from `/api/debug/session`
2. Share relevant server logs
3. Describe the exact steps to reproduce
4. Mention your deployment platform (Railway, etc.) 