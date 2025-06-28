#!/usr/bin/env node

/**
 * Authentication Debug Script
 * Helps troubleshoot session and authentication issues
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';

async function debugAuth() {
  console.log('🔍 Tinglebot Authentication Debug\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Testing server health...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Server is running');
      console.log('   Status:', health.status);
      console.log('   Database connections:', health.connections);
    } else {
      console.log('❌ Server health check failed');
      return;
    }

    // Test 2: Check current auth status
    console.log('\n2️⃣ Testing current authentication status...');
    const authResponse = await fetch(`${BASE_URL}/api/user`, {
      credentials: 'include'
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('✅ Auth endpoint responded');
      console.log('   Authenticated:', authData.authenticated);
      console.log('   Username:', authData.username);
      console.log('   Message:', authData.message);
    } else {
      console.log('❌ Auth endpoint failed:', authResponse.status);
    }

    // Test 3: Check session debug (if in development)
    console.log('\n3️⃣ Testing session debug endpoint...');
    const debugResponse = await fetch(`${BASE_URL}/api/debug/session`, {
      credentials: 'include'
    });
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ Session debug available');
      console.log('   Session ID:', debugData.session?.id || 'none');
      console.log('   Passport data:', debugData.session?.passport || 'none');
      console.log('   Is authenticated:', debugData.isAuthenticated);
      console.log('   Cookie present:', debugData.headers.cookie);
      console.log('   Environment:', debugData.environment);
    } else if (debugResponse.status === 404) {
      console.log('ℹ️  Session debug not available (production mode)');
    } else {
      console.log('❌ Session debug failed:', debugResponse.status);
    }

    // Test 4: Test Discord OAuth initiation
    console.log('\n4️⃣ Testing Discord OAuth initiation...');
    const oauthResponse = await fetch(`${BASE_URL}/auth/discord`, {
      redirect: 'manual',
      credentials: 'include'
    });
    
    if (oauthResponse.status === 302) {
      const location = oauthResponse.headers.get('location');
      console.log('✅ Discord OAuth redirect initiated');
      console.log('   Redirect URL:', location);
      
      if (location && location.includes('discord.com')) {
        console.log('   ✅ Valid Discord OAuth URL');
      } else {
        console.log('   ⚠️  Unexpected redirect URL');
      }
    } else {
      console.log('❌ Discord OAuth initiation failed:', oauthResponse.status);
    }

    // Test 5: Check environment variables
    console.log('\n5️⃣ Environment check...');
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      DOMAIN: process.env.DOMAIN,
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ? 'set' : 'not set',
      DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ? 'set' : 'not set',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'set' : 'not set'
    };
    
    console.log('Environment variables:');
    Object.entries(envCheck).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // Summary
    console.log('\n📋 Summary:');
    console.log('If you see "User not authenticated, showing guest mode":');
    console.log('1. Check if you\'re logged in with Discord');
    console.log('2. Verify session cookies are being set');
    console.log('3. Check if the domain configuration is correct');
    console.log('4. Ensure HTTPS is properly configured in production');
    console.log('5. Verify Discord OAuth callback URL is correct');

  } catch (error) {
    console.error('❌ Debug script error:', error.message);
  }
}

// Run the debug script
debugAuth(); 