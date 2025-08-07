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
const CharacterOfWeek = require('./models/CharacterOfWeekModel');

// Import calendar module
const calendarModule = require('./calendarModule');

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

}



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
    } else {
      // Update existing user's Discord info
      user.username = profile.username;
      user.email = profile.email;
      user.avatar = profile.avatar;
      user.discriminator = profile.discriminator;
      user.status = 'active';
      user.statusChangedAt = new Date();
      await user.save();
    }
    
    return done(null, user);
  } catch (error) {
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

// Add character data caching
const characterDataCache = {
  data: null,
  timestamp: 0,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes for character data
};

// Add spirit orb cache
const spiritOrbCache = new Map();
const SPIRIT_ORB_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// ------------------- Function: initializeCacheCleanup -------------------
// Sets up periodic cache cleanup to prevent memory leaks
const initializeCacheCleanup = () => {
  // Clean up cache every hour
  setInterval(() => {
    const now = Date.now();
    
    // Clean up inventoryCache (Map)
    for (const [key, value] of inventoryCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        inventoryCache.delete(key);
      }
    }
    
    // Clean up characterListCache (object)
    if (characterListCache.data && now - characterListCache.timestamp > characterListCache.CACHE_DURATION) {
      characterListCache.data = null;
      characterListCache.timestamp = 0;
    }
    
    // Clean up characterDataCache (object)
    if (characterDataCache.data && now - characterDataCache.timestamp > characterDataCache.CACHE_DURATION) {
      characterDataCache.data = null;
      characterDataCache.timestamp = 0;
    }
    
    // Clean up spiritOrbCache (Map)
    for (const [key, value] of spiritOrbCache.entries()) {
      if (now - value.timestamp > SPIRIT_ORB_CACHE_DURATION) {
        spiritOrbCache.delete(key);
      }
    }
  }, 60 * 60 * 1000); // Every hour
};

// ------------------- Section: Database Initialization -------------------

// ------------------- Function: initializeDatabases -------------------
// Establishes connections to all required databases using db.js methods
async function initializeDatabases() {
  try {
    
    // Connect to Tinglebot database using db.js method
    await connectToTinglebot();
    console.log('[server.js]: ✅ Connected to Tinglebot database');
    
    // Connect to Inventories database using db.js method
    try {
      inventoriesConnection = await connectToInventories();
      console.log('[server.js]: ✅ Connected to Inventories database');
    } catch (inventoryError) {
      console.error('[server.js]: ❌ Failed to connect to Inventories database:', inventoryError.message);
      // Continue without inventories connection - spirit orb counting will fail gracefully
    }
    
    // Connect to Vending database using db.js method
    try {
      vendingConnection = await connectToVending();
      console.log('[server.js]: ✅ Connected to Vending database');
    } catch (vendingError) {
      console.error('[server.js]: ❌ Failed to connect to Vending database:', vendingError.message);
      // Continue without vending connection
    }
    
  } catch (error) {   
    console.error('[server.js]: ❌ Database initialization error:', error);
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
app.get('/auth/discord', (req, res, next) => {
  console.log('[server.js]: 🔐 Discord authentication initiated');
  console.log('[server.js]: 📊 Request details:', {
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer,
    origin: req.headers.origin
  });
  passport.authenticate('discord')(req, res, next);
});

// ------------------- Function: handleDiscordCallback -------------------
// Handles Discord OAuth callback
app.get('/auth/discord/callback', 
  passport.authenticate('discord', { 
    failureRedirect: '/login',
    failureFlash: true 
  }), 
  (req, res) => {
    console.log('[server.js]: ✅ Discord authentication successful');
    console.log('[server.js]: �� Authenticated user:', {
      username: req.user?.username,
      discordId: req.user?.discordId,
      id: req.user?._id
    });
    
    // Successful authentication
    res.redirect('/?login=success');
  }
);

// ------------------- Function: logout -------------------
// Handles user logout
app.get('/auth/logout', (req, res) => {
  console.log('[server.js]: 🚪 Logout requested');
  console.log('[server.js]: 👤 User before logout:', {
    username: req.user?.username,
    discordId: req.user?.discordId,
    sessionId: req.session?.id
  });
  
  req.logout((err) => {
    if (err) {
      console.log('[server.js]: ❌ Logout error:', err);
      return res.redirect('/login');
    }
    console.log('[server.js]: ✅ Logout successful');
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

// ------------------- Health Check Endpoint -------------------
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      tinglebot: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      inventories: inventoriesConnection ? 'connected' : 'disconnected',
      vending: vendingConnection ? 'connected' : 'disconnected'
    },
    models: {
      character: Character ? 'loaded' : 'not loaded',
      user: User ? 'loaded' : 'not loaded'
    }
  };
  
  res.json(health);
});

// ------------------- User Authentication Status -------------------
app.get('/api/user', (req, res) => {
  
  const authInfo = {
    isAuthenticated: req.isAuthenticated(),
    user: req.user ? {
      username: req.user.username,
      discordId: req.user.discordId,
      id: req.user._id,
      email: req.user.email,
      avatar: req.user.avatar,
      discriminator: req.user.discriminator,
      tokens: req.user.tokens,
      characterSlot: req.user.characterSlot
    } : null,
    session: req.session ? {
      id: req.session.id,
      passport: req.session.passport
    } : null
  };
  

  res.json(authInfo);
});

// ------------------- Section: User Lookup API Routes -------------------

// ------------------- Function: searchUsers -------------------
// Search users by username or Discord ID
app.get('/api/users/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    const searchRegex = new RegExp(query, 'i');
    
    const users = await User.find({
      $or: [
        { username: searchRegex },
        { discordId: searchRegex }
      ]
    })
    .select('discordId username discriminator avatar tokens characterSlot status createdAt')
    .sort({ createdAt: -1, discordId: 1 })
    .limit(50)
    .lean();

    // Get character counts for each user
    const usersWithCharacters = await Promise.all(
      users.map(async (user) => {
        const characterCount = await Character.countDocuments({ 
          userId: user.discordId,
          name: { $nin: ['Tingle', 'Tingle test', 'John'] }
        });
        return {
          ...user,
          characterCount
        };
      })
    );

    res.json({ users: usersWithCharacters });
  } catch (error) {
    console.error('[server.js]: Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// ------------------- Function: getAllUsers -------------------
// Get all users with pagination
app.get('/api/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get total count of unique users
    const totalUsersResult = await User.aggregate([
      {
        $group: {
          _id: '$discordId'
        }
      },
      {
        $count: 'total'
      }
    ]);
    const totalUsers = totalUsersResult.length > 0 ? totalUsersResult[0].total : 0;
    
    // Get users for current page (with deduplication by discordId)
    const users = await User.aggregate([
      {
        $group: {
          _id: '$discordId',
          username: { $first: '$username' },
          discriminator: { $first: '$discriminator' },
          avatar: { $first: '$avatar' },
          tokens: { $first: '$tokens' },
          characterSlot: { $first: '$characterSlot' },
          status: { $first: '$status' },
          createdAt: { $first: '$createdAt' }
        }
      },
      {
        $sort: { createdAt: -1, _id: 1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]);



    // Get character counts for each user
    const usersWithCharacters = await Promise.all(
      users.map(async (user) => {
        const characterCount = await Character.countDocuments({ 
          userId: user._id, // Use _id from aggregated result
          name: { $nin: ['Tingle', 'Tingle test', 'John'] }
        });
        return {
          discordId: user._id, // Map _id back to discordId for frontend compatibility
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar,
          tokens: user.tokens,
          characterSlot: user.characterSlot,
          status: user.status,
          createdAt: user.createdAt,
          characterCount
        };
      })
    );

    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      users: usersWithCharacters,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('[server.js]: Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ------------------- Function: getUserDetails -------------------
// Get detailed user information including characters
app.get('/api/users/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;

    const user = await User.findOne({ discordId })
      .select('discordId username discriminator avatar tokens characterSlot status createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's characters
    const characters = await Character.find({ 
      userId: discordId,
      name: { $nin: ['Tingle', 'Tingle test', 'John'] }
    })
      .select('name icon job homeVillage currentVillage race inventory appLink _id currentHearts maxHearts currentStamina maxStamina')
      .lean();

    res.json({
      user: {
        ...user,
        characterCount: characters.length
      },
      characters
    });
  } catch (error) {
    console.error('[server.js]: Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
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

// ------------------- Commands Endpoint -------------------
app.get('/api/commands', async (req, res) => {
  try {
    // Return empty array - commands are now defined in commands.js
    res.json({ commands: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch commands' });
  }
});

// ------------------- Section: Statistics API Routes -------------------

// ------------------- Function: getRootsOfTheWildStats -------------------
// Returns statistics for Roots of the Wild game data
app.get('/api/rootsofthewild/stats', async (req, res) => {
  try {
    const [totalCharacters, activeQuests, totalItems, activeMonsters] = await Promise.all([
      Character.countDocuments({ name: { $nin: ['Tingle', 'Tingle test', 'John'] } }),
      Quest.countDocuments({ status: 'active' }),
      Item.countDocuments(),
      Monster.countDocuments({ isActive: true })
    ]);
    res.json({ totalCharacters, activeQuests, totalItems, activeMonsters });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch RootsOfTheWild stats' });
  }
});

// ------------------- Function: getTinglebotStats -------------------
// Returns statistics for Tinglebot system data
app.get('/api/tinglebot/stats', async (req, res) => {
  try {
    const [totalUsers, activePets, totalMounts, villageShops] = await Promise.all([
      User.countDocuments(),
              Pet.countDocuments({ status: 'active' }),
      Mount.countDocuments(),
      VillageShops.countDocuments()
    ]);
    res.json({ totalUsers, activePets, totalMounts, villageShops });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Tinglebot statistics' });
  }
});

// ------------------- Function: getCharacterStats -------------------
// Returns comprehensive character statistics and analytics
app.get('/api/stats/characters', async (req, res) => {
  try {
    const totalCharacters = await Character.countDocuments({ name: { $nin: ['Tingle', 'Tingle test', 'John'] } });

    // Get characters per village
    const perVillageAgg = await Character.aggregate([
      { $match: { 
        homeVillage: { $exists: true, $ne: null },
        name: { $nin: ['Tingle', 'Tingle test', 'John'] }
      } },
      { $group: { _id: { $toLower: { $ifNull: ["$homeVillage", "unknown"] } }, count: { $sum: 1 } } }
    ]);
    const charactersPerVillage = { rudania: 0, inariko: 0, vhintl: 0 };
    perVillageAgg.forEach(r => {
      if (charactersPerVillage[r._id] !== undefined) charactersPerVillage[r._id] = r.count;
    });

    // Get characters per race
    const perRaceAgg = await Character.aggregate([
      { 
        $match: { 
          race: { 
            $exists: true, 
            $ne: null, 
            $ne: '',
            $ne: 'undefined',
            $ne: 'null',
            $ne: 'Unknown',
            $ne: 'unknown'
          },
          name: { $nin: ['Tingle', 'Tingle test', 'John'] }
        } 
      },
      { $group: { _id: "$race", count: { $sum: 1 } } }
    ]);
    const charactersPerRace = {};
    perRaceAgg.forEach(r => {
      if (r._id && 
          r._id !== 'undefined' && 
          r._id !== 'null' && 
          r._id !== 'Unknown' && 
          r._id !== 'unknown' &&
          r._id !== undefined &&
          r._id !== null &&
          typeof r._id === 'string' &&
          r._id.trim && r._id.trim() !== '') {
        charactersPerRace[r._id] = r.count;
      }
    });



    // Get characters per job
    const perJobAgg = await Character.aggregate([
      { $match: { 
        job: { $exists: true, $ne: null, $ne: '' },
        name: { $nin: ['Tingle', 'Tingle test', 'John'] }
      } },
      { $project: { job: { $toLower: { $ifNull: ["$job", "unknown"] } } } },
      { $group: { _id: { $concat: [{ $toUpper: { $substr: ["$job", 0, 1] } }, { $substr: ["$job", 1, { $strLenCP: "$job" }] }] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const charactersPerJob = {};
    perJobAgg.forEach(r => {
      if (r._id && 
          r._id !== 'undefined' && 
          r._id !== 'null' && 
          r._id !== 'unknown' && 
          r._id !== 'Unknown' &&
          r._id.trim && r._id.trim() !== '') {
        charactersPerJob[r._id] = r.count;
      }
    });



    // Get upcoming birthdays
    const today = new Date();
    const thisYr = today.getFullYear();
    const allBday = await Character.find({ 
      birthday: { $exists: true, $ne: '' },
      name: { $nin: ['Tingle', 'Tingle test', 'John'] }
    }, { name: 1, birthday: 1 }).lean();
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
      { $match: { 
        currentVillage: { $in: villages }, 
        homeVillage: { $in: villages, $ne: null }, 
        $expr: { $ne: ['$currentVillage', '$homeVillage'] },
        name: { $nin: ['Tingle', 'Tingle test', 'John'] }
      } },
      { $group: { _id: '$currentVillage', count: { $sum: 1 } } }
    ]);
    const visitingCounts = { rudania: 0, inariko: 0, vhintl: 0 };
    visitingAgg.forEach(r => visitingCounts[r._id] = r.count);

    // Get detailed visiting characters
    const visitingCharacters = await Character.find(
      { 
        currentVillage: { $in: villages }, 
        homeVillage: { $in: villages, $ne: null }, 
        $expr: { $ne: ['$currentVillage', '$homeVillage'] },
        name: { $nin: ['Tingle', 'Tingle test', 'John'] }
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
      const top = await Character.find({ 
        [field]: { $gt: 0 },
        name: { $nin: ['Tingle', 'Tingle test', 'John'] }
      })
        .sort({ [field]: -1 })
        .limit(5)
        .select({ name: 1, [field]: 1 })
        .lean();
      
      if (!top.length) return { names: [], value: 0 };
      
      // Return all top characters with their individual values
      const names = top.map(c => c.name);
      const values = top.map(c => c[field]);
      
      return { names, values, value: top[0][field] }; // Keep 'value' for backward compatibility
    };

    // Get top characters by stamina and hearts (from character model)
    const [mostStamina, mostHearts] = await Promise.all([
      getTop('maxStamina'),
      getTop('maxHearts')
    ]);

    // Get top characters by spirit orbs (from inventory)
    const allCharacters = await Character.find({ 
      name: { $nin: ['Tingle', 'Tingle test', 'John'] }
    }, { name: 1 }).lean();
    const characterNames = allCharacters.map(c => c.name);
    const spiritOrbCounts = await countSpiritOrbsBatch(characterNames);
    
    // Sort characters by spirit orb count and get top 5
    const charactersWithOrbs = Object.entries(spiritOrbCounts)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5);
    
    const mostOrbs = charactersWithOrbs.length > 0 ? {
      names: charactersWithOrbs.map(([name, _]) => name),
      values: charactersWithOrbs.map(([_, count]) => count),
      value: charactersWithOrbs[0][1]
    } : { names: [], values: [], value: 0 };

    // Get special character counts
    const [kodCount, blightedCount, debuffedCount] = await Promise.all([
      Character.countDocuments({ ko: true, name: { $nin: ['Tingle', 'Tingle test', 'John'] } }),
      Character.countDocuments({ blighted: true, name: { $nin: ['Tingle', 'Tingle test', 'John'] } }),
      Character.countDocuments({ 'debuff.active': true, name: { $nin: ['Tingle', 'Tingle test', 'John'] } })
    ]);

    // Get debuffed characters details
    const debuffedCharacters = await Character.find(
      { 'debuff.active': true, name: { $nin: ['Tingle', 'Tingle test', 'John'] } },
      { name: 1, 'debuff.endDate': 1 }
    ).lean();

    // Get KO'd and blighted characters details
    const kodCharacters = await Character.find(
      { ko: true, name: { $nin: ['Tingle', 'Tingle test', 'John'] } },
      { name: 1, lastRollDate: 1, ko: 1 }
    ).lean();
    const blightedCharacters = await Character.find(
      { blighted: true, name: { $nin: ['Tingle', 'Tingle test', 'John'] } },
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
      blightedCharacters,
      timestamp: Date.now() // Add timestamp for cache busting
    });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching character stats:', error);
    res.status(500).json({ error: 'Failed to fetch character stats' });
  }
});



// ------------------- Function: getCalendarData -------------------
// Returns calendar data including Hyrulean calendar and Blood Moon dates
app.get('/api/calendar', async (req, res) => {
  try {

    
    // Get data from calendar module
    const hyruleanCalendar = calendarModule.hyruleanCalendar;
    const bloodmoonDates = calendarModule.bloodmoonDates;
    
    // Get all birthdays for calendar display
    const allBirthdays = await Character.find({ 
      birthday: { $exists: true, $ne: '' },
      name: { $nin: ['Tingle', 'Tingle test', 'John'] }
    }, { name: 1, birthday: 1, icon: 1 }).lean();
    const calendarBirthdays = allBirthdays.map(c => {
      const mmdd = c.birthday.slice(-5);
      return { name: c.name, birthday: mmdd, icon: c.icon };
    });
    
    // Get current date info
    const today = new Date();
    const currentHyruleanMonth = calendarModule.getHyruleanMonth(today);
    const isBloodmoonToday = calendarModule.isBloodmoon(today);
    const hyruleanDate = calendarModule.convertToHyruleanDate(today);
    
    res.json({
      hyruleanCalendar,
      bloodmoonDates,
      birthdays: calendarBirthdays,
      currentDate: {
        real: today.toISOString().split('T')[0],
        hyrulean: hyruleanDate,
        hyruleanMonth: currentHyruleanMonth,
        isBloodmoon: isBloodmoonToday
      }
    });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching calendar data:', error);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

// ------------------- Section: Model API Routes -------------------

// ------------------- Function: getModelCounts -------------------
// Returns count of documents for all models
app.get('/api/models/counts', async (req, res) => {
  try {

    
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
        
      } catch (error) {
        console.error(`[server.js]: ❌ Error getting ${key} count:`, error.message);
        // Keep 0 on error
      }
    }));
    
    
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

    
    const page = parseInt(req.query.page) || 1;
    const limit = 15; // Items per page
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
      req.query.sources ||
      // Check for monster boolean fields
      Object.keys(req.query).some(key => 
        ['bokoblin', 'blackBokoblin', 'blueBokoblin', 'cursedBokoblin', 'goldenBokoblin', 'silverBokoblin',
         'chuchuLarge', 'electricChuchuLarge', 'fireChuchuLarge', 'iceChuchuLarge',
         'chuchuMedium', 'electricChuchuMedium', 'fireChuchuMedium', 'iceChuchuMedium',
         'chuchuSmall', 'electricChuchuSmall', 'fireChuchuSmall', 'iceChuchuSmall',
         'hinox', 'blackHinox', 'blueHinox',
         'keese', 'electricKeese', 'fireKeese', 'iceKeese',
         'lizalfos', 'blackLizalfos', 'blueLizalfos', 'cursedLizalfos', 'electricLizalfos', 
         'fireBreathLizalfos', 'goldenLizalfos', 'iceBreathLizalfos', 'silverLizalfos',
         'lynel', 'blueManedLynel', 'goldenLynel', 'silverLynel', 'whiteManedLynel',
         'moblin', 'blackMoblin', 'blueMoblin', 'cursedMoblin', 'goldenMoblin', 'silverMoblin',
         'molduga', 'molduking',
         'forestOctorok', 'rockOctorok', 'skyOctorok', 'snowOctorok', 'treasureOctorok', 'waterOctorok',
         'frostPebblit', 'igneoPebblit', 'stonePebblit',
         'stalizalfos', 'stalkoblin', 'stalmoblin', 'stalnox',
         'frostTalus', 'igneoTalus', 'luminousTalus', 'rareTalus', 'stoneTalus',
         'blizzardWizzrobe', 'electricWizzrobe', 'fireWizzrobe', 'iceWizzrobe', 'meteoWizzrobe', 'thunderWizzrobe',
         'likeLike', 'evermean', 'gibdo', 'horriblin', 'gloomHands', 'bossBokoblin', 'mothGibdo', 'littleFrox'].includes(key)
      )
    );

    let Model, query = {};
    
    // Map model type to corresponding model
    switch (modelType) {
      case 'character':
        Model = Character;
        if (!Character) {
          console.error(`[server.js]: ❌ Character model not initialized`);
          return res.status(500).json({ error: 'Character model not available' });
        }
        break;
      case 'item':
        Model = Item;
        break;
      case 'monster':
        Model = Monster;
        query = {};
        break;
      case 'pet':
        Model = Pet;
        query = { status: 'active' };
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

    // Ensure database connection is available
    if (mongoose.connection.readyState !== 1) {
      console.error(`[server.js]: ❌ Database not connected. State: ${mongoose.connection.readyState}`);
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // For filtered item requests or all=true requests, return all items

    if (isFilteredRequest || allItems) {

      
      // Build query for item filtering
      if (modelType === 'item') {
        // Handle monster boolean fields
        const monsterFields = [
          'bokoblin', 'blackBokoblin', 'blueBokoblin', 'cursedBokoblin', 'goldenBokoblin', 'silverBokoblin',
          'chuchuLarge', 'electricChuchuLarge', 'fireChuchuLarge', 'iceChuchuLarge',
          'chuchuMedium', 'electricChuchuMedium', 'fireChuchuMedium', 'iceChuchuMedium',
          'chuchuSmall', 'electricChuchuSmall', 'fireChuchuSmall', 'iceChuchuSmall',
          'hinox', 'blackHinox', 'blueHinox',
          'keese', 'electricKeese', 'fireKeese', 'iceKeese',
          'lizalfos', 'blackLizalfos', 'blueLizalfos', 'cursedLizalfos', 'electricLizalfos', 
          'fireBreathLizalfos', 'goldenLizalfos', 'iceBreathLizalfos', 'silverLizalfos',
          'lynel', 'blueManedLynel', 'goldenLynel', 'silverLynel', 'whiteManedLynel',
          'moblin', 'blackMoblin', 'blueMoblin', 'cursedMoblin', 'goldenMoblin', 'silverMoblin',
          'molduga', 'molduking',
          'forestOctorok', 'rockOctorok', 'skyOctorok', 'snowOctorok', 'treasureOctorok', 'waterOctorok',
          'frostPebblit', 'igneoPebblit', 'stonePebblit',
          'stalizalfos', 'stalkoblin', 'stalmoblin', 'stalnox',
          'frostTalus', 'igneoTalus', 'luminousTalus', 'rareTalus', 'stoneTalus',
          'blizzardWizzrobe', 'electricWizzrobe', 'fireWizzrobe', 'iceWizzrobe', 'meteoWizzrobe', 'thunderWizzrobe',
          'likeLike', 'evermean', 'gibdo', 'horriblin', 'gloomHands', 'bossBokoblin', 'mothGibdo', 'littleFrox'
        ];
        
        // Add monster field filters to query
        monsterFields.forEach(field => {
          if (req.query[field] === 'true') {
            query[field] = true;
          }
        });
      }
      
      const allItemsData = await Model.find(query)
        .sort(modelType === 'item' ? { itemName: 1 } : {})
        .lean();
      
      // Filter out excluded characters if this is a character request
      let filteredData = allItemsData;
      if (modelType === 'character') {
        // List of characters to exclude from dashboard
        const excludedCharacters = ['Tingle', 'Tingle test', 'John'];
        
        filteredData = allItemsData.filter(character => 
          !excludedCharacters.includes(character.name)
        );
      } else {
        filteredData = allItemsData;
      }
      
      // For characters, we need to populate user information even for all=true requests
      let finalData = filteredData;
      if (modelType === 'character') {
        // Check cache first
        const now = Date.now();
        if (characterDataCache.data && (now - characterDataCache.timestamp) < characterDataCache.CACHE_DURATION) {
          finalData = characterDataCache.data;
        } else {
          // Get unique user IDs from characters
          const userIds = [...new Set(filteredData.map(char => char.userId))];
          
          // Fetch user information for all unique user IDs in one query
          const users = await User.find({ discordId: { $in: userIds } }, { 
            discordId: 1, 
            username: 1, 
            discriminator: 1 
          }).lean();
          
          // Create a map for quick lookup
          const userMap = {};
          users.forEach(user => {
            userMap[user.discordId] = user;
          });
            
          // Transform character data
          finalData = filteredData.map(character => {
            // Transform icon URL
            if (character.icon && character.icon.startsWith('https://storage.googleapis.com/tinglebot/')) {
              const filename = character.icon.split('/').pop();
              character.icon = filename;
            }
            
            // Add user information
            const user = userMap[character.userId];
            if (user) {
              character.owner = {
                username: user.username,
                discriminator: user.discriminator,
                displayName: user.username || 'Unknown User'
              };
            } else {
              character.owner = {
                username: 'Unknown',
                discriminator: null,
                displayName: 'Unknown User'
              };
            }
            
            // Initialize spirit orbs (will be updated below)
            character.spiritOrbs = 0;
            
            return character;
          });
          
                // Get spirit orb counts for all characters in one batch
      if (inventoriesConnection) {
        try {
          const characterNames = finalData.map(char => char.name);
          const spiritOrbCounts = await countSpiritOrbsBatch(characterNames);
          
          // Update spirit orb counts
          finalData.forEach(character => {
            character.spiritOrbs = spiritOrbCounts[character.name] || 0;
          });
        } catch (spiritOrbError) {
          console.warn('[server.js]: ⚠️ Error counting spirit orbs, using defaults:', spiritOrbError.message);
          finalData.forEach(character => {
            character.spiritOrbs = 0;
          });
        }
      } else {
        // No inventories connection, use defaults
        finalData.forEach(character => {
          character.spiritOrbs = 0;
        });
      }
          
          // Cache the processed data
          characterDataCache.data = finalData;
          characterDataCache.timestamp = now;
        }
        

      }
      
      res.json({
        data: finalData,
        pagination: {
          page: 1,
          pages: 1,
          total: finalData.length,
          limit: finalData.length
        }
      });
      return;
    }

    // Get total count for pagination
    const total = await Model.countDocuments(query);
    const pages = Math.ceil(total / limit);



    // Fetch paginated data
    let data = await Model.find(query)
      .sort(modelType === 'item' ? { itemName: 1 } : {})
      .skip(skip)
      .limit(limit)
      .lean();



    // Transform icon URLs for characters and populate user information
    if (modelType === 'character') {
      try {
        // Check cache first for paginated requests
        const now = Date.now();
        if (characterDataCache.data && (now - characterDataCache.timestamp) < characterDataCache.CACHE_DURATION) {
          // Use cached data and apply pagination
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          data = characterDataCache.data.slice(startIndex, endIndex);
        } else {
          // Get unique user IDs from characters
          const userIds = [...new Set(data.map(char => char.userId))];
          
          // Fetch user information for all unique user IDs in one query
          const users = await User.find({ discordId: { $in: userIds } }, { 
            discordId: 1, 
            username: 1, 
            discriminator: 1 
          }).lean();
          
          // Create a map for quick lookup
          const userMap = {};
          users.forEach(user => {
            userMap[user.discordId] = user;
          });
          
          // Transform character data
          data.forEach(character => {
            // Transform icon URL
            if (character.icon && character.icon.startsWith('https://storage.googleapis.com/tinglebot/')) {
              const filename = character.icon.split('/').pop();
              character.icon = filename;
            }
            
            // Add user information
            const user = userMap[character.userId];
            if (user) {
              character.owner = {
                username: user.username,
                discriminator: user.discriminator,
                displayName: user.username || 'Unknown User'
              };
            } else {
              character.owner = {
                username: 'Unknown',
                discriminator: null,
                displayName: 'Unknown User'
              };
            }
            
            // Initialize spirit orbs (will be updated below)
            character.spiritOrbs = 0;
          });
          
          // Get spirit orb counts for all characters in one batch
          if (inventoriesConnection) {
            try {
              const characterNames = data.map(char => char.name);
              const spiritOrbCounts = await countSpiritOrbsBatch(characterNames);
              
              // Update spirit orb counts
              data.forEach(character => {
                character.spiritOrbs = spiritOrbCounts[character.name] || 0;
              });
            } catch (spiritOrbError) {
              console.warn('[server.js]: ⚠️ Error counting spirit orbs, using defaults:', spiritOrbError.message);
              data.forEach(character => {
                character.spiritOrbs = 0;
              });
            }
          } else {
            // No inventories connection, use defaults
            data.forEach(character => {
              character.spiritOrbs = 0;
            });
          }
        }
      } catch (error) {
        console.error(`[server.js]: ❌ Error processing character data:`, error);
        // Continue with basic data without spirit orb counts
        data.forEach(character => {
          character.spiritOrbs = 0;
          if (!character.owner) {
            character.owner = {
              username: 'Unknown',
              discriminator: null,
              displayName: 'Unknown User'
            };
          }
        });
      }
    }

    
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
    const count = await Character.countDocuments({ name: { $nin: ['Tingle', 'Tingle test', 'John'] } });
    res.json({ count });
  } catch (error) {
    console.error('[server.js]: ❌ Failed to fetch character count:', error);
    res.status(500).json({ error: 'Failed to fetch character count' });
  }
});

// ------------------- Function: debugCharacterModel -------------------
// Debug endpoint for character model issues
app.get('/api/debug/character-model', async (req, res) => {
  try {
    const debug = {
      modelLoaded: !!Character,
      databaseConnected: mongoose.connection.readyState === 1,
      inventoriesConnected: !!inventoriesConnection,
      characterCount: null,
      sampleCharacter: null
    };
    
    if (debug.modelLoaded && debug.databaseConnected) {
      try {
        debug.characterCount = await Character.countDocuments({ name: { $nin: ['Tingle', 'Tingle test', 'John'] } });
        debug.sampleCharacter = await Character.findOne().lean();
      } catch (dbError) {
        debug.databaseError = dbError.message;
      }
    }
    
    res.json(debug);
  } catch (error) {
    console.error('[server.js]: ❌ Debug endpoint error:', error);
    res.status(500).json({ error: 'Debug endpoint failed', details: error.message });
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
    
    
    const characters = await Character.find({ userId }).lean();
    
    // Transform icon URLs for characters and count spirit orbs from inventory
    characters.forEach(character => {
      if (character.icon && character.icon.startsWith('https://storage.googleapis.com/tinglebot/')) {
        const filename = character.icon.split('/').pop();
        character.icon = filename;
      }
      
      // Count spirit orbs from inventory (replace character model field)
      character.spiritOrbs = 0; // Will be updated with actual count from inventory
    });
    
    // Get spirit orb counts for all characters
    const characterNames = characters.map(char => char.name);
    const spiritOrbCounts = await countSpiritOrbsBatch(characterNames);
    
    // Update spirit orb counts
    characters.forEach(character => {
      character.spiritOrbs = spiritOrbCounts[character.name] || 0;
    });
    
    
    res.json({ data: characters });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching user characters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------- Function: getCharacterOfWeek -------------------
// Returns the current character of the week
app.get('/api/character-of-week', async (req, res) => {
  try {
    
    
    const currentCharacter = await CharacterOfWeek.findOne({ isActive: true })
      .populate('characterId')
      .sort({ startDate: -1 })
      .lean();
    
    if (!currentCharacter) {

      return res.json({ 
        data: null, 
        message: 'No character of the week currently selected' 
      });
    }
    
    // Transform icon URL if needed
    if (currentCharacter.characterId && currentCharacter.characterId.icon && 
        currentCharacter.characterId.icon.startsWith('https://storage.googleapis.com/tinglebot/')) {
      const filename = currentCharacter.characterId.icon.split('/').pop();
      currentCharacter.characterId.icon = filename;
    }
    
    // Calculate rotation information
    const now = new Date();
    const nextRotation = getNextSundayMidnight(currentCharacter.startDate);
    const timeUntilRotation = nextRotation.getTime() - now.getTime();
    
    const daysUntilRotation = Math.floor(timeUntilRotation / (1000 * 60 * 60 * 24));
    const hoursUntilRotation = Math.floor((timeUntilRotation % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const isSunday = now.getUTCDay() === 0;
    
    // Add rotation info to the response
    currentCharacter.rotationInfo = {
      nextRotation: nextRotation.toISOString(),
      daysUntilRotation,
      hoursUntilRotation,
      isSunday,
      timeUntilRotation
    };
    
    
    res.json({ data: currentCharacter });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching character of the week:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------- Function: setCharacterOfWeek -------------------
// Sets a new character of the week (admin only)
app.post('/api/character-of-week', requireAuth, async (req, res) => {
  try {
    const { characterId, featuredReason } = req.body;
    
    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }
    
    // Check if user has admin privileges (you can customize this logic)
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    // Verify character exists
    const character = await Character.findById(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Deactivate current character of the week
    await CharacterOfWeek.updateMany(
      { isActive: true },
      { isActive: false }
    );
    
    // Calculate end date (next Sunday midnight)
    const startDate = new Date();
    const endDate = getNextSundayMidnight(startDate);
    
    // Create new character of the week
    const newCharacterOfWeek = new CharacterOfWeek({
      characterId: character._id,
      characterName: character.name,
      userId: character.userId,
      startDate,
      endDate,
      isActive: true,
      featuredReason: featuredReason || 'Admin selection'
    });
    
    await newCharacterOfWeek.save();
    
    
    res.json({ 
      data: newCharacterOfWeek,
      message: `Character of the week set to ${character.name}` 
    });
  } catch (error) {
    console.error('[server.js]: ❌ Error setting character of the week:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------- Function: getRandomCharacterOfWeek -------------------
// Automatically selects a random character for the week
app.post('/api/character-of-week/random', requireAuth, async (req, res) => {
  try {
    // Check if user has admin privileges
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    // Get all active characters
    const characters = await Character.find({}).lean();
    
    if (characters.length === 0) {
      return res.status(404).json({ error: 'No characters found' });
    }
    
    // Get recently featured characters (last 4 weeks) to avoid repetition
    const fourWeeksAgo = new Date(Date.now() - (28 * 24 * 60 * 60 * 1000));
    const recentCharacters = await CharacterOfWeek.find({
      startDate: { $gte: fourWeeksAgo }
    }).distinct('characterId');
    
    // Filter out recently featured characters
    const availableCharacters = characters.filter(char => 
      !recentCharacters.includes(char._id.toString())
    );
    
    // If all characters have been featured recently, use all characters
    const characterPool = availableCharacters.length > 0 ? availableCharacters : characters;
    
    // Select random character
    const randomCharacter = characterPool[Math.floor(Math.random() * characterPool.length)];
    
    // Deactivate current character of the week
    await CharacterOfWeek.updateMany(
      { isActive: true },
      { isActive: false }
    );
    
    // Calculate end date (next Sunday midnight)
    const startDate = new Date();
    const endDate = getNextSundayMidnight(startDate);
    
    // Create new character of the week
    const newCharacterOfWeek = new CharacterOfWeek({
      characterId: randomCharacter._id,
      characterName: randomCharacter.name,
      userId: randomCharacter.userId,
      startDate,
      endDate,
      isActive: true,
      featuredReason: 'Random selection'
    });
    
    await newCharacterOfWeek.save();
    
    
    res.json({ 
      data: newCharacterOfWeek,
      message: `Randomly selected ${randomCharacter.name} as character of the week` 
    });
  } catch (error) {
    console.error('[server.js]: ❌ Error selecting random character of the week:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------- Function: triggerFirstCharacterOfWeek -------------------
// Manually triggers the first character of the week (for testing)
app.post('/api/character-of-week/trigger-first', requireAuth, async (req, res) => {
  try {
    // Check if user has admin privileges
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    // Check if there's already an active character of the week
    const existingCharacter = await CharacterOfWeek.findOne({ isActive: true });
    if (existingCharacter) {
      return res.json({ 
        data: existingCharacter,
        message: `Character of the week already exists: ${existingCharacter.characterName}` 
      });
    }
    
    // Get all active characters
    const characters = await Character.find({}).lean();
    
    if (characters.length === 0) {
      return res.status(404).json({ error: 'No characters found' });
    }
    
    // Select random character
    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
    
    // Calculate end date (next Sunday midnight)
    const startDate = new Date();
    const endDate = getNextSundayMidnight(startDate);
    
    // Create new character of the week
    const newCharacterOfWeek = new CharacterOfWeek({
      characterId: randomCharacter._id,
      characterName: randomCharacter.name,
      userId: randomCharacter.userId,
      startDate,
      endDate,
      isActive: true,
      featuredReason: 'Manual trigger for testing'
    });
    
    await newCharacterOfWeek.save();
    
    
    res.json({ 
      data: newCharacterOfWeek,
      message: `Manually triggered first character of the week: ${randomCharacter.name}` 
    });
  } catch (error) {
    console.error('[server.js]: ❌ Error triggering first character of the week:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------- Function: setupWeeklyCharacterRotation -------------------
// Sets up the weekly character rotation scheduler and initializes on server start
const setupWeeklyCharacterRotation = async () => {
  console.log('[server.js]: 🔄 Setting up weekly character rotation scheduler');
  
  // Check if there's already an active character of the week
  const existingCharacter = await CharacterOfWeek.findOne({ isActive: true });
  
  if (existingCharacter) {
    console.log(`[server.js]: 📅 Found existing character of the week: ${existingCharacter.characterName}`);
    
    // Check if the existing character should be rotated based on Sunday midnight schedule
    const shouldRotate = checkIfShouldRotate(existingCharacter.startDate);
    
    if (shouldRotate) {
      console.log('[server.js]: 🔄 Rotating character of the week due to Sunday midnight schedule');
      await rotateCharacterOfWeek();
    } else {
      console.log('[server.js]: ✅ Current character of the week is still valid');
    }
  } else {
    console.log('[server.js]: 🔄 No active character of the week found, creating first one');
    await rotateCharacterOfWeek();
  }
  
  // Setup weekly scheduler for Sunday midnight EST
  scheduleNextSundayMidnightRotation();
};

// ------------------- Function: checkIfShouldRotate -------------------
// Checks if the character should be rotated based on Sunday midnight schedule
const checkIfShouldRotate = (startDate) => {
  const now = new Date();
  const start = new Date(startDate);
  
  // Get the next Sunday midnight EST from the start date
  const nextSundayMidnight = getNextSundayMidnight(start);
  
  // If current time is past the next Sunday midnight, rotate
  return now >= nextSundayMidnight;
};

// ------------------- Function: getNextSundayMidnight -------------------
// Gets the next Sunday midnight EST from a given date
const getNextSundayMidnight = (fromDate) => {
  const date = new Date(fromDate);
  
  // Set to EST timezone (UTC-5, or UTC-4 during daylight saving)
  // For simplicity, we'll use UTC-5 (EST) - you may want to handle DST properly
  const estOffset = -5 * 60 * 60 * 1000; // 5 hours in milliseconds
  
  // Get the day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = date.getUTCDay();
  
  // Calculate days until next Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  
  // Create the next Sunday midnight EST
  const nextSunday = new Date(date);
  nextSunday.setUTCDate(date.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(5, 0, 0, 0); // 5 AM UTC = 12 AM EST
  
  return nextSunday;
};

// ------------------- Function: scheduleNextSundayMidnightRotation -------------------
// Schedules the next rotation for Sunday midnight EST
const scheduleNextSundayMidnightRotation = () => {
  const now = new Date();
  const nextSundayMidnight = getNextSundayMidnight(now);
  
  const timeUntilNextRotation = nextSundayMidnight.getTime() - now.getTime();
  
  console.log(`[server.js]: 📅 Next character rotation scheduled for: ${nextSundayMidnight.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
  console.log(`[server.js]: ⏰ Time until next rotation: ${Math.floor(timeUntilNextRotation / (1000 * 60 * 60))} hours, ${Math.floor((timeUntilNextRotation % (1000 * 60 * 60)) / (1000 * 60))} minutes`);
  
  setTimeout(async () => {
    try {
      console.log('[server.js]: 🔄 Executing scheduled character rotation');
      await rotateCharacterOfWeek();
      
      // Schedule the next rotation
      scheduleNextSundayMidnightRotation();
      
    } catch (error) {
      console.error('[server.js]: ❌ Error in scheduled weekly character rotation:', error);
      // Schedule next rotation even if this one failed
      scheduleNextSundayMidnightRotation();
    }
  }, timeUntilNextRotation);
};

// ------------------- Function: rotateCharacterOfWeek -------------------
// Helper function to rotate the character of the week
const rotateCharacterOfWeek = async () => {
  try {
    console.log('[server.js]: 🔄 Starting character of the week rotation');
    
    // Get all active characters
    const characters = await Character.find({}).lean();
    
    if (characters.length === 0) {
      console.log('[server.js]: ⚠️ No characters found for rotation');
      return;
    }
    
    // Get recently featured characters (last 4 weeks) to avoid repetition
    const fourWeeksAgo = new Date(Date.now() - (28 * 24 * 60 * 60 * 1000));
    const recentCharacters = await CharacterOfWeek.find({
      startDate: { $gte: fourWeeksAgo }
    }).distinct('characterId');
    
    // Filter out recently featured characters
    const availableCharacters = characters.filter(char => 
      !recentCharacters.includes(char._id.toString())
    );
    
    // If all characters have been featured recently, use all characters
    const characterPool = availableCharacters.length > 0 ? availableCharacters : characters;
    
    // Select random character
    const randomCharacter = characterPool[Math.floor(Math.random() * characterPool.length)];
    
    console.log(`[server.js]: 🎲 Selected character: ${randomCharacter.name}`);
    
    // Deactivate current character of the week
    await CharacterOfWeek.updateMany(
      { isActive: true },
      { isActive: false }
    );
    
    // Calculate start and end dates based on Sunday midnight schedule
    const startDate = new Date();
    const endDate = getNextSundayMidnight(startDate);
    
    console.log(`[server.js]: 📅 Character will be active until: ${endDate.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
    
    // Create new character of the week
    const newCharacterOfWeek = new CharacterOfWeek({
      characterId: randomCharacter._id,
      characterName: randomCharacter.name,
      userId: randomCharacter.userId,
      startDate,
      endDate,
      isActive: true,
      featuredReason: 'Weekly rotation'
    });
    
    await newCharacterOfWeek.save();
    
    console.log(`[server.js]: ✅ Successfully rotated to new character of the week: ${randomCharacter.name}`);
    
  } catch (error) {
    console.error('[server.js]: ❌ Error in rotateCharacterOfWeek:', error);
    throw error;
  }
};

// ------------------- Function: triggerFirstCharacterOfWeekSimple -------------------
// Simple trigger for first character of the week (no auth required for testing)
app.post('/api/character-of-week/trigger-simple', async (req, res) => {
  try {
    
    // Check if there's already an active character of the week
    const existingCharacter = await CharacterOfWeek.findOne({ isActive: true });
    if (existingCharacter) {
      
      // Check if the existing character should be rotated based on Sunday midnight schedule
      const shouldRotate = checkIfShouldRotate(existingCharacter.startDate);
      
      if (shouldRotate) {
        console.log('[server.js]: 🔄 Triggering rotation due to Sunday midnight schedule');
        await rotateCharacterOfWeek();
        const newCharacter = await CharacterOfWeek.findOne({ isActive: true }).populate('characterId');
        return res.json({ 
          data: newCharacter,
          message: `Rotated character of the week: ${newCharacter.characterName}` 
        });
      } else {
        const now = new Date();
        const nextRotation = getNextSundayMidnight(existingCharacter.startDate);
        const daysUntilRotation = (nextRotation - now) / (1000 * 60 * 60 * 24);
        
        return res.json({ 
          data: existingCharacter,
          message: `Character of the week already exists: ${existingCharacter.characterName} (${daysUntilRotation.toFixed(1)} days until Sunday midnight rotation)` 
        });
      }
    }
    
    // Get all active characters
    const characters = await Character.find({}).lean();
    
    if (characters.length === 0) {    
      return res.status(404).json({ error: 'No characters found' });
    }
    
    
    // Use the rotation function to create the first character
    await rotateCharacterOfWeek();
    
    const newCharacter = await CharacterOfWeek.findOne({ isActive: true }).populate('characterId');
    
    res.json({ 
      data: newCharacter,
      message: `Created character of the week: ${newCharacter.characterName}` 
    });
  } catch (error) { 
    console.error('[server.js]: ❌ Error in triggerFirstCharacterOfWeekSimple:', error);
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
    
    
    // Fetch guild member information from Discord API
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
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
    
    
    res.json({
      joinedAt: joinedAt ? joinedAt.toISOString() : null,
      inGuild: true,
      roles: memberData.roles || [],
      nick: memberData.nick || null
    });
  } catch (error) {
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
    
    
    res.json({
      success: true,
      inviteUrl: inviteUrl,
      code: inviteData.code,
      expiresAt: inviteData.expires_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate guild invite link' });
  }
});

// ------------------- Section: Image Proxy Routes -------------------

// ------------------- Function: proxyImage -------------------
// Proxies images from Google Cloud Storage with caching headers
app.get('/api/images/*', async (req, res) => {
  try {
    // Get the full path after /api/images/
    const fullPath = req.params[0];
    const url = `https://storage.googleapis.com/tinglebot/${fullPath}`;

    
    const response = await fetch(url);
    if (!response.ok) {

      throw new Error('Image not found');
    }
    
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Content-Type', response.headers.get('content-type'));
    res.set('Cache-Control', 'public, max-age=31536000');
    
    response.body.pipe(res);
  } catch (error) {

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
    
    const inventoryData = [];
    
    for (const characterName of characterNames) {
      try {
        const col = await getCharacterInventoryCollection(characterName);
        const inv = await col.find().toArray();
        // Fetch all item names in this inventory
        const itemNames = inv.map(item => item.itemName);
        // Fetch all item docs in one go
        const itemDocs = await Item.find({ itemName: { $in: itemNames } }, { itemName: 1, image: 1 }).lean();
        const itemImageMap = {};
        itemDocs.forEach(doc => { itemImageMap[doc.itemName] = doc.image; });
        // Attach image to each inventory item
        inventoryData.push(...inv.map(item => ({
          ...item,
          characterName,
          image: itemImageMap[item.itemName] || 'No Image'
        })));
      } catch (error) {
        console.warn(`[server.js]: ⚠️ Error fetching inventory for character ${characterName}:`, error.message);
        continue;
      }
    }
    
    res.json({ data: inventoryData });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching character inventory data:', error);
    res.status(500).json({ error: 'Failed to fetch character inventory data', details: error.message });
  }
});

// ------------------- Function: getCharacterList -------------------
// Returns basic character info without inventory data (fast loading)
app.get('/api/characters/list', async (req, res) => {
  try {
  
    
    const characters = await Character.find({}, {
      name: 1,
      icon: 1,
      race: 1,
      job: 1,
      homeVillage: 1,
      currentVillage: 1
    }).lean();
    
    // Filter out excluded characters
    const excludedCharacters = ['Tingle', 'Tingle test', 'John'];
    const filteredCharacters = characters.filter(char => 
      !excludedCharacters.includes(char.name)
    );
    
    const characterList = filteredCharacters.map(char => ({
      characterName: char.name,
      icon: char.icon,
      race: char.race,
      job: char.job,
      homeVillage: char.homeVillage,
      currentVillage: char.currentVillage
    }));
    

    res.json({ data: characterList });
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching character list:', error);
    res.status(500).json({ error: 'Failed to fetch character list', details: error.message });
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
          icon: char.icon,
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
          icon: char.icon,
          totalItems: 0,
          uniqueItems: 0,
          categories: [],
          types: []
        });
      }
    }
    

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
    
    res.json(items);
  } catch (error) {
    console.error('[server.js]: ❌ Error fetching items data:', error);
    res.status(500).json({ error: 'Failed to fetch items data', details: error.message });
  }
});

// ------------------- Function: searchInventoryByItem -------------------
// Searches inventory for specific item across all characters
app.post('/api/inventory/item', async (req, res) => {
  
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
    
    
    const { weatherDayStart, weatherDayEnd } = getWeatherDayBounds();
    
    
    
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
    
    // Determine the current season
    const currentSeason = calendarModule.getCurrentSeason();
    
    
    // Only fetch weather for the current season
    const history = await Weather.getRecentWeather(village, days, currentSeason);
    
    
    res.json({
      village,
      history,
      days,
      season: currentSeason
    });
  } catch (error) {
    console.error(`[server.js]: ❌ Error fetching weather history for ${req.params.village}:`, error);
    res.status(500).json({ error: 'Failed to fetch weather history', details: error.message });
  }
});

// ------------------- Function: getWeatherStats -------------------
// Returns weather statistics for all villages
app.get('/api/weather/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    
    
    const villages = ['Rudania', 'Inariko', 'Vhintl'];
    const statsData = {};
    
    for (const village of villages) {
      const history = await Weather.getRecentWeather(village, days);
      statsData[village] = history;
    }
    
    
    res.json({
      days,
      villages: statsData,
      totalRecords: Object.values(statsData).reduce((sum, data) => sum + data.length, 0)
    });
  } catch (error) {
    console.error(`[server.js]: ❌ Error fetching weather statistics:`, error);
    res.status(500).json({ error: 'Failed to fetch weather statistics', details: error.message });
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
    
    // Setup weekly character rotation
    await setupWeeklyCharacterRotation();
    
    // Start server
    app.listen(PORT, () => {

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

  
  // Close all database connections
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();

  }
  
  if (inventoriesConnection) {
    await inventoriesConnection.close();
    
  }
  
  if (vendingConnection) {
    await vendingConnection.close();

  }
  
  
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start the server
startServer();

// ------------------- Function: countSpiritOrbs -------------------
// Counts spirit orbs from a character's inventory
async function countSpiritOrbs(characterName) {
  try {
    const col = await getCharacterInventoryCollection(characterName);
    const spiritOrbItem = await col.findOne({ 
      itemName: { $regex: /^spirit\s*orb$/i } 
    });
    return spiritOrbItem ? spiritOrbItem.quantity || 0 : 0;
  } catch (error) {
    console.warn(`[server.js]: ⚠️ Error counting spirit orbs for ${characterName}:`, error.message);
    return 0;
  }
}

// ------------------- Function: countSpiritOrbsBatch -------------------
// Counts spirit orbs for multiple characters efficiently with caching
async function countSpiritOrbsBatch(characterNames) {
  const spiritOrbCounts = {};
  const now = Date.now();
  
  // Check cache first
  const uncachedCharacters = [];
  for (const characterName of characterNames) {
    const cached = spiritOrbCache.get(characterName);
    if (cached && (now - cached.timestamp) < SPIRIT_ORB_CACHE_DURATION) {
      spiritOrbCounts[characterName] = cached.count;
    } else {
      uncachedCharacters.push(characterName);
    }
  }
  
  // Only query database for uncached characters
  if (uncachedCharacters.length > 0) {
    for (const characterName of uncachedCharacters) {
      try {
        // Ensure characterName is valid
        if (!characterName || typeof characterName !== 'string') {
          console.warn(`[server.js]: ⚠️ Invalid character name for spirit orb count: ${characterName}`);
          spiritOrbCounts[characterName] = 0;
          continue;
        }
        
        const col = await getCharacterInventoryCollection(characterName);
        const spiritOrbItem = await col.findOne({ 
          itemName: { $regex: /^spirit\s*orb$/i } 
        });
        const count = spiritOrbItem ? spiritOrbItem.quantity || 0 : 0;
        
        // Cache the result
        spiritOrbCache.set(characterName, {
          count,
          timestamp: now
        });
        
        spiritOrbCounts[characterName] = count;
      } catch (error) {
        console.warn(`[server.js]: ⚠️ Error counting spirit orbs for ${characterName}:`, error.message);
        spiritOrbCounts[characterName] = 0;
      }
    }
  }
  
  return spiritOrbCounts;
}

// ------------------- Function: testSundayMidnightCalculation -------------------
// Test endpoint to verify Sunday midnight calculation (for debugging)
app.get('/api/test-sunday-midnight', async (req, res) => {
  try {
    const now = new Date();
    const nextSunday = getNextSundayMidnight(now);
    const timeUntilNext = nextSunday.getTime() - now.getTime();
    
    const result = {
      currentTime: now.toISOString(),
      currentTimeEST: now.toLocaleString('en-US', { timeZone: 'America/New_York' }),
      nextSundayMidnight: nextSunday.toISOString(),
      nextSundayMidnightEST: nextSunday.toLocaleString('en-US', { timeZone: 'America/New_York' }),
      timeUntilNext: {
        milliseconds: timeUntilNext,
        hours: Math.floor(timeUntilNext / (1000 * 60 * 60)),
        minutes: Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60)),
        days: Math.floor(timeUntilNext / (1000 * 60 * 60 * 24))
      },
      currentDayOfWeek: now.getUTCDay(),
      isSunday: now.getUTCDay() === 0
    };
    
    res.json(result);
  } catch (error) {
    console.error('[server.js]: ❌ Error in test endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to check for duplicate users
app.get('/api/debug/users/duplicates', async (req, res) => {
  try {
    const duplicateUsers = await User.aggregate([
      {
        $group: {
          _id: '$discordId',
          count: { $sum: 1 },
          users: { $push: { _id: '$_id', username: '$username', createdAt: '$createdAt' } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('[Server] Duplicate users found:', duplicateUsers);
    
    res.json({
      duplicateUsers,
      totalDuplicates: duplicateUsers.length,
      totalDuplicateRecords: duplicateUsers.reduce((sum, group) => sum + group.count, 0)
    });
  } catch (error) {
    console.error('[server.js]: Error checking for duplicate users:', error);
    res.status(500).json({ error: 'Failed to check for duplicate users' });
  }
});
