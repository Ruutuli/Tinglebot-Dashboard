/**
 * Pin Model - Database schema for user-created map pins
 * Handles user-created location markers with authentication and permissions
 */

const mongoose = require('mongoose');

const pinSchema = new mongoose.Schema({
  // Pin identification
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  
  // Location data
  coordinates: {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  
  // Grid location for display
  gridLocation: {
    type: String,
    required: true,
    match: /^[A-J]([1-9]|1[0-2])$/,
    index: true
  },
  
  // Pin appearance
  icon: {
    type: String,
    default: 'fas fa-map-marker-alt',
    maxlength: 50
  },
  
  color: {
    type: String,
    default: '#00A3DA',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  
  category: {
    type: String,
    enum: ['home', 'work', 'farm', 'landmark', 'treasure', 'resource', 'custom'],
    default: 'custom'
  },
  
  // User ownership and permissions
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  discordId: {
    type: String,
    required: true,
    index: true
  },
  
  // Visibility settings
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
pinSchema.index({ createdBy: 1, createdAt: -1 });
pinSchema.index({ gridLocation: 1 });
pinSchema.index({ category: 1 });
pinSchema.index({ isPublic: 1 });

// Virtual for user info
pinSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to update grid location
pinSchema.pre('save', function(next) {
  if (this.isModified('coordinates')) {
    this.gridLocation = this.calculateGridLocation();
  }
  next();
});

// Method to calculate grid location from coordinates
pinSchema.methods.calculateGridLocation = function() {
  const { lat, lng } = this.coordinates;
  
  // Convert lat/lng to grid coordinates (A1-J12 system)
  // This is a simplified conversion - you may need to adjust based on your map's coordinate system
  const col = String.fromCharCode(65 + Math.floor((lng + 180) / 36)); // A-J
  const row = Math.floor((lat + 90) / 15) + 1; // 1-12
  
  return col + row;
};

// Method to check if user can edit/delete this pin
pinSchema.methods.canUserModify = function(userDiscordId) {
  return this.discordId === userDiscordId;
};

// Static method to get pins for a user
pinSchema.statics.getUserPins = function(discordId, includePublic = true) {
  const query = includePublic 
    ? { $or: [{ discordId }, { isPublic: true }] }
    : { discordId };
    
  return this.find(query)
    .populate('creator', 'username avatar discriminator')
    .sort({ createdAt: -1 });
};

// Static method to get pins by grid location
pinSchema.statics.getPinsByLocation = function(gridLocation) {
  return this.find({ gridLocation, isPublic: true })
    .populate('creator', 'username avatar discriminator')
    .sort({ createdAt: -1 });
};

// Static method to get pins by category
pinSchema.statics.getPinsByCategory = function(category, includePublic = true) {
  const query = includePublic 
    ? { category, $or: [{ isPublic: true }] }
    : { category };
    
  return this.find(query)
    .populate('creator', 'username avatar discriminator')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Pin', pinSchema);
