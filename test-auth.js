/* ============================================================================
 * File: test-auth.js
 * Purpose: Test script to debug authentication issues
 * ============================================================================ */

const fetch = require('node-fetch');

async function testAuth() {
  const baseUrl = process.env.TEST_URL || 'https://tinglebot.xyz';
  
  console.log('🔍 Testing authentication endpoints...');
  console.log(`📍 Base URL: ${baseUrl}`);
  
  try {
    // Test 1: Check session debug endpoint
    console.log('\n1️⃣ Testing session debug endpoint...');
    const debugResponse = await fetch(`${baseUrl}/api/debug/session`, {
      credentials: 'include'
    });
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ Session debug data:', JSON.stringify(debugData, null, 2));
    } else {
      console.log('❌ Session debug failed:', debugResponse.status, debugResponse.statusText);
    }
    
    // Test 2: Check user endpoint
    console.log('\n2️⃣ Testing user endpoint...');
    const userResponse = await fetch(`${baseUrl}/api/user`, {
      credentials: 'include'
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ User data:', JSON.stringify(userData, null, 2));
    } else {
      console.log('❌ User endpoint failed:', userResponse.status, userResponse.statusText);
    }
    
    // Test 3: Check health endpoint
    console.log('\n3️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check:', JSON.stringify(healthData, null, 2));
    } else {
      console.log('❌ Health check failed:', healthResponse.status, healthResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAuth(); 