/* ============================================================================
 * File: test-auth.js
 * Purpose: Test script to verify Discord OAuth configuration
 * ============================================================================ */

require('dotenv').config();

// ------------------- Section: Configuration Check -------------------
console.log('🔍 Checking Discord OAuth Configuration...\n');

// Check required environment variables
const requiredVars = [
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'SESSION_SECRET'
];

const missingVars = [];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
    console.log(`❌ Missing: ${varName}`);
  } else {
    console.log(`✅ Found: ${varName}`);
  }
});

if (missingVars.length > 0) {
  console.log('\n⚠️  Missing required environment variables:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n📝 Please set these variables in your .env file or environment.');
  console.log('   See .env.example for reference.');
  process.exit(1);
}

// Check optional variables
console.log('\n📋 Optional Configuration:');
const optionalVars = [
  'DISCORD_CALLBACK_URL',
  'NODE_ENV',
  'PORT'
];

optionalVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: ${process.env[varName]}`);
  } else {
    console.log(`⚠️  ${varName}: Not set (using default)`);
  }
});

// ------------------- Section: Dependencies Check -------------------
console.log('\n📦 Checking Dependencies...');

try {
  const passport = require('passport');
  const DiscordStrategy = require('passport-discord');
  console.log('✅ passport and passport-discord are available');
} catch (error) {
  console.log('❌ Missing dependencies. Run: npm install passport passport-discord');
  process.exit(1);
}

// ------------------- Section: Configuration Summary -------------------
console.log('\n🎯 Configuration Summary:');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Port: ${process.env.PORT || 5001}`);
console.log(`   Callback URL: ${process.env.DISCORD_CALLBACK_URL || 'http://localhost:5001/auth/discord/callback'}`);

console.log('\n✅ Discord OAuth configuration looks good!');
console.log('\n🚀 To test the authentication:');
console.log('   1. Start the server: npm start');
console.log('   2. Visit: http://localhost:5001/login');
console.log('   3. Click "Continue with Discord"');
console.log('   4. Complete the Discord OAuth flow');

console.log('\n📚 For setup instructions, see the README.md file.'); 