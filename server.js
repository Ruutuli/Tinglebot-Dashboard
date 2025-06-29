/* ============================================================================
// server.js
// Purpose: Express server for Tinglebot dashboard – handles API routes,
//          database operations, caching, and server management using db.js methods.
// ============================================================================ */

// ------------------- Section: Imports & Configuration -------------------
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { MongoClient } = require('mongodb');

// Import database methods from db.js
const {
  connectToTinglebot,
  connectToInventories,
  connectToVending,
  fetchAllCharacters,
  fetchCharacterById,
  fetchAllItems,
  fetchItemByName,
  fetchAllMonsters,
  fetchMonsterByName,
  getCharacterInventoryCollection,
  getTokenBalance,
  getUserById,
  getOrCreateUser
} = require('./database/db');

// Import models
const Character = require('./models/CharacterModel');
const Quest = require('./models/QuestModel');
const Item = require('./models/ItemModel');
const Monster = require('./models/MonsterModel');
const User = require('./models/UserModel');
const Pet = require('./models/PetModel');
const Mount = require('./models/MountModel');
const VillageShops = require('./models/VillageShopsModel');
const Weather = require('./models/WeatherModel');
const { VendingRequest } = require('./models/VendingModel');
const { Village } = require('./models/VillageModel');
const Party = require('./models/PartyModel');
const Relic = require('./models/RelicModel');

// ------------------- Section: App Configuration -------------------
const app = express();
const PORT = process.env.PORT || 5001;

// ------------------- Section: Session & Authentication Configuration -------------------
// Session configuration for Discord OAuth
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'true';
const domain = process.env.DOMAIN || (isProduction ? 'tinglebot.xyz' : 'localhost');

// Trust proxy for production environments (Railway, etc.)
if (isProduction) {
  app.set('trust proxy', 1);
  console.log('[server.js]: 🔧 Trust proxy enabled for production');
}

console.log('[server.js]: 🔧 Environment Configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
  isProduction,
  domain,
  DISCORD_CALLBACK_URL: process.env.DISCORD_CALLBACK_URL
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/tinglebot',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours in seconds
    autoRemove: 'native'
  }),
  cookie: {
    secure: isProduction, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  name: 'tinglebot.sid'
}));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// ------------------- Section: Passport Configuration -------------------
// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.discordId);
});

// Deserialize user from session
passport.deserializeUser(async (discordId, done) => {
  try {
    const user = await User.findOne({ discordId });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Discord OAuth Strategy
const callbackURL = isProduction 
  ? `https://${domain}/auth/discord/callback`
  : (process.env.DISCORD_CALLBACK_URL || `http://${domain}:5001/auth/discord/callback`);

console.log('[server.js]: 🔗 Discord OAuth Callback URL:', callbackURL);

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: callbackURL,
  scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user in database
    let user = await User.findOne({ discordId: profile.id });
    
    if (!user) {
      // Create new user
      user = new User({
        discordId: profile.id,
        username: profile.username,
        email: profile.email,
        avatar: profile.avatar,
        discriminator: profile.discriminator,
        tokens: 0,
        tokenTracker: '',
        blightedcharacter: false,
        characterSlot: 2,
        status: 'active',
        statusChangedAt: new Date()
      });
      await user.save();
      console.log(`[server.js]: ✅ New Discord user created: ${profile.username}#${profile.discriminator}`);
    } else {
      // Update existing user's Discord info
      user.username = profile.username;
      user.email = profile.email;
      user.avatar = profile.avatar;
      user.discriminator = profile.discriminator;
      user.status = 'active';
      user.statusChangedAt = new Date();
      await user.save();
      console.log(`[server.js]: ✅ Discord user updated: ${profile.username}#${profile.discriminator}`);
    }
    
    return done(null, user);
  } catch (error) {
    console.error('[server.js]: ❌ Discord OAuth error:', error);
    return done(error, null);
  }
}));

// Database connection options
const connectionOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 5,
  retryWrites: true,
  retryReads: true,
  w: 'majority',
  wtimeoutMS: 2500,
  heartbeatFrequencyMS: 10000,
  maxIdleTimeMS: 60000,
  family: 4
};

// Connection variables
let inventoriesConnection = null;
let vendingConnection = null;

// ------------------- Section: Caching Configuration -------------------
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const inventoryCache = new Map();
const characterListCache = { 
  data: null, 
  timestamp: 0, 
  CACHE_DURATION: 10 * 60 * 1000 
};

// ------------------- Function: initializeCacheCleanup -------------------
// Sets up periodic cache cleanup to prevent memory leaks
const initializeCacheCleanup = () => {
  setInterval(() => {
    const now = Date.now();
    for (const [key, { timestamp }] of inventoryCache.entries()) {
      if (now - timestamp > CACHE_DURATION) {
        inventoryCache.delete(key);
      }
    }
  }, 5 * 60 * 1000); // Purge every 5 minutes
};

// ------------------- Section: Database Initialization -------------------

// ------------------- Function: initializeDatabases -------------------
// Establishes connections to all required databases using db.js methods
async function initializeDatabases() {
  try {
    console.log('[server.js]: 🔄 Connecting to databases...');
    
    // Connect to Tinglebot database using db.js method
    await connectToTinglebot();
    console.log('[server.js]: ✅ Tinglebot DB connected');
    
    // Connect to Inventories database using db.js method
    inventoriesConnection = await connectToInventories();
    console.log('[server.js]: ✅ Inventories DB connected');
    
    // Connect to Vending database using db.js method
    vendingConnection = await connectToVending();
    console.log('[server.js]: ✅ Vending DB connected');
    
    console.log('[server.js]: 🎯 All databases connected successfully');
  } catch (error) {
    console.error('[server.js]: ❌ Database connection error:', error);
    throw error;
  }
}

// ------------------- Section: Express Middleware -------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// ------------------- Section: Authentication Middleware -------------------

// ------------------- Function: requireAuth -------------------
// Middleware to require authentication for protected routes
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// ------------------- Function: optionalAuth -------------------
// Middleware that adds user info to request if authenticated
function optionalAuth(req, res, next) {
  // Always continue, but req.user will be available if authenticated
  next();
}

// ------------------- Section: Page Routes -------------------

// ------------------- Function: serveIndexPage -------------------
// Serves the main dashboard page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ------------------- Function: serveLoginPage -------------------
// Serves the login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ------------------- Function: serveDashboardPage -------------------
// Serves the main dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ------------------- Section: Discord OAuth Routes -------------------

// ------------------- Function: initiateDiscordAuth -------------------
// Initiates Discord OAuth flow
app.get('/auth/discord', passport.authenticate('discord'));

// ------------------- Function: handleDiscordCallback -------------------
// Handles Discord OAuth callback
app.get('/auth/discord/callback', 
  passport.authenticate('discord', { 
    failureRedirect: '/login',
    failureFlash: true 
  }), 
  (req, res) => {
    // Successful authentication
    console.log(`[server.js]: ✅ Discord login successful for user: ${req.user.username}`);
    console.log('[server.js]: 🔍 Session after login:', {
      sessionId: req.session.id,
      passport: req.session.passport,
      user: req.user ? {
        username: req.user.username,
        discordId: req.user.discordId,
        id: req.user._id
      } : null
    });
    res.redirect('/?login=success');
  }
);

// ------------------- Function: logout -------------------
// Handles user logout
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('[server.js]: ❌ Logout error:', err);
      return res.redirect('/login');
    }
    console.log('[server.js]: ✅ User logged out successfully');
    res.redirect('/login');
  });
});

// ------------------- Function: checkAuthStatus -------------------
// Returns current authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        discordId: req.user.discordId,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
        discriminator: req.user.discriminator,
        tokens: req.user.tokens,
        characterSlot: req.user.characterSlot
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ------------------- Function: debugSession -------------------
// Debug endpoint for session troubleshooting
app.get('/api/debug/session', (req, res) => {
  res.json({
    session: req.session ? {
      id: req.session.id,
      passport: req.session.passport,
      cookie: req.session.cookie
    } : null,
    isAuthenticated: req.isAuthenticated(),
    user: req.user ? {
      username: req.user.username,
      discordId: req.user.discordId,
      id: req.user._id
    } : null,
    headers: {
      cookie: req.headers.cookie ? 'present' : 'missing',
      'user-agent': req.headers['user-agent']
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      DOMAIN: process.env.DOMAIN
    }
  });
});

// ------------------- Section: API Routes -------------------

// ------------------- Function: healthCheck -------------------
// Provides system health status and connection information
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      connections: {
        tinglebot: mongoose.connection.readyState === 1,
        inventories: inventoriesConnection ? inventoriesConnection.readyState === 1 : false,
        vending: vendingConnection ? vendingConnection.readyState === 1 : false
      },
      models: {
        character: !!Character,
        item: !!Item,
        user: !!User,
        pet: !!Pet,
        weather: !!Weather,
        vending: !!VendingRequest
      }
    };
    
    console.log('[server.js]: 🏥 Health check:', health);
    res.json(health);
  } catch (error) {
    console.error('[server.js]: ❌ Health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ------------------- Function: getUserInfo -------------------
// Returns basic user information for dashboard
app.get('/api/user', optionalAuth, (req, res) => {
  console.log('[server.js]: 🔍 /api/user called - Auth check:', {
    isAuthenticated: req.isAuthenticated(),
    user: req.user ? {
      username: req.user.username,
      discordId: req.user.discordId,
      id: req.user._id
    } : null,
    session: req.session ? {
      id: req.session.id,
      passport: req.session.passport,
      cookie: req.session.cookie
    } : null,
    headers: {
      cookie: req.headers.cookie ? 'present' : 'missing',
      'user-agent': req.headers['user-agent']
    }
  });
  
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      username: req.user.username,
      discordId: req.user.discordId,
      email: req.user.email,
      avatar: req.user.avatar,
      discriminator: req.user.discriminator,
      tokens: req.user.tokens,
      characterSlot: req.user.characterSlot,
      status: req.user.status,
      createdAt: req.user.createdAt,
      avatarUrl: req.user.avatar ? `https://cdn.discordapp.com/avatars/${req.user.discordId}/${req.user.avatar}.png` : null
    });
  } else {
    res.json({ 
      authenticated: false,
      username: 'Guest',
      message: 'Login with Discord for enhanced features'
    });
  }
});

// ------------------- Function: getActivities -------------------
// Returns mock activity data for dashboard
app.get('/api/activities', (_, res) => {
  res.json([
    { type: 'command', text: 'User used /help command', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
    { type: 'join', text: 'New server joined: Gaming Community', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
    { type: 'error', text: 'Command failed: /play (Invalid URL)', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString() }
  ]);
});

// ------------------- Function: getCommands -------------------
// Returns comprehensive command data with usage statistics
app.get('/api/commands', (_, res) => {
  try {
    console.log('[server.js]: 📋 Getting commands data...');
    
    const commands = [
      // Character Commands
      { name: 'character', description: 'Manage your characters', usage: '/character <subcommand>', category: 'character' },
      { name: 'character create', description: 'Create a new character', usage: '/character create <village>', category: 'character' },
      { name: 'character create inariko', description: 'Create a character with an Inariko exclusive job', usage: '/character create inariko <name> <age> <height> <hearts> <stamina> <pronouns> <race> <job> <inventory> <applink> <icon>', category: 'character' },
      { name: 'character create rudania', description: 'Create a character with a Rudania exclusive job', usage: '/character create rudania <name> <age> <height> <hearts> <stamina> <pronouns> <race> <job> <inventory> <applink> <icon>', category: 'character' },
      { name: 'character create vhintl', description: 'Create a character with a Vhintl exclusive job', usage: '/character create vhintl <name> <age> <height> <hearts> <stamina> <pronouns> <race> <job> <inventory> <applink> <icon>', category: 'character' },
      { name: 'character create general', description: 'Create a character with a general job', usage: '/character create general <name> <age> <height> <hearts> <stamina> <pronouns> <race> <village> <job> <inventory> <applink> <icon>', category: 'character' },
      { name: 'character edit', description: 'Edit an existing character', usage: '/character edit <charactername> <category> <updatedinfo> [newicon]', category: 'character' },
      { name: 'character view', description: 'View details of a character', usage: '/character view <charactername>', category: 'character' },
      { name: 'character viewlist', description: 'View a list of characters', usage: '/character viewlist [user]', category: 'character' },
      { name: 'character delete', description: 'Delete a character', usage: '/character delete <charactername>', category: 'character' },
      { name: 'character changejob', description: 'Change the job of your character', usage: '/character changejob <charactername> <newjob>', category: 'character' },
      { name: 'character setbirthday', description: 'Set the birthday of a character', usage: '/character setbirthday <charactername> <birthday>', category: 'character' },
      
      // Economy Commands
      { name: 'economy', description: 'Economy commands for gifts, shops, trades, and transfers', usage: '/economy <subcommand>', category: 'economy' },
      { name: 'economy gift', description: 'Gift items from your character to another character', usage: '/economy gift <fromcharacter> <tocharacter> <itema> <quantitya> [itemb] [quantityb] [itemc] [quantityc]', category: 'economy' },
      { name: 'economy shop-view', description: 'View items available in the shop', usage: '/economy shop-view', category: 'economy' },
      { name: 'economy shop-buy', description: 'Buy an item from the shop', usage: '/economy shop-buy <charactername> <itemname> <quantity>', category: 'economy' },
      { name: 'economy shop-sell', description: 'Sell an item to the shop', usage: '/economy shop-sell <charactername> <itemname> <quantity>', category: 'economy' },
      { name: 'economy trade', description: 'Trade items between two characters', usage: '/economy trade <fromcharacter> <tocharacter> <item1> <quantity1> [item2] [quantity2] [item3] [quantity3] [tradeid]', category: 'economy' },
      { name: 'economy transfer', description: 'Transfer items between your characters', usage: '/economy transfer <fromcharacter> <tocharacter> <itema> <quantitya> [itemb] [quantityb] [itemc] [quantityc]', category: 'economy' },
      
      // Inventory Commands
      { name: 'inventory', description: 'Manage your character\'s inventory', usage: '/inventory <subcommand>', category: 'inventory' },
      { name: 'inventory view', description: 'View your character\'s inventory', usage: '/inventory view <charactername>', category: 'inventory' },
      { name: 'inventory sync', description: 'Sync your character\'s inventory from Google Sheets', usage: '/inventory sync <charactername>', category: 'inventory' },
      { name: 'inventory test', description: 'Test if the inventory setup is correct', usage: '/inventory test <charactername>', category: 'inventory' },
      { name: 'gear', description: 'Displays, equips, or unequips gear of a character', usage: '/gear <charactername> <type> [itemname] [status]', category: 'inventory' },
      { name: 'item', description: 'Use an item for various purposes', usage: '/item <charactername> <itemname> [quantity] [jobname]', category: 'inventory' },
      { name: 'spiritorbs', description: 'Check or exchange Spirit Orbs for health or stamina upgrades', usage: '/spiritorbs <subcommand>', category: 'inventory' },
      { name: 'spiritorbs check', description: 'Check how many Spirit Orbs your character has', usage: '/spiritorbs check <character>', category: 'inventory' },
      { name: 'spiritorbs exchange', description: 'Exchange 4 Spirit Orbs for +1 heart or stamina', usage: '/spiritorbs exchange <character> <type>', category: 'inventory' },
      
      // Exploration Commands
      { name: 'explore', description: 'Manage exploration parties and expeditions', usage: '/explore <subcommand>', category: 'exploration' },
      { name: 'explore setup', description: 'Setup a new exploration party', usage: '/explore setup <region>', category: 'exploration' },
      { name: 'explore join', description: 'Join an expedition party', usage: '/explore join <id> <charactername> <item1> <item2> <item3>', category: 'exploration' },
      { name: 'explore start', description: 'Start the expedition', usage: '/explore start <id>', category: 'exploration' },
      { name: 'explore roll', description: 'Roll for a random encounter', usage: '/explore roll <id> <charactername>', category: 'exploration' },
      { name: 'viewmap', description: 'View the status of a specific quadrant or full square', usage: '/viewmap <square> [quadrant]', category: 'exploration' },
      
      // Companions Commands
      { name: 'pet', description: 'Manage your pets and their abilities', usage: '/pet <subcommand>', category: 'companions' },
      { name: 'pet roll', description: 'Roll for items with your pet', usage: '/pet roll <charactername> <petname> [rolltype]', category: 'companions' },
      { name: 'pet upgrade', description: 'Upgrade your pet\'s level', usage: '/pet upgrade <charactername> <petname> <level>', category: 'companions' },
      { name: 'pet add', description: 'Add a new pet', usage: '/pet add <charactername> <petname> <category> <species> <pettype> [image]', category: 'companions' },
      { name: 'pet edit', description: 'Edit your pet\'s image', usage: '/pet edit <charactername> <petname> <image>', category: 'companions' },
      { name: 'pet view', description: 'View details for one of your pets', usage: '/pet view <charactername> <petname>', category: 'companions' },
      { name: 'mount', description: 'Manage or view mount details', usage: '/mount <subcommand>', category: 'companions' },
      { name: 'mount encounter', description: 'Join or interact with an existing mount encounter', usage: '/mount encounter <encounterid> <charactername>', category: 'companions' },
      { name: 'mount view', description: 'View your mount\'s details', usage: '/mount view <charactername>', category: 'companions' },
      
      // Jobs Commands
      { name: 'gather', description: 'Gather resources', usage: '/gather <charactername>', category: 'jobs' },
      { name: 'loot', description: 'Search for loot', usage: '/loot <charactername>', category: 'jobs' },
      { name: 'crafting', description: 'Craft items', usage: '/crafting <charactername> <itemname> <quantity> [flavortext]', category: 'jobs' },
      { name: 'heal', description: 'Heal yourself or others', usage: '/heal <subcommand>', category: 'jobs' },
      { name: 'heal request', description: 'Request healing from a healer', usage: '/heal request <charactername> <hearts> <payment>', category: 'jobs' },
      { name: 'heal fulfill', description: 'Fulfill a healing request (healers only)', usage: '/heal fulfill <requestid> <healername>', category: 'jobs' },
      
      // Utility Commands
      { name: 'lookup', description: 'Look up item information', usage: '/lookup <item> [ingredient]', category: 'utility' },
      { name: 'tokens', description: 'Manage your tokens', usage: '/tokens <subcommand>', category: 'utility' },
      { name: 'tokens check', description: 'Check your current token balance', usage: '/tokens check', category: 'utility' },
      { name: 'tokens setup', description: 'Set up your token tracker', usage: '/tokens setup <link>', category: 'utility' },
      { name: 'roll', description: 'Roll dice for various purposes', usage: '/roll <dice> <sides> [flavor] [advantage]', category: 'utility' },
      { name: 'cancelvoucher', description: 'Cancel a job voucher', usage: '/cancelvoucher <charactername>', category: 'utility' },
      
      // World Commands
      { name: 'travel', description: 'Travel between villages', usage: '/travel <charactername> <destination> <mode>', category: 'world' },
      { name: 'quest', description: 'Quest management system', usage: '/quest <subcommand>', category: 'world' },
      { name: 'blight', description: 'Manage blight progression and healing', usage: '/blight <subcommand>', category: 'world' },
      { name: 'specialweather', description: 'Gather special items during special weather conditions', usage: '/specialweather <charactername>', category: 'world' }
    ];
    
    console.log(`[server.js]: ✅ Returning ${commands.length} commands`);
    res.json(commands);
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching commands:', error);
    res.status(500).json({ error: 'Failed to fetch commands' });
  }
});

// ------------------- Section: Statistics API Routes -------------------

// ------------------- Function: getRootsOfTheWildStats -------------------
// Returns statistics for Roots of the Wild game data
app.get('/api/rootsofthewild/stats', async (req, res) => {
  try {
    const [totalCharacters, activeQuests, totalItems, activeMonsters] = await Promise.all([
      Character.countDocuments(),
      Quest.countDocuments({ status: 'active' }),
      Item.countDocuments(),
      Monster.countDocuments({ isActive: true })
    ]);
    res.json({ totalCharacters, activeQuests, totalItems, activeMonsters });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching RootsOfTheWild stats:', error);
    res.status(500).json({ error: 'Failed to fetch RootsOfTheWild stats' });
  }
});

// ------------------- Function: getTinglebotStats -------------------
// Returns statistics for Tinglebot system data
app.get('/api/tinglebot/stats', async (req, res) => {
  try {
    const [totalUsers, activePets, totalMounts, villageShops] = await Promise.all([
      User.countDocuments(),
      Pet.countDocuments({ isActive: true }),
      Mount.countDocuments(),
      VillageShops.countDocuments()
    ]);
    res.json({ totalUsers, activePets, totalMounts, villageShops });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching Tinglebot stats:', error);
    res.status(500).json({ error: 'Failed to fetch Tinglebot statistics' });
  }
});

// ------------------- Function: getCharacterStats -------------------
// Returns comprehensive character statistics and analytics
app.get('/api/stats/characters', async (req, res) => {
  try {
    const totalCharacters = await Character.countDocuments();

    // Get characters per village
    const perVillageAgg = await Character.aggregate([
      { $match: { homeVillage: { $exists: true, $ne: null } } },
      { $group: { _id: { $toLower: { $ifNull: ["$homeVillage", "unknown"] } }, count: { $sum: 1 } } }
    ]);
    const charactersPerVillage = { rudania: 0, inariko: 0, vhintl: 0 };
    perVillageAgg.forEach(r => {
      if (charactersPerVillage[r._id] !== undefined) charactersPerVillage[r._id] = r.count;
    });

    // Get characters per race
    const perRaceAgg = await Character.aggregate([{ $group: { _id: "$race", count: { $sum: 1 } } }]);
    const charactersPerRace = {};
    perRaceAgg.forEach(r => charactersPerRace[r._id || 'Unknown'] = r.count);

    // Get characters per job
    const perJobAgg = await Character.aggregate([
      { $project: { job: { $toLower: { $ifNull: ["$job", "unknown"] } } } },
      { $group: { _id: { $concat: [{ $toUpper: { $substr: ["$job", 0, 1] } }, { $substr: ["$job", 1, { $strLenCP: "$job" }] }] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const charactersPerJob = {};
    perJobAgg.forEach(r => charactersPerJob[r._id] = r.count);

    // Get upcoming birthdays
    const today = new Date();
    const thisYr = today.getFullYear();
    const allBday = await Character.find({ birthday: { $exists: true, $ne: '' } }, { name: 1, birthday: 1 }).lean();
    const upcoming = allBday.map(c => {
      const mmdd = c.birthday.slice(-5);
      let next = isNaN(Date.parse(`${thisYr}-${mmdd}`))
        ? null
        : new Date(`${thisYr}-${mmdd}`);
      if (next && next < today) next.setFullYear(thisYr + 1);
      return { name: c.name, birthday: c.birthday, nextBirthday: next };
    })
      .filter(c => c.nextBirthday && (c.nextBirthday - today) <= (30 * 24 * 60 * 60 * 1000))
      .sort((a, b) => a.nextBirthday - b.nextBirthday);

    // Get visiting counts and details
    const villages = ['rudania', 'inariko', 'vhintl'];
    const visitingAgg = await Character.aggregate([
      { $match: { currentVillage: { $in: villages }, homeVillage: { $in: villages, $ne: null }, $expr: { $ne: ['$currentVillage', '$homeVillage'] } } },
      { $group: { _id: '$currentVillage', count: { $sum: 1 } } }
    ]);
    const visitingCounts = { rudania: 0, inariko: 0, vhintl: 0 };
    visitingAgg.forEach(r => visitingCounts[r._id] = r.count);

    // Get detailed visiting characters
    const visitingCharacters = await Character.find(
      { 
        currentVillage: { $in: villages }, 
        homeVillage: { $in: villages, $ne: null }, 
        $expr: { $ne: ['$currentVillage', '$homeVillage'] } 
      },
      { name: 1, currentVillage: 1, homeVillage: 1 }
    ).lean();

    // Group visiting characters by current village
    const visitingDetails = { rudania: [], inariko: [], vhintl: [] };
    visitingCharacters.forEach(char => {
      const currentVillage = char.currentVillage.toLowerCase();
      if (visitingDetails[currentVillage]) {
        visitingDetails[currentVillage].push({
          name: char.name,
          homeVillage: char.homeVillage
        });
      }
    });

    // Get top characters by various stats
    const getTop = async (field) => {
      const top = await Character.find({ [field]: { $gt: 0 } }).sort({ [field]: -1 }).limit(1).lean();
      if (!top.length) return { names: [], value: 0 };
      const val = top[0][field];
      const names = (await Character.find({ [field]: val }, { name: 1 }).limit(5).lean()).map(c => c.name);
      return { names, value: val };
    };

    const [mostStamina, mostHearts, mostOrbs] = await Promise.all([
      getTop('maxStamina'),
      getTop('maxHearts'),
      getTop('spiritOrbs')
    ]);

    // Get special character counts
    const [kodCount, blightedCount, debuffedCount] = await Promise.all([
      Character.countDocuments({ ko: true }),
      Character.countDocuments({ blighted: true }),
      Character.countDocuments({ 'debuff.active': true })
    ]);

    // Get debuffed characters details
    const debuffedCharacters = await Character.find(
      { 'debuff.active': true },
      { name: 1, 'debuff.endDate': 1 }
    ).lean();

    // Get KO'd and blighted characters details
    const kodCharacters = await Character.find(
      { ko: true },
      { name: 1, lastRollDate: 1, ko: 1 }
    ).lean();
    const blightedCharacters = await Character.find(
      { blighted: true },
      { name: 1, blightedAt: 1, blighted: 1 }
    ).lean();

    res.json({
      totalCharacters,
      charactersPerVillage,
      charactersPerRace,
      charactersPerJob,
      upcomingBirthdays: upcoming,
      visitingCounts,
      visitingDetails,
      mostStaminaChar: mostStamina,
      mostHeartsChar: mostHearts,
      mostOrbsChar: mostOrbs,
      kodCount,
      blightedCount,
      debuffedCount,
      debuffedCharacters,
      kodCharacters,
      blightedCharacters
    });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching character stats:', error);
    res.status(500).json({ error: 'Failed to fetch character stats' });
  }
});

// ------------------- Section: Model API Routes -------------------

// ------------------- Function: getModelCounts -------------------
// Returns count of documents for all models
app.get('/api/models/counts', async (req, res) => {
  try {
    console.log('[server.js]: 📊 Getting model counts...');
    
    const modelMap = {
      character: { model: Character, connection: mongoose.connection },
      weather: { model: Weather, connection: mongoose.connection },
      monster: { model: Monster, connection: mongoose.connection },
      pet: { model: Pet, connection: mongoose.connection },
      mount: { model: Mount, connection: mongoose.connection },
      item: { model: Item, connection: mongoose.connection },
      party: { model: Party, connection: mongoose.connection },
      relic: { model: Relic, connection: mongoose.connection },
      quest: { model: Quest, connection: mongoose.connection },
      inventory: { model: null, connection: inventoriesConnection },
      vending: { model: VendingRequest, connection: vendingConnection }
    };
    
    const counts = Object.fromEntries(Object.keys(modelMap).map(k => [k, 0]));
    
    await Promise.all(Object.entries(modelMap).map(async ([key, { model, connection }]) => {
      try {
        if (key === 'inventory') {
          // Handle inventory collections separately
          const Inv = connection.model('Inventory', new mongoose.Schema({
            characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
            itemName: { type: String, required: true },
            itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
            quantity: { type: Number, default: 1 },
            category: { type: String },
            type: { type: String },
            subtype: { type: String },
            job: { type: String },
            perk: { type: String },
            location: { type: String },
            date: { type: Date },
            obtain: { type: String, default: '' },
            synced: { type: String, unique: true }
          }));
          counts[key] = await Inv.countDocuments();
        } else {
          counts[key] = await model.countDocuments();
        }
        console.log(`[server.js]: ✅ ${key} count: ${counts[key]}`);
      } catch (error) {
        console.error(`[server.js]: ❌ Error getting ${key} count:`, error.message);
        // Keep 0 on error
      }
    }));
    
    console.log('[server.js]: 📊 Model counts completed');
    res.json(counts);
  } catch (error) {
    console.error('[server.js]: ❌ Error in /api/models/counts:', error);
    res.status(500).json({ error: 'Failed to get model counts', details: error.message });
  }
});

// ------------------- Function: getInventoryData -------------------
// Returns inventory data with streaming support for large datasets
app.get('/api/models/inventory', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_INVENTORIES_URI_PROD, connectionOptions);
    await client.connect();
    const db = client.db('inventories');

    // Get character collections
    let collections = characterListCache.data;
    if (!collections || Date.now() - characterListCache.timestamp > characterListCache.CACHE_DURATION) {
      collections = (await db.listCollections().toArray())
        .map(c => c.name)
        .filter(n => !n.startsWith('system.') && n !== 'inventories');
      characterListCache.data = collections;
      characterListCache.timestamp = Date.now();
    }

    // Process collections in batches
    const BATCH_SIZE = 5;
    let allItems = [];
    for (let i = 0; i < collections.length; i += BATCH_SIZE) {
      const batch = collections.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async name => {
        const items = await db.collection(name)
          .find()
          .project({ itemName: 1, quantity: 1, type: 1, category: 1 })
          .toArray();
        return items.map(it => ({ ...it, characterName: name }));
      }));
      allItems.push(...results.flat());
    }

    await client.close();

    const paginated = allItems.slice(skip, skip + limit);
    
    console.log(`[server.js]: ✅ Successfully fetched ${paginated.length} inventory records (page ${page}/${Math.ceil(allItems.length / limit)})`);
    
    res.json({
      data: paginated,
      pagination: {
        total: allItems.length,
        page, 
        limit,
        pages: Math.ceil(allItems.length / limit)
      }
    });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching inventory:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory',
      details: error.message
    });
  }
});

// ------------------- Function: getModelData -------------------
// Returns paginated data for any model type with filtering support
app.get('/api/models/:modelType', async (req, res) => {
  try {
    const { modelType } = req.params;
    console.log(`[server.js]: 🔍 Fetching ${modelType} data...`);
    
    const page = parseInt(req.query.page) || 1;
    const limit = 12; // Items per page
    const skip = (page - 1) * limit;
    const allItems = req.query.all === 'true';

    // Check if this is a filtered request for items
    const isFilteredRequest = modelType === 'item' && (
      req.query.search || 
      req.query.category || 
      req.query.type || 
      req.query.subtype || 
      req.query.jobs || 
      req.query.locations ||
      req.query.sources
    );

    let Model, query = {};
    
    // Map model type to corresponding model
    switch (modelType) {
      case 'character':
        Model = Character;
        break;
      case 'item':
        Model = Item;
        break;
      case 'monster':
        Model = Monster;
        query = { isActive: true };
        break;
      case 'pet':
        Model = Pet;
        query = { isActive: true };
        break;
      case 'mount':
        Model = Mount;
        break;
      case 'village':
        Model = Village;
        break;
      case 'party':
        Model = Party;
        break;
      case 'relic':
        Model = Relic;
        break;
      case 'villageShops':
        Model = VillageShops;
        break;
      case 'inventory':
        // Create inventory model dynamically for the inventories connection
        Model = inventoriesConnection ? inventoriesConnection.model('Inventory', new mongoose.Schema({
          characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
          itemName: { type: String, required: true },
          itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
          quantity: { type: Number, default: 1 },
          category: { type: String },
          type: { type: String },
          subtype: { type: String },
          job: { type: String },
          perk: { type: String },
          location: { type: String },
          date: { type: Date },
          obtain: { type: String, default: '' },
          synced: { type: String, unique: true }
        })) : null;
        break;
      default:
        return res.status(400).json({ error: 'Invalid model type' });
    }

    if (!Model) {
      console.error(`[server.js]: ❌ Model not found for type: ${modelType}`);
      return res.status(500).json({ error: `Model not initialized for type: ${modelType}` });
    }

    // For filtered item requests or all=true requests, return all items
    if (isFilteredRequest || allItems) {
      console.log(`[server.js]: 🔍 ${allItems ? 'All items' : 'Filtered'} request detected, returning all items`);
      const allItemsData = await Model.find(query)
        .sort({ itemName: 1 })
        .lean();
      
      console.log(`[server.js]: ✅ Successfully fetched ${allItemsData.length} ${modelType} records (all items)`);
      res.json({
        data: allItemsData,
        pagination: {
          page: 1,
          pages: 1,
          total: allItemsData.length,
          limit: allItemsData.length
        }
      });
      return;
    }

    // Get total count for pagination
    const total = await Model.countDocuments(query);
    const pages = Math.ceil(total / limit);

    // Fetch paginated data
    const data = await Model.find(query)
      .sort(modelType === 'item' ? { itemName: 1 } : {})
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform icon URLs for characters
    if (modelType === 'character') {
      data.forEach(character => {
        if (character.icon && character.icon.startsWith('https://storage.googleapis.com/tinglebot/')) {
          // Extract the filename from the Google Cloud Storage URL
          const filename = character.icon.split('/').pop();
          // Replace with our proxy URL
          character.icon = filename;
        }
      });
    }

    console.log(`[server.js]: ✅ Successfully fetched ${data.length} ${modelType} records (page ${page}/${pages})`);
    res.json({
      data,
      pagination: {
        page,
        pages,
        total,
        limit
      }
    });
  } catch (error) {
    console.error(`[server.js]: ❌ Error fetching ${req.params.modelType} data:`, error);
    res.status(500).json({ error: `Failed to fetch ${req.params.modelType} data`, details: error.message });
  }
});

// ------------------- Section: Character API Routes -------------------

// ------------------- Function: getCharacterCount -------------------
// Returns total number of characters
app.get('/api/character-count', async (_, res) => {
  try {
    const count = await Character.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('[server.js]: ❌ Failed to fetch character count:', error);
    res.status(500).json({ error: 'Failed to fetch character count' });
  }
});

// ------------------- Function: getCharacterIcon -------------------
// Returns character icon URL by character ID
app.get('/api/character/:id/icon', async (req, res) => {
  try {
    const char = await Character.findById(req.params.id);
    if (!char) return res.status(404).json({ error: 'Character not found' });
    res.json({ icon: char.icon });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching character icon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------- Function: getCharacterById -------------------
// Returns character data by character ID
app.get('/api/character/:id', async (req, res) => {
  try {
    const char = await Character.findById(req.params.id);
    if (!char) return res.status(404).json({ error: 'Character not found' });
    res.json({ ...char.toObject(), icon: char.icon });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching character:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------- Function: getUserCharacters -------------------
// Returns all characters belonging to the authenticated user
app.get('/api/user/characters', requireAuth, async (req, res) => {
  try {
    const userId = req.user.discordId;
    console.log(`[server.js]: 🔍 Fetching characters for user: ${userId}`);
    
    const characters = await Character.find({ userId }).lean();
    
    // Transform icon URLs for characters (same as in the main character endpoint)
    characters.forEach(character => {
      if (character.icon && character.icon.startsWith('https://storage.googleapis.com/tinglebot/')) {
        const filename = character.icon.split('/').pop();
        character.icon = filename;
      }
    });
    
    console.log(`[server.js]: ✅ Found ${characters.length} characters for user ${userId}`);
    res.json({ data: characters });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching user characters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------- Function: getGuildMemberInfo -------------------
// Returns Discord guild member information including join date
app.get('/api/user/guild-info', requireAuth, async (req, res) => {
  try {
    const userId = req.user.discordId;
    const guildId = process.env.PROD_GUILD_ID;
    
    if (!guildId) {
      console.error('[server.js]: ❌ PROD_GUILD_ID not configured');
      return res.status(500).json({ error: 'Guild ID not configured' });
    }
    
    console.log(`[server.js]: 🔍 Fetching guild member info for user: ${userId} in guild: ${guildId}`);
    
    // Fetch guild member information from Discord API
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[server.js]: ⚠️ User ${userId} not found in guild ${guildId}`);
        return res.json({ 
          joinedAt: null, 
          message: 'User not found in guild',
          inGuild: false 
        });
      }
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
    
    const memberData = await response.json();
    const joinedAt = memberData.joined_at ? new Date(memberData.joined_at) : null;
    
    console.log(`[server.js]: ✅ Found guild member info for user ${userId}, joined: ${joinedAt}`);
    
    res.json({
      joinedAt: joinedAt ? joinedAt.toISOString() : null,
      inGuild: true,
      roles: memberData.roles || [],
      nick: memberData.nick || null
    });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching guild member info:', error);
    res.status(500).json({ error: 'Failed to fetch guild member information' });
  }
});

// ------------------- Function: getGuildInfo -------------------
// Returns general guild information
app.get('/api/guild/info', async (req, res) => {
  try {
    const guildId = process.env.PROD_GUILD_ID;
    const RESIDENT_ROLE = '788137728943325185';
    const INACTIVE_ROLE = '788148064182730782';
    if (!guildId) {
      console.error('[server.js]: ❌ PROD_GUILD_ID not configured');
      return res.status(500).json({ error: 'Guild ID not configured' });
    }
    console.log(`[server.js]: 🔍 Fetching guild info for guild: ${guildId}`);
    // Fetch guild information
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    if (!guildResponse.ok) {
      throw new Error(`Discord API error: ${guildResponse.status} ${guildResponse.statusText}`);
    }
    const guildData = await guildResponse.json();
    // Get guild icon URL if available
    const iconUrl = guildData.icon 
      ? `https://cdn.discordapp.com/icons/${guildId}/${guildData.icon}.png`
      : null;
    // Fetch all members
    let after = null;
    let allMembers = [];
    let hasMore = true;
    while (hasMore) {
      const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members`);
      url.searchParams.set('limit', '1000');
      if (after) url.searchParams.set('after', after);
      const membersResponse = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      if (!membersResponse.ok) {
        throw new Error(`Discord API error: ${membersResponse.status} ${membersResponse.statusText}`);
      }
      const members = await membersResponse.json();
      allMembers = allMembers.concat(members);
      if (members.length < 1000) {
        hasMore = false;
      } else {
        after = members[members.length - 1].user.id;
      }
    }
    // Count residents and inactive
    let residentCount = 0;
    let inactiveCount = 0;
    
    for (const member of allMembers) {
      const roles = member.roles || [];
      if (roles.includes(RESIDENT_ROLE)) {
        residentCount++;
      }
      if (roles.includes(INACTIVE_ROLE)) {
        inactiveCount++;
      }
    }
    
    res.json({
      id: guildData.id,
      name: guildData.name,
      description: guildData.description || 'A community server for Tinglebot users to play together, share experiences, and enjoy the RPG system.',
      icon: iconUrl,
      memberCount: residentCount,
      inactiveCount,
      features: guildData.features || []
    });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching guild info:', error);
    res.status(500).json({ error: 'Failed to fetch guild information' });
  }
});

// ------------------- Function: joinGuild -------------------
// Generates an invite link for the guild
app.post('/api/guild/join', async (req, res) => {
  try {
    const guildId = process.env.PROD_GUILD_ID;
    
    if (!guildId) {
      console.error('[server.js]: ❌ PROD_GUILD_ID not configured');
      return res.status(500).json({ error: 'Guild ID not configured' });
    }
    
    console.log(`[server.js]: 🔗 Generating invite link for guild: ${guildId}`);
    
    // Create an invite link for the guild
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/invites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        max_age: 0, // Never expires
        max_uses: 0, // Unlimited uses
        temporary: false,
        unique: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
    
    const inviteData = await response.json();
    const inviteUrl = `https://discord.gg/${inviteData.code}`;
    
    console.log(`[server.js]: ✅ Generated invite link for guild ${guildId}: ${inviteUrl}`);
    
    res.json({
      success: true,
      inviteUrl: inviteUrl,
      code: inviteData.code,
      expiresAt: inviteData.expires_at
    });
  } catch (error) {
    console.error('[server.js]: ❌ Error generating guild invite:', error);
    res.status(500).json({ error: 'Failed to generate guild invite link' });
  }
});

// ------------------- Section: Image Proxy Routes -------------------

// ------------------- Function: proxyImage -------------------
// Proxies images from Google Cloud Storage with caching headers
app.get('/api/images/:filename', async (req, res) => {
  try {
    const url = `https://storage.googleapis.com/tinglebot/${req.params.filename}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Image not found');
    
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Content-Type', response.headers.get('content-type'));
    res.set('Cache-Control', 'public, max-age=31536000');
    
    response.body.pipe(res);
  } catch (error) {
    console.error('[server.js]: ❌ Error proxying image:', error);
    res.status(404).send('Image not found');
  }
});

// ------------------- Section: Inventory API Routes -------------------

// ------------------- Function: getInventoryData -------------------
// Returns all inventory data across all characters
app.get('/api/inventory', async (req, res) => {
  try {
    const characters = await fetchAllCharacters();
    const inventoryData = [];

    for (const char of characters) {
      try {
        const col = await getCharacterInventoryCollection(char.name);
        const inv = await col.find().toArray();
        inventoryData.push(...inv.map(item => ({ ...item, characterName: char.name })));
      } catch (error) {
        console.warn(`[server.js]: ⚠️ Error fetching inventory for character ${char.name}:`, error.message);
        continue;
      }
    }
    
    console.log(`[server.js]: ✅ Successfully fetched ${inventoryData.length} inventory items`);
    res.json(inventoryData);
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching inventory data:', error);
    res.status(500).json({ error: 'Failed to fetch inventory data', details: error.message });
  }
});

// ------------------- Function: getCharacterInventory -------------------
// Returns inventory data for specific characters
app.get('/api/inventory/characters', async (req, res) => {
  try {
    const { characters } = req.query;
    
    if (!characters) {
      return res.status(400).json({ error: 'Characters parameter is required' });
    }
    
    const characterNames = characters.split(',').map(name => name.trim());
    console.log(`[server.js]: 🔍 Fetching inventory for characters:`, characterNames);
    
    const inventoryData = [];
    
    for (const characterName of characterNames) {
      try {
        const col = await getCharacterInventoryCollection(characterName);
        const inv = await col.find().toArray();
        inventoryData.push(...inv.map(item => ({ ...item, characterName })));
      } catch (error) {
        console.warn(`[server.js]: ⚠️ Error fetching inventory for character ${characterName}:`, error.message);
        continue;
      }
    }
    
    console.log(`[server.js]: ✅ Successfully fetched ${inventoryData.length} inventory items for ${characterNames.length} characters`);
    res.json({ data: inventoryData });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching character inventory data:', error);
    res.status(500).json({ error: 'Failed to fetch character inventory data', details: error.message });
  }
});

// ------------------- Function: getInventorySummary -------------------
// Returns inventory summary (counts) for all characters
app.get('/api/inventory/summary', async (req, res) => {
  try {
    const characters = await fetchAllCharacters();
    const summary = [];

    for (const char of characters) {
      try {
        const col = await getCharacterInventoryCollection(char.name);
        const items = await col.find().toArray();
        
        const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const uniqueItems = items.length;
        
        summary.push({
          characterName: char.name,
          totalItems,
          uniqueItems,
          categories: [...new Set(items.map(item => item.category).filter(Boolean))],
          types: [...new Set(items.map(item => item.type).filter(Boolean))]
        });
      } catch (error) {
        console.warn(`[server.js]: ⚠️ Error fetching inventory summary for character ${char.name}:`, error.message);
        // Add character with zero items
        summary.push({
          characterName: char.name,
          totalItems: 0,
          uniqueItems: 0,
          categories: [],
          types: []
        });
      }
    }
    
    console.log(`[server.js]: ✅ Successfully fetched inventory summary for ${summary.length} characters`);
    res.json({ data: summary });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching inventory summary:', error);
    res.status(500).json({ error: 'Failed to fetch inventory summary', details: error.message });
  }
});

// ------------------- Function: getItemsData -------------------
// Returns all items data
app.get('/api/items', async (req, res) => {
  try {
    const items = await fetchAllItems();
    console.log(`[server.js]: ✅ Successfully fetched ${items.length} items`);
    res.json(items);
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching items data:', error);
    res.status(500).json({ error: 'Failed to fetch items data', details: error.message });
  }
});

// ------------------- Function: searchInventoryByItem -------------------
// Searches inventory for specific item across all characters
app.post('/api/inventory/item', async (req, res) => {
  console.log('[server.js]: 📥 INVENTORY POST REQUEST RECEIVED');
  const { itemName } = req.body;
  try {
    const characters = await fetchAllCharacters();
    const inventoryData = [];

    for (const char of characters) {
      try {
        const col = await getCharacterInventoryCollection(char.name);
        const inv = await col.find().toArray();
        const entry = inv.find(i => i.itemName.toLowerCase() === itemName.toLowerCase());
        if (entry) {
          inventoryData.push({ characterName: char.name, quantity: entry.quantity });
        }
      } catch {
        continue;
      }
    }
    res.json(inventoryData);
  } catch (error) {
    console.error('[server.js]: ❌ ERROR OCCURRED:', error);
    res.status(500).json({ error: 'Failed to fetch inventory data' });
  }
});

// ------------------- Section: Weather API Routes -------------------

// ------------------- Function: getWeatherDayBounds -------------------
// Calculates the start and end of the current weather day (8am to 8am)
function getWeatherDayBounds() {
  const now = new Date();
  const currentHour = now.getHours();
  
  let weatherDayStart, weatherDayEnd;
  
  if (currentHour >= 8) {
    // If it's 8am or later, the weather day started at 8am today
    weatherDayStart = new Date(now);
    weatherDayStart.setHours(8, 0, 0, 0);
    
    weatherDayEnd = new Date(now);
    weatherDayEnd.setDate(weatherDayEnd.getDate() + 1);
    weatherDayEnd.setHours(8, 0, 0, 0);
  } else {
    // If it's before 8am, the weather day started at 8am yesterday
    weatherDayStart = new Date(now);
    weatherDayStart.setDate(weatherDayStart.getDate() - 1);
    weatherDayStart.setHours(8, 0, 0, 0);
    
    weatherDayEnd = new Date(now);
    weatherDayEnd.setHours(8, 0, 0, 0);
  }
  
  return { weatherDayStart, weatherDayEnd };
}

// ------------------- Function: getTodayWeather -------------------
// Returns today's weather for all villages (using 8am-8am weather day)
app.get('/api/weather/today', async (req, res) => {
  try {
    console.log('[server.js]: 🌤️ Fetching today\'s weather for all villages...');
    
    const { weatherDayStart, weatherDayEnd } = getWeatherDayBounds();
    
    console.log(`[server.js]: 📅 Weather day: ${weatherDayStart.toISOString()} to ${weatherDayEnd.toISOString()}`);
    
    // Get weather for all villages for the current weather day
    const weatherData = await Weather.find({
      date: {
        $gte: weatherDayStart,
        $lt: weatherDayEnd
      }
    }).lean();
    
    // Organize by village
    const weatherByVillage = {};
    const villages = ['Rudania', 'Inariko', 'Vhintl'];
    
    villages.forEach(village => {
      const villageWeather = weatherData.find(w => w.village === village);
      weatherByVillage[village] = villageWeather || null;
    });
    
    console.log(`[server.js]: ✅ Successfully fetched weather for ${weatherData.length} villages`);
    res.json({
      date: weatherDayStart.toISOString(),
      weatherDayStart: weatherDayStart.toISOString(),
      weatherDayEnd: weatherDayEnd.toISOString(),
      villages: weatherByVillage
    });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching today\'s weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather data', details: error.message });
  }
});

// ------------------- Function: getWeatherHistory -------------------
// Returns recent weather history for a specific village
app.get('/api/weather/history/:village', async (req, res) => {
  try {
    const { village } = req.params;
    const days = parseInt(req.query.days) || 7;
    
    console.log(`[server.js]: 🌤️ Fetching ${days} days of weather history for ${village}...`);
    
    const history = await Weather.getRecentWeather(village, days);
    
    console.log(`[server.js]: ✅ Successfully fetched ${history.length} days of weather history for ${village}`);
    res.json({
      village,
      history,
      days
    });
  } catch (error) {
    console.error(`[server.js]: ❌ Error fetching weather history for ${req.params.village}:`, error);
    res.status(500).json({ error: 'Failed to fetch weather history', details: error.message });
  }
});

// ------------------- Section: Utility Functions -------------------

// ------------------- Function: formatUptime -------------------
// Converts milliseconds into 'Xd Xh Xm' string format
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ${minutes % 60}m`;
}

// ------------------- Section: Error Handling Middleware -------------------
app.use((err, req, res, next) => {
  console.error('[server.js]: ❌ Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Handle 404s - only for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // For non-API routes, serve index.html (SPA fallback)
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ------------------- Section: Server Startup -------------------

// ------------------- Function: startServer -------------------
// Initializes the server and starts listening on the specified port
const startServer = async () => {
  try {
    // Initialize cache cleanup
    initializeCacheCleanup();
    
    // Initialize databases
    await initializeDatabases();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`[server.js]: 🚀 Dashboard server running on port ${PORT}`);
      console.log(`[server.js]: 📝 Visit http://localhost:${PORT} to view the dashboard`);
    });
  } catch (error) {
    console.error('[server.js]: ❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ------------------- Section: Graceful Shutdown -------------------

// ------------------- Function: gracefulShutdown -------------------
// Handles graceful shutdown of the server and database connections
const gracefulShutdown = async () => {
  console.log('[server.js]: 🔄 Shutting down gracefully...');
  
  // Close all database connections
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('[server.js]: ✅ Tinglebot connection closed');
  }
  
  if (inventoriesConnection) {
    await inventoriesConnection.close();
    console.log('[server.js]: ✅ Inventories connection closed');
  }
  
  if (vendingConnection) {
    await vendingConnection.close();
    console.log('[server.js]: ✅ Vending connection closed');
  }
  
  console.log('[server.js]: 🏁 Server shutdown complete');
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start the server
startServer();
