/* ============================================================================
 * File: quick-fix.js
 * Purpose: Quick diagnostic and fix for authentication issues
 * ============================================================================ */

const fetch = require('node-fetch');

async function quickDiagnostic() {
  const baseUrl = 'https://tinglebot.xyz';
  
  console.log('🔍 Quick Authentication Diagnostic');
  console.log('=====================================\n');
  
  try {
    // Test 1: Check if the site is accessible
    console.log('1️⃣ Testing site accessibility...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    if (healthResponse.ok) {
      console.log('✅ Site is accessible');
    } else {
      console.log('❌ Site is not accessible');
      return;
    }
    
    // Test 2: Check current authentication status
    console.log('\n2️⃣ Checking current auth status...');
    const userResponse = await fetch(`${baseUrl}/api/user`, {
      credentials: 'include'
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('Current auth status:', userData.authenticated ? '✅ Authenticated' : '❌ Not authenticated');
      if (userData.authenticated) {
        console.log('User:', userData.username);
      }
    }
    
    // Test 3: Check Discord OAuth endpoint
    console.log('\n3️⃣ Testing Discord OAuth endpoint...');
    const oauthResponse = await fetch(`${baseUrl}/auth/discord`);
    console.log('OAuth redirect status:', oauthResponse.status);
    if (oauthResponse.status === 302) {
      console.log('✅ OAuth endpoint is working');
      console.log('Redirect location:', oauthResponse.headers.get('location'));
    } else {
      console.log('❌ OAuth endpoint issue');
    }
    
    // Test 4: Check login page
    console.log('\n4️⃣ Testing login page...');
    const loginResponse = await fetch(`${baseUrl}/login`);
    if (loginResponse.ok) {
      console.log('✅ Login page is accessible');
    } else {
      console.log('❌ Login page issue');
    }
    
    console.log('\n📋 Recommended Actions:');
    console.log('1. Clear browser cookies for tinglebot.xyz');
    console.log('2. Try logging in again at: https://tinglebot.xyz/login');
    console.log('3. Check if the issue persists in incognito mode');
    console.log('4. Verify Discord OAuth app settings match the domain');
    
    console.log('\n🔧 Environment Variables to Check:');
    console.log('- DOMAIN=tinglebot.xyz');
    console.log('- SESSION_SECRET (should be set)');
    console.log('- DISCORD_CLIENT_ID (should be set)');
    console.log('- DISCORD_CLIENT_SECRET (should be set)');
    console.log('- FORCE_HTTPS=true (if using HTTPS)');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

// Run the diagnostic
quickDiagnostic(); 