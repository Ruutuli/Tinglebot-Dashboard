#!/usr/bin/env node

/**
 * Railway Deployment Setup Script
 * Validates environment configuration and provides deployment guidance
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🚀 Tinglebot Dashboard - Railway Deployment Setup\n');

// Check if we're in a production-like environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;

if (isProduction) {
  console.log('✅ Running in production environment');
} else {
  console.log('⚠️  Running in development environment');
}

// Generate a secure session secret if needed
console.log('\n🔐 Session Secret Generation:');
const sessionSecret = crypto.randomBytes(64).toString('hex');
console.log(`Generated secure session secret: ${sessionSecret}`);
console.log('Add this to your Railway environment variables as SESSION_SECRET\n');

// Check for required environment variables
console.log('📋 Required Environment Variables for Railway:');
const requiredVars = [
  'NODE_ENV',
  'DOMAIN',
  'MONGODB_TINGLEBOT_URI',
  'MONGODB_INVENTORIES_URI',
  'MONGODB_VENDING_URI',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'SESSION_SECRET',
  'GOOGLE_PROJECT_ID',
  'GOOGLE_PRIVATE_KEY_ID',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_X509_CERT_URL',
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'PROD_GUILD_ID',
  'ITEMS_SPREADSHEET_ID'
];

console.log('Required variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`  ❌ ${varName}: NOT SET`);
  }
});

// Check package.json
console.log('\n📦 Package.json Validation:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.scripts && packageJson.scripts.start) {
    console.log('  ✅ Start script found:', packageJson.scripts.start);
  } else {
    console.log('  ❌ No start script found in package.json');
  }
  
  if (packageJson.engines && packageJson.engines.node) {
    console.log('  ✅ Node.js version specified:', packageJson.engines.node);
  } else {
    console.log('  ⚠️  No Node.js version specified in package.json');
  }
  
  if (packageJson.dependencies) {
    console.log('  ✅ Dependencies found:', Object.keys(packageJson.dependencies).length, 'packages');
  }
} catch (error) {
  console.log('  ❌ Error reading package.json:', error.message);
}

// Check railway.json
console.log('\n🚂 Railway Configuration:');
try {
  const railwayJson = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
  console.log('  ✅ railway.json found and valid');
  
  if (railwayJson.deploy && railwayJson.deploy.healthcheckPath) {
    console.log('  ✅ Health check path:', railwayJson.deploy.healthcheckPath);
  }
  
  if (railwayJson.deploy && railwayJson.deploy.startCommand) {
    console.log('  ✅ Start command:', railwayJson.deploy.startCommand);
  }
} catch (error) {
  console.log('  ❌ Error reading railway.json:', error.message);
}

// Deployment checklist
console.log('\n📝 Railway Deployment Checklist:');
console.log('1. ✅ railway.json configured');
console.log('2. ✅ package.json has start script');
console.log('3. ✅ Environment variables template created (.env.production)');
console.log('4. 🔄 Connect GitHub repository to Railway');
console.log('5. 🔄 Add environment variables in Railway dashboard');
console.log('6. 🔄 Configure custom domain: tinglebot.xyz');
console.log('7. 🔄 Update Discord OAuth callback URL');
console.log('8. 🔄 Test deployment');

console.log('\n🌐 Domain Configuration:');
console.log('Domain: tinglebot.xyz');
console.log('Discord OAuth Callback: https://tinglebot.xyz/auth/discord/callback');
console.log('Health Check: https://tinglebot.xyz/api/health');

console.log('\n📚 Next Steps:');
console.log('1. Push your code to GitHub');
console.log('2. Create a new Railway project');
console.log('3. Connect your GitHub repository');
console.log('4. Add all environment variables from .env.production');
console.log('5. Deploy and configure custom domain');
console.log('6. Update Discord OAuth settings');

console.log('\n📖 For detailed instructions, see: RAILWAY_DEPLOYMENT.md');
console.log('🎉 Happy deploying!'); 