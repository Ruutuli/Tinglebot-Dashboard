const mongoose = require('mongoose');

const relationshipSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  characterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character',
    required: true,
    index: true
  },
  targetCharacterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character',
    required: true,
    index: true
  },
  relationshipTypes: {
    type: [String],
    required: true,
    enum: ['LOVERS', 'CRUSH', 'CLOSE_FRIEND', 'FRIEND', 'ACQUAINTANCE', 'DISLIKE', 'HATE', 'NEUTRAL', 'OTHER'],
    default: ['NEUTRAL']
  },
  notes: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  isMutual: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'relationships'
});

// Compound index to prevent duplicate relationships between the same characters
relationshipSchema.index({ characterId: 1, targetCharacterId: 1 }, { unique: true });

// Index for efficient querying by user and character
relationshipSchema.index({ userId: 1, characterId: 1 });

// Index for efficient querying by target character
relationshipSchema.index({ targetCharacterId: 1 });

// Virtual for relationship types display info
relationshipSchema.virtual('typesInfo').get(function() {
  const typeMap = {
    LOVERS: { emoji: '❤️', label: 'Lovers', color: '#ff6b6b' },
    CRUSH: { emoji: '🧡', label: 'Crush', color: '#ffa726' },
    CLOSE_FRIEND: { emoji: '💛', label: 'Close Friend', color: '#ffd54f' },
    FRIEND: { emoji: '💚', label: 'Friend', color: '#81c784' },
    ACQUAINTANCE: { emoji: '💙', label: 'Acquaintance', color: '#64b5f6' },
    DISLIKE: { emoji: '💜', label: 'Dislike', color: '#ba68c8' },
    HATE: { emoji: '🖤', label: 'Hate', color: '#424242' },
    NEUTRAL: { emoji: '🤍', label: 'Neutral', color: '#bdbdbd' },
    OTHER: { emoji: '🤎', label: 'Other', color: '#8d6e63' }
  };
  
  return this.relationshipTypes.map(type => typeMap[type] || typeMap.OTHER);
});

// Method to get relationship display info
relationshipSchema.methods.getDisplayInfo = function() {
  return {
    id: this._id,
    characterId: this.characterId,
    targetCharacterId: this.targetCharacterId,
    types: this.relationshipTypes,
    typesInfo: this.typesInfo,
    notes: this.notes,
    isMutual: this.isMutual,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to get relationships for a character
relationshipSchema.statics.getCharacterRelationships = function(characterId) {
  return this.find({ characterId })
    .populate('targetCharacterId', 'name race job currentVillage homeVillage icon')
    .sort({ createdAt: -1 });
};

// Static method to get relationships by user
relationshipSchema.statics.getUserRelationships = function(userId) {
  return this.find({ userId })
    .populate('characterId', 'name race job currentVillage homeVillage icon')
    .populate('targetCharacterId', 'name race job currentVillage homeVillage icon')
    .sort({ createdAt: -1 });
};

// Static method to check if relationship exists
relationshipSchema.statics.relationshipExists = function(characterId, targetCharacterId) {
  return this.findOne({ characterId, targetCharacterId });
};

// Pre-save middleware to ensure characterId and targetCharacterId are different
relationshipSchema.pre('save', function(next) {
  if (this.characterId.toString() === this.targetCharacterId.toString()) {
    return next(new Error('Character cannot have a relationship with themselves'));
  }
  next();
});

// Pre-save middleware to validate relationship types
relationshipSchema.pre('save', function(next) {
  const validTypes = ['LOVERS', 'CRUSH', 'CLOSE_FRIEND', 'FRIEND', 'ACQUAINTANCE', 'DISLIKE', 'HATE', 'NEUTRAL', 'OTHER'];
  for (const type of this.relationshipTypes) {
    if (!validTypes.includes(type)) {
      return next(new Error(`Invalid relationship type: ${type}`));
    }
  }
  next();
});

module.exports = mongoose.model('Relationship', relationshipSchema);

