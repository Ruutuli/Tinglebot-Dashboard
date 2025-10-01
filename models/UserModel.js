// ------------------- Import necessary modules -------------------
const mongoose = require('mongoose');
// ------------------- Define the user schema -------------------
const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true }, // Unique Discord ID of the user
  username: { type: String, default: '' }, // Discord username
  discriminator: { type: String, default: '' }, // Discord discriminator
  avatar: { type: String, default: '' }, // Discord avatar URL
  email: { type: String, default: '' }, // Discord email
  googleSheetsUrl: { type: String, default: '' }, // URL to user's Google Sheets (if applicable)
  timezone: { type: String, default: 'UTC' }, // User's timezone (default to UTC)
  tokens: { type: Number, default: 0 }, // Number of tokens the user has
  tokenTracker: { type: String, default: '' }, // URL to token tracker
  tokensSynced: { type: Boolean, default: false }, // Track if tokens are synced
  blightedcharacter: { type: Boolean, default: false }, // Is the character blighted?
  characterSlot: { type: Number, default: 2 }, // Number of character slots available to the user

  // ------------------- Inactivity tracking fields -------------------
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }, // Activity status
  statusChangedAt: { type: Date, default: Date.now }, // When the status was last changed

  // ------------------- Message tracking fields -------------------
  lastMessageContent: { type: String, default: '' }, // Content of the last message sent
  lastMessageTimestamp: { type: Date }, // Timestamp of the last message

  // ------------------- Help Wanted Quest Tracking -------------------
  // Tracks Help Wanted quest completions, cooldowns, and history for this user
  helpWanted: {
    lastCompletion: { type: String, default: null }, // YYYY-MM-DD
    cooldownUntil: { type: Date, default: null },
    totalCompletions: { type: Number, default: 0 }, // Total number of Help Wanted quests completed
    completions: [
      {
        date: { type: String }, // YYYY-MM-DD
        village: { type: String },
        questType: { type: String }
      }
    ]
  },

  // ------------------- User Settings & Preferences -------------------
  // All user dashboard settings and preferences
  settings: {
    // Theme & Appearance
    theme: { type: String, enum: ['light', 'dark', 'auto', 'rudania', 'inariko', 'vhintl'], default: 'dark' },
    fontSize: { type: String, enum: ['small', 'medium', 'large', 'extra-large'], default: 'medium' },
    highContrast: { type: Boolean, default: false },
    
    // Performance & Animation
    imageQuality: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    animationSpeed: { type: String, enum: ['disabled', 'fast', 'normal', 'slow'], default: 'normal' },
    
    // Data Display
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    timezone: { type: String, default: 'auto' },
    currencyFormat: { type: String, default: 'USD' },
    numberFormat: { type: String, default: 'comma' },
    
    // List Preferences
    itemsPerPage: { type: Number, default: 24 },
    defaultSort: { type: String, default: 'date-desc' },
    
    // Notifications
    bloodMoonAlerts: { type: Boolean, default: false },
    dailyResetReminders: { type: Boolean, default: false },
    weatherNotifications: { type: Boolean, default: false },
    characterWeekUpdates: { type: Boolean, default: false },
    
    // Privacy & Security
    activityLogging: { type: Boolean, default: true },
    dataRetention: { type: Number, default: 90 },
    profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'friends' }
  }
}, {
  timestamps: true // This will automatically add createdAt and updatedAt fields
});

// ------------------- Export the User model -------------------
const User = mongoose.model('User', userSchema);
module.exports = User;
