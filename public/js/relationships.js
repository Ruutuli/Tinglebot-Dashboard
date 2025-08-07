/* ============================================================================
   relationships.js — Relationships Feature Module
   Purpose: Handles character relationship management functionality
   Features: Character selection, relationship CRUD operations, modal management
   
   REFACTORING IMPROVEMENTS:
   - Eliminated duplicate relationship type definitions (RELATIONSHIP_CONFIG only)
   - Centralized character finding logic with robust ID handling
   - Created utility functions for consistent character display formatting
   - Centralized relationship type handling with validation
   - Unified modal management with consistent styling and behavior
   - Consolidated notification system with enhanced styling
   - Added comprehensive error handling wrapper for async operations
   - Improved code organization with clear section separation
   - Enhanced robustness with null checks and fallbacks
============================================================================ */

// ============================================================================
// ------------------- Centralized Relationship Configuration -------------------
// ============================================================================

// Centralized relationship type configuration
const RELATIONSHIP_CONFIG = {
  LOVERS: { 
    emoji: '❤️', 
    label: 'Lovers', 
    color: '#e57373'  // Soft red
  },
  CRUSH: { 
    emoji: '🧡', 
    label: 'Crush', 
    color: '#f4a261'  // Warm orange
  },
  CLOSE_FRIEND: { 
    emoji: '💛', 
    label: 'Close Friend', 
    color: '#f6e05e'  // Golden yellow
  },
  FRIEND: { 
    emoji: '💚', 
    label: 'Friend', 
    color: '#81c784'  // Muted green
  },
  ACQUAINTANCE: { 
    emoji: '💙', 
    label: 'Acquaintance', 
    color: '#64b5f6'  // Soft blue
  },
  DISLIKE: { 
    emoji: '💜', 
    label: 'Dislike', 
    color: '#ba68c8'  // Lavender purple
  },
  HATE: { 
    emoji: '🖤', 
    label: 'Hate', 
    color: '#424242'  // Dark grayish black
  },
  NEUTRAL: { 
    emoji: '🤍', 
    label: 'Neutral', 
    color: '#f5f5f5'  // Light gray
  },
  FAMILY: { 
    emoji: '👨‍👩‍👧‍👦', 
    label: 'Family', 
    color: '#ff8a65'  // Warm coral
  },
  RIVAL: { 
    emoji: '⚔️', 
    label: 'Rival', 
    color: '#d84315'  // Deep orange-red
  },
  ADMIRE: { 
    emoji: '⭐', 
    label: 'Admire', 
    color: '#ffd54f'  // Bright yellow
  },
  OTHER: { 
    emoji: '🤎', 
    label: 'Other', 
    color: '#a1887f'  // Soft brown
  }
};


// ============================================================================
// ------------------- Module Exports -------------------
// ============================================================================
export const relationshipsModule = {
  init,
  showRelationshipsSection,
  loadUserCharacters,
  selectCharacter,
  loadCharacterRelationships,
  showAddRelationshipModal,
  saveRelationship,
  editRelationship,
  deleteRelationship,
  backToCharacterSelection,
  showAllRelationships,
  loadAllRelationships,
  showCharacterRelationshipsModal,
  closeModal,
  showRelationshipWeb,
  backToRelationshipList,
  RELATIONSHIP_CONFIG // Export the config for use in other modules
};

// Make module available globally
window.relationshipsModule = relationshipsModule;
window.RELATIONSHIP_CONFIG = RELATIONSHIP_CONFIG; // Make config globally available

// Generate CSS variables for relationship colors
function generateRelationshipCSSVariables() {
  const style = document.createElement('style');
  style.id = 'relationship-css-variables';
  
  let cssVariables = ':root {\n';
  Object.entries(RELATIONSHIP_CONFIG).forEach(([key, config]) => {
    const cssKey = key.toLowerCase().replace(/_/g, '-');
    cssVariables += `  --relationship-color-${cssKey}: ${config.color};\n`;
  });
  cssVariables += '}';
  
  style.textContent = cssVariables;
  document.head.appendChild(style);
}

// Initialize CSS variables when module loads
document.addEventListener('DOMContentLoaded', () => {
  generateRelationshipCSSVariables();
});

// ============================================================================
// ------------------- Global Variables -------------------
// ============================================================================
let currentCharacter = null;
let userCharacters = [];
let allCharacters = [];
let relationships = [];

// Relationship types - using centralized config
const RELATIONSHIP_TYPES = RELATIONSHIP_CONFIG;

// ============================================================================
// ------------------- Initialization -------------------
// ============================================================================
function init() {
  console.log('🔗 Initializing Relationships Module');
  setupEventListeners();
}

function setupEventListeners() {
  // Modal close button
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('relationship-close-modal')) {
      closeModal();
    }
  });

  // Modal backdrop click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('relationship-modal')) {
      closeModal();
    }
  });

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

// ============================================================================
// ------------------- Main Section Display -------------------
// ============================================================================
async function showRelationshipsSection() {
  console.log('💕 Showing Relationships Section');
  
  // Hide all main content sections
  const mainContent = document.querySelector('.main-content');
  console.log('🔍 Main content element:', mainContent);
  const sections = mainContent.querySelectorAll('section, #model-details-page');
  console.log('🔍 Found sections:', sections.length);
  
  sections.forEach(section => {
    console.log('🔍 Hiding section:', section.id);
    section.style.display = 'none';
  });
  
  // Show the relationships section
  const relationshipsSection = document.getElementById('relationships-section');
  console.log('🔍 Relationships section element:', relationshipsSection);
  if (relationshipsSection) {
    relationshipsSection.style.display = 'block';
    console.log('✅ Relationships section displayed');
  } else {
    console.error('❌ Relationships section not found');
    return;
  }
  
  // Update active state in sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  sidebarLinks.forEach(link => {
    const linkSection = link.getAttribute('data-section');
    const listItem = link.closest('li');
    if (listItem) {
      if (linkSection === 'relationships-section') {
        listItem.classList.add('active');
      } else {
        listItem.classList.remove('active');
      }
    }
  });
  
  // Update breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = 'Relationships';
  }
  
  try {
    // Check if user is authenticated
    console.log('🔐 Checking authentication...');
    const isAuthenticated = await checkAuthentication();
    console.log('🔐 Authentication result:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('🔐 User not authenticated, showing guest message');
      showGuestMessage();
      return;
    }

    console.log('🔐 User authenticated, showing loading state');
    showLoadingState();
    console.log('🔐 Loading user characters...');
    await loadUserCharacters();
    
  } catch (error) {
    console.error('❌ Error showing relationships section:', error);
    showErrorState('Failed to load relationships section');
  }
}

async function checkAuthentication() {
  try {
    console.log('🔐 Fetching auth status...');
    const response = await fetch('/api/auth/status');
    console.log('🔐 Auth status response:', response.status, response.statusText);
    const data = await response.json();
    console.log('🔐 Auth status data:', data);
    return data.authenticated;
  } catch (error) {
    console.error('❌ Error checking authentication:', error);
    return false;
  }
}

function showGuestMessage() {
  console.log('👤 Showing guest message');
  hideAllStates();
  const guestMessage = document.getElementById('relationships-guest-message');
  console.log('👤 Guest message element:', guestMessage);
  if (guestMessage) {
    guestMessage.style.display = 'flex';
    console.log('👤 Guest message display set to flex');
  } else {
    console.error('❌ Guest message element not found!');
  }
}

function showLoadingState() {
  console.log('🔄 Showing loading state');
  hideAllStates();
  const loadingElement = document.getElementById('relationships-loading');
  console.log('🔄 Loading element:', loadingElement);
  if (loadingElement) {
    loadingElement.style.display = 'flex';
    console.log('🔄 Loading state displayed');
  } else {
    console.error('❌ Loading element not found!');
  }
}

function showErrorState(message) {
  hideAllStates();
  const errorElement = document.getElementById('relationships-error');
  errorElement.querySelector('p').textContent = message;
  errorElement.style.display = 'flex';
}

function hideAllStates() {
  console.log('🚫 Hiding all states');
  const states = [
    'relationships-guest-message',
    'relationships-character-selection',
    'relationships-management',
    'relationships-loading',
    'relationships-error',
    'relationships-all-view'
  ];
  
  states.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      console.log(`🚫 Hiding ${id}`);
      element.style.display = 'none';
    } else {
      console.log(`🚫 Element ${id} not found`);
    }
  });
}

// ============================================================================
// ------------------- Character Management -------------------
// ============================================================================
async function loadUserCharacters() {
  try {
    console.log('👥 Loading user characters');
    
    const response = await fetch('/api/user/characters');
    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response error text:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    console.log('📦 Response data.data:', data.data);
    console.log('📦 Response data.characters:', data.characters);
    userCharacters = data.data || [];
    console.log('👥 User characters loaded:', userCharacters.length);
    
    if (userCharacters.length === 0) {
      showErrorState('No characters found. Create a character first.');
      return;
    }
    
    renderCharacterSelector();
    
  } catch (error) {
    console.error('❌ Error loading user characters:', error);
    showErrorState('Failed to load characters');
  }
}

function renderCharacterSelector() {
  console.log('🎭 Rendering character selector');
  console.log('🎭 User characters to render:', userCharacters.length);
  
  hideAllStates();
  const characterSelection = document.getElementById('relationships-character-selection');
  console.log('🎭 Character selection element:', characterSelection);
  characterSelection.style.display = 'block';
  console.log('🎭 Character selection display set to block');
  
  const characterGrid = document.getElementById('relationships-character-grid');
  console.log('🎭 Character grid element:', characterGrid);
  characterGrid.innerHTML = '';
  characterGrid.className = 'relationship-character-grid';
  
  userCharacters.forEach(character => {
    console.log('🎭 Creating card for character:', character.name);
    const characterCard = createCharacterCard(character);
    characterGrid.appendChild(characterCard);
  });
  
  console.log('🎭 Character selector rendered');
}

function createCharacterCard(character) {
  const card = document.createElement('div');
  card.className = 'relationship-character-card';
  card.onclick = () => selectCharacter(character);
  
  const avatarUrl = formatCharacterIconUrl(character.icon);
  const displayInfo = getCharacterDisplayInfo(character);
  
  card.innerHTML = `
    <div class="relationship-character-card-header">
      <img src="${avatarUrl}" alt="${character.name}" class="relationship-character-avatar" />
      <div class="relationship-character-info">
        <h3>${displayInfo.name}</h3>
        <p>${displayInfo.info}</p>
        <p>${displayInfo.village}</p>
      </div>
    </div>
    <div class="relationship-character-card-footer">
      <button class="manage-relationships-btn">
        Manage Relationships
      </button>
    </div>
  `;
  
  return card;
}

async function selectCharacter(character) {
  console.log('🎯 Selected character:', character.name);
  
  currentCharacter = character;
  
  // Update character information display
  document.getElementById('relationships-character-name').textContent = character.name;
  
  // Update character avatar
  const avatarElement = document.getElementById('relationships-character-avatar');
  avatarElement.src = formatCharacterIconUrl(character.icon);
  avatarElement.alt = `${character.name}'s Avatar`;
  
  // Update character details using utility function
  const displayInfo = getCharacterDisplayInfo(character);
  const raceJobElement = document.getElementById('relationships-character-race-job');
  const villageElement = document.getElementById('relationships-character-village');
  
  raceJobElement.textContent = displayInfo.info;
  villageElement.textContent = displayInfo.village;
  
  hideAllStates();
  document.getElementById('relationships-management').style.display = 'block';
  
  await loadCharacterRelationships(character._id);
}

// ============================================================================
// ------------------- Relationship Management -------------------
// ============================================================================
async function loadCharacterRelationships(characterId) {
  try {
    console.log('💕 Loading relationships for character:', characterId);
    
    // Load all characters if not already loaded
    if (allCharacters.length === 0) {
      console.log('👥 Loading all characters for relationship display');
      const response = await fetch('/api/characters');
      if (response.ok) {
        const data = await response.json();
        allCharacters = data.characters || [];
        console.log('👥 Loaded all characters:', allCharacters.length);
      }
    }
    
    const response = await fetch(`/api/relationships/character/${characterId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    relationships = data.relationships || [];
    
    renderRelationships();
    
  } catch (error) {
    console.error('❌ Error loading relationships:', error);
    showErrorState('Failed to load relationships');
  }
}

function renderRelationships() {
  const relationshipsList = document.getElementById('relationships-list');
  relationshipsList.innerHTML = '';
  
  if (relationships.length === 0) {
    relationshipsList.innerHTML = `
      <div class="empty-relationships">
        <i class="fas fa-heart-broken"></i>
        <h3>No Relationships Yet</h3>
        <p>Start building relationships by adding connections to other characters.</p>
        <button class="add-relationship-btn" onclick="relationshipsModule.showAddRelationshipModal()">
          <i class="fas fa-plus"></i>
          Add Your First Relationship
        </button>
      </div>
    `;
    return;
  }
  
  // Group relationships by target character
  const groupedRelationships = {};
  relationships.forEach(relationship => {
    const targetId = typeof relationship.targetCharacterId === 'object' 
      ? relationship.targetCharacterId._id 
      : relationship.targetCharacterId;
    
    if (!groupedRelationships[targetId]) {
      groupedRelationships[targetId] = [];
    }
    groupedRelationships[targetId].push(relationship);
  });
  
  // Create group cards for each target character
  Object.values(groupedRelationships).forEach(characterRelationships => {
    const targetCharacter = findCharacterById(characterRelationships[0].targetCharacterId);
    const characterName = targetCharacter ? targetCharacter.name : 'Unknown Character';
    const avatarUrl = targetCharacter ? formatCharacterIconUrl(targetCharacter.icon) : '/images/ankleicon.png';
    const village = targetCharacter ? (targetCharacter.currentVillage || targetCharacter.homeVillage || 'Unknown Village') : 'Unknown Village';
    const characterInfo = targetCharacter ? `${targetCharacter.race || 'Unknown'} • ${targetCharacter.job || 'Unknown'} • ${village}` : '';
    
    const groupCard = document.createElement('div');
    groupCard.className = 'relationship-group-card';
    
    groupCard.innerHTML = `
      <div class="relationship-group-header">
        <div class="relationship-target-info">
          <img src="${avatarUrl}" alt="${characterName}" class="relationship-target-avatar" />
          <div class="relationship-target-details">
            <div class="relationship-target-name">${characterName}</div>
            ${characterInfo ? `<div class="relationship-target-info-text">${characterInfo}</div>` : ''}
          </div>
        </div>
        <button class="add-relationship-to-character-btn" onclick="relationshipsModule.showAddRelationshipModal('${targetCharacter ? targetCharacter._id : ''}')">
          <i class="fas fa-plus"></i> Add Relationship
        </button>
      </div>
      <div class="relationship-group-content">
        ${characterRelationships.map(relationship => {
          const typesDisplay = createRelationshipTypeBadges(relationship.relationshipTypes || [relationship.relationshipType] || ['OTHER']);
          
          return `
            <div class="relationship-item">
              <div class="relationship-item-types">
                ${typesDisplay}
              </div>
              ${relationship.isMutual ? '<div class="relationship-mutual"><i class="fas fa-sync-alt"></i> Mutual</div>' : ''}
              <div class="relationship-item-actions">
                <button class="edit-relationship-btn" onclick="relationshipsModule.editRelationship('${relationship._id}')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="delete-relationship-btn" onclick="relationshipsModule.deleteRelationship('${relationship._id}')">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${(() => {
        const relationshipsWithNotes = characterRelationships.filter(rel => rel.notes && rel.notes.trim());
        if (relationshipsWithNotes.length === 0) return '';
        
        return `
          <div class="relationship-notes-section">
            <div class="relationship-notes-header">
              <i class="fas fa-sticky-note"></i>
              <h4>Relationship Notes</h4>
            </div>
            <div class="relationship-notes-content">
              ${relationshipsWithNotes.map(relationship => {
                return `
                  <div class="relationship-note-item">
                    <div class="relationship-note-text">
                      ${relationship.notes}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      })()}
    `;
    
    relationshipsList.appendChild(groupCard);
  });
}

function createRelationshipCard(relationship) {
  console.log('🎭 Creating relationship card for:', relationship);
  console.log('🎭 Target character ID:', relationship.targetCharacterId);
  
  const card = document.createElement('div');
  card.className = 'relationship-card';
  
  const targetCharacter = findCharacterById(relationship.targetCharacterId);
  
  console.log('🎭 Target character found:', targetCharacter);
  
  const avatarUrl = targetCharacter ? formatCharacterIconUrl(targetCharacter.icon) : '/images/ankleicon.png';
  const displayInfo = getCharacterDisplayInfo(targetCharacter);
  
  // Create relationship types display using utility function
  const typesDisplay = createRelationshipTypeBadges(relationship.relationshipTypes || [relationship.relationshipType] || ['OTHER']);
  
  card.innerHTML = `
    <div class="relationship-header">
      <div class="relationship-types">
        ${typesDisplay}
      </div>
      <div class="relationship-actions">
        <button class="relationship-action-btn edit" onclick="relationshipsModule.editRelationship('${relationship._id}')" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="relationship-action-btn delete" onclick="relationshipsModule.deleteRelationship('${relationship._id}')" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <div class="relationship-target-info">
      <img src="${avatarUrl}" alt="${displayInfo.name}" class="relationship-target-avatar" />
      <div class="relationship-target-details">
        <div class="relationship-target-name">${displayInfo.name}</div>
        ${displayInfo.info ? `<div class="relationship-target-info-text">${displayInfo.info}</div>` : ''}
      </div>
    </div>
    ${relationship.notes ? `<div class="relationship-notes">${relationship.notes}</div>` : ''}
    ${relationship.isMutual ? '<div class="relationship-mutual"><i class="fas fa-sync-alt"></i> Mutual Relationship</div>' : ''}
  `;
  
  return card;
}

// ============================================================================
// ------------------- Utility Functions -------------------
// ============================================================================

/**
 * Enhanced character finding utility with robust ID handling
 * @param {string|object} characterId - Character ID or character object
 * @param {Array} characterArrays - Arrays to search in (defaults to [userCharacters, allCharacters])
 * @returns {object|null} Found character or null
 */
function findCharacterById(characterId, characterArrays = [userCharacters, allCharacters]) {
  if (!characterId) return null;
  
  // Handle case where characterId is actually a full character object
  if (typeof characterId === 'object' && characterId._id) {
    return characterId;
  }
  
  // Normalize ID to string
  const normalizedId = typeof characterId === 'string' ? characterId : characterId.toString();
  
  // Search in all provided arrays
  for (const characterArray of characterArrays) {
    if (!Array.isArray(characterArray)) continue;
    
    const character = characterArray.find(c => c._id === normalizedId);
    if (character) {
      return character;
    }
  }
  
  return null;
}

/**
 * Get character display information consistently
 * @param {object} character - Character object
 * @returns {object} Formatted character info
 */
function getCharacterDisplayInfo(character) {
  if (!character) return { name: 'Unknown Character', info: '', village: 'Unknown Village' };
  
  const race = character.race || 'Unknown';
  const job = character.job || 'Unknown';
  const village = character.currentVillage || character.homeVillage || 'Unknown Village';
  
  return {
    name: character.name,
    info: `${race.charAt(0).toUpperCase() + race.slice(1)} • ${job.charAt(0).toUpperCase() + job.slice(1)}`,
    village: village.charAt(0).toUpperCase() + village.slice(1)
  };
}

/**
 * Format character icon URL consistently
 * @param {string} icon - Icon path or URL
 * @returns {string} Formatted icon URL
 */
function formatCharacterIconUrl(icon) {
  if (!icon) return '/images/ankleicon.png';
  
  // If it's already a relative path or local URL, return as is
  if (!icon.startsWith('http')) {
    return `/api/images/${icon}`;
  }
  
  // If it's a Google Cloud Storage URL, extract the filename and use proxy
  if (icon.includes('storage.googleapis.com/tinglebot/')) {
    const filename = icon.split('/').pop();
    return `/api/images/${filename}`;
  }
  
  // For other HTTP URLs, return as is
  return icon;
}

/**
 * Get relationship type information consistently
 * @param {string|Array} types - Relationship type(s)
 * @returns {object} Formatted relationship type info
 */
function getRelationshipTypeInfo(types) {
  const typeArray = Array.isArray(types) ? types : [types];
  const validTypes = typeArray.filter(type => RELATIONSHIP_CONFIG[type]);
  
  if (validTypes.length === 0) {
    return {
      display: `${RELATIONSHIP_CONFIG.OTHER.emoji} ${RELATIONSHIP_CONFIG.OTHER.label}`,
      colors: [RELATIONSHIP_CONFIG.OTHER.color],
      types: ['OTHER']
    };
  }
  
  return {
    display: validTypes.map(type => `${RELATIONSHIP_CONFIG[type].emoji} ${RELATIONSHIP_CONFIG[type].label}`).join(', '),
    colors: validTypes.map(type => RELATIONSHIP_CONFIG[type].color),
    types: validTypes
  };
}

/**
 * Create relationship type badges HTML
 * @param {string|Array} types - Relationship type(s)
 * @returns {string} HTML for relationship type badges
 */
function createRelationshipTypeBadges(types) {
  const typeInfo = getRelationshipTypeInfo(types);
  return typeInfo.types.map(type => {
    const config = RELATIONSHIP_CONFIG[type];
    return `<span class="relationship-type-badge ${type.toLowerCase()}">${config.emoji} ${config.label}</span>`;
  }).join('');
}

function backToCharacterSelection() {
  console.log('⬅️ Going back to character selection');
  currentCharacter = null;
  relationships = [];
  renderCharacterSelector();
}

// ============================================================================
// ------------------- All Relationships View -------------------
// ============================================================================
async function showAllRelationships() {
  console.log('🌍 Showing all relationships view');
  hideAllStates();
  document.getElementById('relationships-all-view').style.display = 'block';
  await loadAllRelationships();
}

async function loadAllRelationships() {
  console.log('🌍 Loading all relationships');
  
  try {
    showLoadingState();
    
    // Fetch all relationships from the server
    const response = await fetch('/api/relationships/all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('🌍 All relationships data:', data);
    
    relationships = data.relationships || [];
    allCharacters = data.characters || [];
    
    // Hide loading and show the all relationships view
    hideAllStates();
    document.getElementById('relationships-all-view').style.display = 'block';
    
    renderAllRelationships();
    
  } catch (error) {
    console.error('❌ Error loading all relationships:', error);
    showErrorState('Failed to load all relationships');
  }
}

function renderAllRelationships() {
  console.log('🌍 Rendering all relationships');
  console.log('🌍 All characters count:', allCharacters.length);
  console.log('🌍 Relationships count:', relationships.length);
  
  const container = document.getElementById('relationships-all-list');
  if (!container) {
    console.error('❌ Container not found for all relationships');
    return;
  }

  console.log('🌍 Container found:', container);

  // Group relationships by character
  const relationshipsByCharacter = {};
  
  relationships.forEach(relationship => {
    // Handle both populated character objects and character IDs
    const characterId = relationship.characterId._id || relationship.characterId;
    if (!relationshipsByCharacter[characterId]) {
      relationshipsByCharacter[characterId] = [];
    }
    relationshipsByCharacter[characterId].push(relationship);
  });

  console.log('🌍 Relationships by character:', relationshipsByCharacter);

  // Create character cards for ALL characters
  const characterCards = allCharacters.map(character => {
    const characterId = character._id;
    const characterRelationships = relationshipsByCharacter[characterId] || [];
    const hasRelationships = characterRelationships.length > 0;

    console.log(`🌍 Creating card for ${character.name} (${characterId}) - has relationships: ${hasRelationships}`);

    const displayInfo = getCharacterDisplayInfo(character);
    
    return `
      <div class="all-relationships-character-card ${hasRelationships ? 'has-relationships' : 'no-relationships'}" onclick="relationshipsModule.showCharacterRelationshipsModal('${characterId}')">
        <div class="all-relationships-character-info">
          <img src="${formatCharacterIconUrl(character.icon)}" alt="${character.name}" class="all-relationships-character-avatar">
          <div class="all-relationships-character-details">
            <div class="all-relationships-character-name">${character.name}</div>
            <div class="all-relationships-character-info-text">
              ${displayInfo.info} • ${displayInfo.village}
            </div>
          </div>
        </div>
        <div class="all-relationships-character-stats">
          ${hasRelationships ? 
            `<span class="relationship-count">${characterRelationships.length} relationship${characterRelationships.length !== 1 ? 's' : ''}</span>` : 
            `<span class="no-relationships">No relationships</span>`
          }
          <i class="fas fa-chevron-right"></i>
        </div>
      </div>
    `;
  }).join('');

  console.log('🌍 Character cards HTML length:', characterCards.length);
  container.innerHTML = characterCards;
  console.log('🌍 Container innerHTML set');
}

// ============================================================================
// ------------------- Character Relationships Modal -------------------
// ============================================================================
function showCharacterRelationshipsModal(characterId) {
  console.log('👤 Showing character relationships modal for:', characterId);
  
  // Find the character
  const character = findCharacterById(characterId);
  if (!character) {
    console.error('❌ Character not found for modal:', characterId);
    return;
  }
  
  // Find all relationships for this character
  const characterRelationships = relationships.filter(rel => {
    const relCharacterId = rel.characterId._id || rel.characterId;
    return relCharacterId === characterId;
  });
  
  // Create modal if it doesn't exist
  if (!document.getElementById('character-relationships-modal')) {
    createCharacterRelationshipsModal();
  }
  
  const modal = document.getElementById('character-relationships-modal');
  const modalContent = modal.querySelector('.character-relationships-modal-content');
  
  // Populate modal content
  const displayInfo = getCharacterDisplayInfo(character);
  modalContent.innerHTML = `
    <div class="character-relationships-modal-header">
      <div class="character-relationships-modal-character-info">
        <img src="${formatCharacterIconUrl(character.icon)}" alt="${character.name}" class="character-relationships-modal-avatar">
        <div class="character-relationships-modal-character-details">
          <h3><i class="fas fa-heart"></i> ${character.name}</h3>
          <p>${displayInfo.info} • ${displayInfo.village}</p>
        </div>
      </div>
      <button class="character-relationships-close-modal">&times;</button>
    </div>
    
    <div class="character-relationships-modal-body">
      ${characterRelationships.length === 0 ? `
        <div class="empty-relationships">
          <i class="fas fa-heart-broken"></i>
          <h3>No Relationships</h3>
          <p>${character.name} doesn't have any relationships recorded yet.</p>
        </div>
      ` : `
        <div class="character-relationships-header">
          <h4><i class="fas fa-users"></i> Relationships (${characterRelationships.length})</h4>
        </div>
        <div class="character-relationships-list">
          ${characterRelationships.map(rel => {
            const targetCharacter = rel.targetCharacterId._id ? rel.targetCharacterId : findCharacterById(rel.targetCharacterId);
            if (!targetCharacter) return '';
            
            const typeInfo = getRelationshipTypeInfo(rel.relationshipTypes || rel.types || []);
            const typeLabels = typeInfo.display;
            
            const targetDisplayInfo = getCharacterDisplayInfo(targetCharacter);
            return `
              <div class="character-relationship-item">
                <div class="character-relationship-target">
                  <img src="${formatCharacterIconUrl(targetCharacter.icon)}" alt="${targetCharacter.name}" class="character-relationship-target-avatar">
                  <div class="character-relationship-target-info">
                    <div class="character-relationship-target-name">
                      <i class="fas fa-user"></i> ${targetCharacter.name}
                    </div>
                    <div class="character-relationship-target-details">
                      ${targetDisplayInfo.info} • ${targetDisplayInfo.village}
                    </div>
                  </div>
                </div>
                <div class="character-relationship-details">
                  ${typeLabels ? `<div class="character-relationship-types">${typeLabels}</div>` : ''}
                  ${rel.isMutual ? '<div class="character-relationship-mutual"><i class="fas fa-sync-alt"></i> Mutual Relationship</div>' : ''}
                  ${rel.notes && rel.notes.trim() ? `
                    <div class="character-relationship-notes">
                      <i class="fas fa-sticky-note"></i>
                      <span>${rel.notes}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
  
  // Show modal
  modal.classList.add('active');
  
  // Setup close button
  const closeBtn = modal.querySelector('.character-relationships-close-modal');
  closeBtn.onclick = () => {
    modal.classList.remove('active');
  };
  
  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  };
}

function createCharacterRelationshipsModal() {
  const modal = document.createElement('div');
  modal.id = 'character-relationships-modal';
  modal.className = 'character-relationships-modal';
  
  modal.innerHTML = `
    <div class="character-relationships-modal-content">
      <!-- Content will be populated dynamically -->
    </div>
  `;
  
  document.body.appendChild(modal);
}

// ============================================================================
// ------------------- Modal Management -------------------
// ============================================================================

/**
 * Create a modal with consistent styling and behavior
 * @param {string} id - Modal ID
 * @param {string} title - Modal title
 * @param {string} content - Modal content HTML
 * @returns {HTMLElement} Created modal element
 */
function createModal(id, title, content) {
  // Remove existing modal if it exists
  const existingModal = document.getElementById(id);
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = id;
  modal.className = 'relationship-modal';
  
  modal.innerHTML = `
    <div class="relationship-modal-content">
      <div class="relationship-modal-header">
        <h3>${title}</h3>
        <button class="relationship-close-modal">&times;</button>
      </div>
      ${content}
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Setup close functionality
  const closeBtn = modal.querySelector('.relationship-close-modal');
  closeBtn.onclick = () => closeModal();
  
  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };
  
  return modal;
}

/**
 * Show modal with fade-in animation
 * @param {string} id - Modal ID
 */
function showModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
  }
}

/**
 * Close modal with fade-out animation
 * @param {string} id - Modal ID (optional, defaults to relationship-modal)
 */
function closeModal(id = 'relationship-modal') {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
  }
}
function showAddRelationshipModal(preSelectedTargetId = null) {
  console.log('➕ Showing add relationship modal');
  
  // Create modal if it doesn't exist
  if (!document.getElementById('relationship-modal')) {
    createRelationshipModal();
  }
  
  showModal('relationship-modal');
  
  // Reset form
  const form = document.querySelector('#relationship-modal .relationship-form');
  if (form) {
    form.reset();
    resetRelationshipTypeOptions();
  }
  
  // Load available characters for dropdown
  loadAvailableCharacters(preSelectedTargetId);
}

function createRelationshipModal() {
  const modal = document.createElement('div');
  modal.id = 'relationship-modal';
  modal.className = 'relationship-modal';
  
  modal.innerHTML = `
    <div class="relationship-modal-content">
      <div class="relationship-modal-header">
        <h3>Add Relationship</h3>
        <button class="relationship-close-modal">&times;</button>
      </div>
      <form class="relationship-form" onsubmit="relationshipsModule.saveRelationship(event)">
        <div class="relationship-form-group">
          <label for="target-character">Target Character</label>
          <select id="target-character" name="targetCharacterId" required>
            <option value="">Select a character...</option>
          </select>
        </div>
        
        <div class="relationship-form-group">
          <label>Relationship Types</label>
          <div class="relationship-type-options">
            ${Object.entries(RELATIONSHIP_TYPES).map(([key, type]) => `
              <label class="relationship-type-option" role="checkbox" aria-checked="false">
                <input type="checkbox" name="relationshipTypes" value="${key}" aria-label="${type.label}">
                <span class="relationship-type-emoji" aria-hidden="true">${type.emoji}</span>
                <span>${type.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
        
        <div class="relationship-form-group">
          <label for="relationship-notes">Notes (Optional)</label>
          <textarea id="relationship-notes" name="notes" placeholder="Add any notes about this relationship..."></textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-cancel" onclick="relationshipsModule.closeModal()">Cancel</button>
          <button type="submit" class="btn-save">Save Relationship</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Setup relationship type selection
  setupRelationshipTypeSelection();
}

function setupRelationshipTypeSelection() {
  const options = document.querySelectorAll('.relationship-type-option');
  options.forEach(option => {
    // Click handler
    option.addEventListener('click', () => {
      toggleRelationshipTypeOption(option);
    });
    
    // Keyboard accessibility
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleRelationshipTypeOption(option);
      }
    });
    
    // Make the option focusable
    option.setAttribute('tabindex', '0');
  });
}

function toggleRelationshipTypeOption(option) {
  const checkbox = option.querySelector('input[type="checkbox"]');
  checkbox.checked = !checkbox.checked;
  
  if (checkbox.checked) {
    option.classList.add('selected');
  } else {
    option.classList.remove('selected');
  }
}

function resetRelationshipTypeOptions() {
  const options = document.querySelectorAll('.relationship-type-option');
  options.forEach(option => {
    const checkbox = option.querySelector('input[type="checkbox"]');
    checkbox.checked = false;
    option.classList.remove('selected');
  });
}

async function loadAvailableCharacters(preSelectedTargetId = null) {
  try {
    // Load all characters if not already loaded
    if (allCharacters.length === 0) {
      const response = await fetch('/api/characters');
      if (response.ok) {
        const data = await response.json();
        allCharacters = data.characters || [];
      }
    }
    
    const select = document.getElementById('target-character');
    select.innerHTML = '<option value="">Select a character...</option>';
    
    // Filter out current character
    const availableCharacters = allCharacters.filter(char => 
      char._id !== currentCharacter._id
    );
    
    availableCharacters.forEach(character => {
      const option = document.createElement('option');
      option.value = character._id;
      option.textContent = character.name;
      select.appendChild(option);
    });
    
    // Pre-select target character if provided
    if (preSelectedTargetId) {
      select.value = preSelectedTargetId;
    }
    
  } catch (error) {
    console.error('❌ Error loading available characters:', error);
  }
}

async function saveRelationship(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const isEditMode = form.dataset.editMode === 'true';
  const relationshipId = form.dataset.relationshipId;
  
  const relationshipTypes = formData.getAll('relationshipTypes');
  if (relationshipTypes.length === 0) {
    showNotification('Please select at least one relationship type', 'error');
    return;
  }
  
  // Get the target character name
  const targetCharacterId = formData.get('targetCharacterId');
  const targetCharacter = allCharacters.find(char => char._id === targetCharacterId);
  
  // Use stored names for editing, or get from characters for new relationships
  const characterName = isEditMode ? form.dataset.characterName : currentCharacter.name;
  const targetCharacterName = isEditMode ? form.dataset.targetCharacterName : (targetCharacter ? targetCharacter.name : 'Unknown Character');
  
  console.log('🔍 Character names for saving:', {
    isEditMode,
    characterName,
    targetCharacterName,
    storedCharacterName: form.dataset.characterName,
    storedTargetCharacterName: form.dataset.targetCharacterName
  });
  
  const relationshipData = {
    characterId: currentCharacter._id,
    targetCharacterId: targetCharacterId,
    characterName: characterName,
    targetCharacterName: targetCharacterName,
    relationshipType: relationshipTypes,
    notes: formData.get('notes')
  };
  
  try {
    console.log('💾 Saving relationship:', relationshipData);
    
    const url = isEditMode ? `/api/relationships/${relationshipId}` : '/api/relationships';
    const method = isEditMode ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(relationshipData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Relationship saved:', data);
    
    closeModal();
    await loadCharacterRelationships(currentCharacter._id);
    
    // Show success message
    const message = isEditMode ? 'Relationship updated successfully!' : 'Relationship added successfully!';
    showNotification(message, 'success');
    
  } catch (error) {
    console.error('❌ Error saving relationship:', error);
    showNotification('Failed to save relationship', 'error');
  }
}

async function editRelationship(relationshipId) {
  console.log('✏️ Editing relationship:', relationshipId);
  
  // Find the relationship to edit
  const relationship = relationships.find(r => r._id === relationshipId);
  if (!relationship) {
    console.error('❌ Relationship not found:', relationshipId);
    showNotification('Relationship not found', 'error');
    return;
  }
  
  // Show the add relationship modal with pre-filled data
  showAddRelationshipModal();
  
  // Wait for modal to be created
  setTimeout(() => {
    const modal = document.getElementById('relationship-modal');
    if (!modal) return;
    
    const form = modal.querySelector('.relationship-form');
    if (!form) return;
    
    // Pre-fill the form with existing data
    const targetSelect = form.querySelector('#target-character');
    const typeCheckboxes = form.querySelectorAll('input[name="relationshipTypes"]');
    const notesTextarea = form.querySelector('#relationship-notes');
    
    if (targetSelect) {
      targetSelect.value = typeof relationship.targetCharacterId === 'object' 
        ? relationship.targetCharacterId._id 
        : relationship.targetCharacterId;
    }
    
    if (typeCheckboxes) {
      // First reset all checkboxes
      typeCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('.relationship-type-option').classList.remove('selected');
      });
      
      // Then set the ones for this relationship
      typeCheckboxes.forEach(checkbox => {
        if (relationship.relationshipTypes && relationship.relationshipTypes.includes(checkbox.value)) {
          checkbox.checked = true;
          checkbox.closest('.relationship-type-option').classList.add('selected');
        }
      });
    }
    
    if (notesTextarea) {
      notesTextarea.value = relationship.notes || '';
    }
    
    // Update modal title
    const modalTitle = modal.querySelector('.relationship-modal-header h3');
    if (modalTitle) {
      modalTitle.textContent = 'Edit Relationship';
    }
    
    // Update form to handle edit mode
    form.dataset.editMode = 'true';
    form.dataset.relationshipId = relationshipId;
    
    // Store character names for editing
    form.dataset.characterName = currentCharacter.name;
    
    // Get the target character name from the relationship data or find the character
    let targetCharacterName = relationship.targetCharacterName;
    if (!targetCharacterName) {
      const targetCharacter = findCharacterById(relationship.targetCharacterId);
      targetCharacterName = targetCharacter ? targetCharacter.name : 'Unknown Character';
    }
    form.dataset.targetCharacterName = targetCharacterName;
    
    console.log('🔍 Storing character names for editing:', {
      characterName: form.dataset.characterName,
      targetCharacterName: form.dataset.targetCharacterName,
      relationshipTargetCharacterName: relationship.targetCharacterName,
      relationshipTargetCharacterId: relationship.targetCharacterId
    });
    
  }, 100);
}

async function deleteRelationship(relationshipId) {
  if (!confirm('Are you sure you want to delete this relationship?')) {
    return;
  }
  
  try {
    console.log('🗑️ Deleting relationship:', relationshipId);
    
    const response = await fetch(`/api/relationships/${relationshipId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('✅ Relationship deleted');
    
    await loadCharacterRelationships(currentCharacter._id);
    
    // Show success message
    showNotification('Relationship deleted successfully!', 'success');
    
  } catch (error) {
    console.error('❌ Error deleting relationship:', error);
    showNotification('Failed to delete relationship', 'error');
  }
}



// ============================================================================
// ------------------- Utility Functions -------------------
// ============================================================================



function loadCharacterImage(character) {
  const characterId = character._id || character.id;
  const iconUrl = formatCharacterIconUrl(character.icon);
  
  const img = new Image();
  img.onload = function() {
    characterImages.set(characterId, img);
  };
  img.onerror = function() {
    console.warn(`Failed to load character image for ${character.name}: ${iconUrl}`);
    // Don't cache failed images
  };
  img.src = iconUrl;
}



// ============================================================================
// ------------------- Module Initialization -------------------
// ============================================================================

/**
 * Enhanced error handling wrapper for async operations
 * @param {Function} asyncFn - Async function to wrap
 * @param {string} operationName - Name of the operation for error logging
 * @returns {Function} Wrapped function with error handling
 */
function withErrorHandling(asyncFn, operationName) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      console.error(`❌ Error in ${operationName}:`, error);
      showNotification(`Failed to ${operationName.toLowerCase()}`, 'error');
      throw error;
    }
  };
}

// Wrap critical async functions with error handling
const loadUserCharactersWithErrorHandling = withErrorHandling(loadUserCharacters, 'load user characters');
const loadCharacterRelationshipsWithErrorHandling = withErrorHandling(loadCharacterRelationships, 'load character relationships');
const saveRelationshipWithErrorHandling = withErrorHandling(saveRelationship, 'save relationship');
const deleteRelationshipWithErrorHandling = withErrorHandling(deleteRelationship, 'delete relationship');

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initNotificationSystem();
  init();
});

// ============================================================================
// ------------------- Notification System -------------------
// ============================================================================

/**
 * Initialize notification system with styles
 */
function initNotificationSystem() {
  const notificationStyles = `
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      color: white;
      font-weight: 600;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .notification.show {
      transform: translateX(0);
    }
    
    .notification-success {
      background: var(--success-color, #4CAF50);
    }
    
    .notification-error {
      background: var(--error-color, #f44336);
    }
    
    .notification-info {
      background: var(--primary-color, #2196F3);
    }
  `;

  // Inject notification styles if not already present
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = notificationStyles;
    document.head.appendChild(style);
  }
}

/**
 * Show notification with consistent styling
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showNotification(message, type = 'info', duration = 3000) {
  // Initialize notification system if needed
  if (!document.getElementById('notification-styles')) {
    initNotificationSystem();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Remove after specified duration
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

// ============================================================================
// ------------------- Relationship Web Visualization -------------------
// ============================================================================

let relationshipWebCanvas = null;
let relationshipWebCtx = null;
let relationshipWebNodes = [];
let relationshipWebEdges = [];
let relationshipWebAnimationId = null;
let relationshipWebMouse = { x: 0, y: 0 };
let relationshipWebDraggedNode = null;
let characterImages = new Map(); // Cache for character images

// Relationship colors extracted from centralized config
const RELATIONSHIP_COLORS = Object.fromEntries(
  Object.entries(RELATIONSHIP_CONFIG).map(([key, value]) => [key, value.color])
);

function showRelationshipWeb() {
  console.log('🕸️ Showing relationship web');
  
  // Hide the list view and show the web view
  document.getElementById('relationships-all-list').style.display = 'none';
  document.querySelector('.relationship-web-view').style.display = 'block';
  
  // Initialize the canvas
  initRelationshipWeb();
  
  // Generate the network data
  generateRelationshipWebData();
  
  // Start the animation
  animateRelationshipWeb();
}

function backToRelationshipList() {
  console.log('📋 Back to relationship list');
  
  // Stop the animation
  if (relationshipWebAnimationId) {
    cancelAnimationFrame(relationshipWebAnimationId);
    relationshipWebAnimationId = null;
  }
  
  // Hide the web view and show the list view
  document.querySelector('.relationship-web-view').style.display = 'none';
  document.getElementById('relationships-all-list').style.display = 'grid';
}

function initRelationshipWeb() {
  const canvas = document.getElementById('relationship-web-canvas');
  if (!canvas) {
    console.error('❌ Relationship web canvas not found');
    return;
  }
  
  relationshipWebCanvas = canvas;
  relationshipWebCtx = canvas.getContext('2d');
  
  // Set canvas size
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  
  // Set up high-quality rendering
  relationshipWebCtx.imageSmoothingEnabled = true;
  relationshipWebCtx.imageSmoothingQuality = 'high';
  
  // Setup event listeners
  canvas.addEventListener('mousedown', handleRelationshipWebMouseDown);
  canvas.addEventListener('mousemove', handleRelationshipWebMouseMove);
  canvas.addEventListener('mouseup', handleRelationshipWebMouseUp);
  canvas.addEventListener('wheel', handleRelationshipWebWheel);
}

function generateRelationshipWebData() {
  relationshipWebNodes = [];
  relationshipWebEdges = [];
  
  // First pass: identify which characters have relationships
  const charactersWithRelationships = new Set();
  
  relationships.forEach(relationship => {
    const sourceId = relationship.characterId._id || relationship.characterId;
    const targetId = relationship.targetCharacterId._id || relationship.targetCharacterId;
    
    charactersWithRelationships.add(sourceId);
    charactersWithRelationships.add(targetId);
  });
  
  // Only create nodes for characters that have relationships
  allCharacters.forEach((character, index) => {
    const characterId = character._id || character.id;
    
    // Only include characters that have relationships
    if (charactersWithRelationships.has(characterId)) {
      relationshipWebNodes.push({
        id: characterId,
        name: character.name,
        x: Math.random() * (relationshipWebCanvas.width - 200) + 100,
        y: Math.random() * (relationshipWebCanvas.height - 200) + 100,
        vx: 0,
        vy: 0,
        radius: 25,
        character: character,
        hasRelationships: true
      });
      
      // Preload character image if not already cached
      if (character.icon && !characterImages.has(characterId)) {
        loadCharacterImage(character);
      }
    }
  });
  
  // Create edges for relationships
  const relationshipMap = new Map(); // Track relationships between character pairs
  
  console.log('🔍 Processing relationships:', relationships.length);
  relationships.forEach(relationship => {
    const sourceId = relationship.characterId._id || relationship.characterId;
    const targetId = relationship.targetCharacterId._id || relationship.targetCharacterId;
    
    console.log('📋 Relationship:', {
      source: sourceId,
      target: targetId,
      types: relationship.relationshipTypes
    });
    
    const sourceNode = relationshipWebNodes.find(node => node.id === sourceId);
    const targetNode = relationshipWebNodes.find(node => node.id === targetId);
    
    if (sourceNode && targetNode) {
      // Create a unique key for this character pair (sorted to ensure consistency)
      const pairKey = [sourceId, targetId].sort().join('_');
      
      if (!relationshipMap.has(pairKey)) {
        relationshipMap.set(pairKey, {
          source: sourceNode,
          target: targetNode,
          sourceToTarget: null,
          targetToSource: null
        });
      }
      
      const pair = relationshipMap.get(pairKey);
      
      // Determine which direction this relationship represents
      const sortedIds = [sourceId, targetId].sort();
      const isSourceToTarget = sourceId === sortedIds[0] && targetId === sortedIds[1];
      
      if (isSourceToTarget) {
        // This is source -> target relationship
        pair.sourceToTarget = {
          types: relationship.relationshipTypes || [relationship.relationshipType] || ['OTHER'],
          colors: (relationship.relationshipTypes || [relationship.relationshipType] || ['OTHER']).map(type => 
            RELATIONSHIP_COLORS[type] || RELATIONSHIP_COLORS.OTHER
          )
        };
      } else {
        // This is target -> source relationship
        pair.targetToSource = {
          types: relationship.relationshipTypes || [relationship.relationshipType] || ['OTHER'],
          colors: (relationship.relationshipTypes || [relationship.relationshipType] || ['OTHER']).map(type => 
            RELATIONSHIP_COLORS[type] || RELATIONSHIP_COLORS.OTHER
          )
        };
      }
    }
  });
  
  // Convert the relationship map to edges
  relationshipMap.forEach((pair, key) => {
    console.log('🔗 Processing relationship pair:', key, {
      sourceToTarget: pair.sourceToTarget,
      targetToSource: pair.targetToSource,
      sourceName: pair.source.name,
      targetName: pair.target.name
    });
    
    if (pair.sourceToTarget && pair.targetToSource) {
      // Bidirectional relationship - create two parallel lines
      console.log('🔄 Creating bidirectional relationship between', pair.source.name, 'and', pair.target.name);
      relationshipWebEdges.push({
        source: pair.source,
        target: pair.target,
        bidirectional: true,
        sourceToTarget: pair.sourceToTarget,
        targetToSource: pair.targetToSource
      });
    } else if (pair.sourceToTarget) {
      // Unidirectional relationship - create single line from source to target
      console.log('➡️ Creating unidirectional relationship (source to target):', pair.source.name, '->', pair.target.name);
      relationshipWebEdges.push({
        source: pair.source,
        target: pair.target,
        bidirectional: false,
        direction: 'sourceToTarget',
        types: pair.sourceToTarget.types,
        colors: pair.sourceToTarget.colors
      });
    } else if (pair.targetToSource) {
      // Unidirectional relationship - create single line from target to source
      console.log('⬅️ Creating unidirectional relationship (target to source):', pair.target.name, '->', pair.source.name);
      relationshipWebEdges.push({
        source: pair.target,
        target: pair.source,
        bidirectional: false,
        direction: 'targetToSource',
        types: pair.targetToSource.types,
        colors: pair.targetToSource.colors
      });
    }
  });
}

function animateRelationshipWeb() {
  if (!relationshipWebCtx) return;
  
  // Clear canvas
  relationshipWebCtx.clearRect(0, 0, relationshipWebCanvas.width, relationshipWebCanvas.height);
  
  // Apply forces
  applyRelationshipWebForces();
  
  // Draw edges
  drawRelationshipWebEdges();
  
  // Draw nodes
  drawRelationshipWebNodes();
  
  // Continue animation
  relationshipWebAnimationId = requestAnimationFrame(animateRelationshipWeb);
}

function applyRelationshipWebForces() {
  relationshipWebNodes.forEach(node => {
    // Only apply forces if node is not being dragged
    if (relationshipWebDraggedNode === node) {
      // Reset velocity when dragging to prevent drift
      node.vx = 0;
      node.vy = 0;
      return;
    }
    
    // Repulsion between nodes (keep them from overlapping)
    relationshipWebNodes.forEach(otherNode => {
      if (node === otherNode) return;
      
      const dx = otherNode.x - node.x;
      const dy = otherNode.y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0 && distance < 80) {
        const force = (80 - distance) / distance * 0.015;
        node.vx -= (dx / distance) * force;
        node.vy -= (dy / distance) * force;
      }
    });
    
    // Light damping to prevent infinite movement
    node.vx *= 0.98;
    node.vy *= 0.98;
    
    // Update position
    node.x += node.vx;
    node.y += node.vy;
    
    // Keep nodes within bounds
    node.x = Math.max(node.radius, Math.min(relationshipWebCanvas.width - node.radius, node.x));
    node.y = Math.max(node.radius, Math.min(relationshipWebCanvas.height - node.radius, node.y));
  });
}

function drawRelationshipWebEdges() {
  relationshipWebEdges.forEach(edge => {
    // Calculate line properties
    const dx = edge.target.x - edge.source.x;
    const dy = edge.target.y - edge.source.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return; // Skip if nodes are at same position
    
    const lineAngle = Math.atan2(dy, dx);
    const perpendicularAngle = lineAngle + Math.PI / 2;
    
    if (edge.bidirectional) {
      // Bidirectional relationship - draw two separate lines with arrows
      const lineOffset = 6; // Increased distance between lines for better visibility
      
      // Draw source to target line (left)
      const leftSourceX = edge.source.x - Math.cos(perpendicularAngle) * lineOffset;
      const leftSourceY = edge.source.y - Math.sin(perpendicularAngle) * lineOffset;
      const leftTargetX = edge.target.x - Math.cos(perpendicularAngle) * lineOffset;
      const leftTargetY = edge.target.y - Math.sin(perpendicularAngle) * lineOffset;
      
      drawRelationshipLine(leftSourceX, leftSourceY, leftTargetX, leftTargetY, edge.sourceToTarget.colors);
      drawDirectionalArrow(leftTargetX, leftTargetY, lineAngle, edge.sourceToTarget.colors);
      
      // Draw target to source line (right)
      const rightSourceX = edge.source.x + Math.cos(perpendicularAngle) * lineOffset;
      const rightSourceY = edge.source.y + Math.sin(perpendicularAngle) * lineOffset;
      const rightTargetX = edge.target.x + Math.cos(perpendicularAngle) * lineOffset;
      const rightTargetY = edge.target.y + Math.sin(perpendicularAngle) * lineOffset;
      
      drawRelationshipLine(rightSourceX, rightSourceY, rightTargetX, rightTargetY, edge.targetToSource.colors);
      drawDirectionalArrow(rightSourceX, rightSourceY, lineAngle + Math.PI, edge.targetToSource.colors);
      
    } else {
      // Unidirectional relationship - draw single line with arrow
      drawRelationshipLine(edge.source.x, edge.source.y, edge.target.x, edge.target.y, edge.colors);
      drawDirectionalArrow(edge.target.x, edge.target.y, lineAngle, edge.colors);
    }
  });
}

function drawRelationshipLine(startX, startY, endX, endY, colors) {
  relationshipWebCtx.beginPath();
  relationshipWebCtx.moveTo(startX, startY);
  relationshipWebCtx.lineTo(endX, endY);
  
  if (colors.length > 1) {
    // Draw gradient line for multiple relationship types
    const gradient = relationshipWebCtx.createLinearGradient(startX, startY, endX, endY);
    colors.forEach((color, index) => {
      const stop = index / (colors.length - 1);
      gradient.addColorStop(stop, color);
    });
    relationshipWebCtx.strokeStyle = gradient;
  } else {
    // Draw solid color line for single relationship type
    relationshipWebCtx.strokeStyle = colors[0];
  }
  
  relationshipWebCtx.lineWidth = 4;
  relationshipWebCtx.stroke();
}

function drawDirectionalArrow(x, y, angle, color) {
  const arrowLength = 12;
  const arrowAngle = Math.PI / 6; // 30 degrees for sharper arrows
  
  // Position arrow right at the edge of the target node
  const nodeRadius = 25; // Should match the node radius
  const arrowX = x - Math.cos(angle) * nodeRadius;
  const arrowY = y - Math.sin(angle) * nodeRadius;
  
  // Use the source color for arrows (first color in the array for gradients)
  const arrowColor = Array.isArray(color) ? color[0] : color;
  
  // Draw filled arrow head for better visibility
  relationshipWebCtx.beginPath();
  relationshipWebCtx.moveTo(arrowX, arrowY);
  relationshipWebCtx.lineTo(
    arrowX - Math.cos(angle - arrowAngle) * arrowLength,
    arrowY - Math.sin(angle - arrowAngle) * arrowLength
  );
  relationshipWebCtx.lineTo(
    arrowX - Math.cos(angle + arrowAngle) * arrowLength,
    arrowY - Math.sin(angle + arrowAngle) * arrowLength
  );
  relationshipWebCtx.closePath();
  
  // Fill the arrow head
  relationshipWebCtx.fillStyle = arrowColor;
  relationshipWebCtx.fill();
  
  // Add a subtle border for definition
  relationshipWebCtx.strokeStyle = arrowColor;
  relationshipWebCtx.lineWidth = 1;
  relationshipWebCtx.stroke();
}

function drawRelationshipWebNodes() {
  relationshipWebNodes.forEach(node => {
    const displayRadius = node.radius;
    
    // Draw node circle with enhanced styling
    relationshipWebCtx.beginPath();
    relationshipWebCtx.arc(node.x, node.y, displayRadius, 0, 2 * Math.PI);
    
    // Enhanced fill with gradient-like effect
    const gradient = relationshipWebCtx.createRadialGradient(
      node.x - 5, node.y - 5, 0,
      node.x, node.y, displayRadius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(1, 'rgba(240, 240, 240, 0.9)');
    relationshipWebCtx.fillStyle = gradient;
    relationshipWebCtx.fill();
    
    // Border for connected characters
    relationshipWebCtx.strokeStyle = '#4CAF50';
    relationshipWebCtx.lineWidth = 3;
    relationshipWebCtx.stroke();
    
    // Draw character icon if available
    if (node.character && node.character.icon) {
      const characterId = node.character._id || node.character.id;
      const cachedImage = characterImages.get(characterId);
      
      if (cachedImage) {
        const iconSize = displayRadius * 1.6;
        const iconX = node.x - iconSize / 2;
        const iconY = node.y - iconSize / 2;
        
        // Create a circular clip for the icon
        relationshipWebCtx.save();
        relationshipWebCtx.beginPath();
        relationshipWebCtx.arc(node.x, node.y, displayRadius, 0, 2 * Math.PI);
        relationshipWebCtx.clip();
        
        // Draw the actual character image
        relationshipWebCtx.drawImage(cachedImage, iconX, iconY, iconSize, iconSize);
        
        relationshipWebCtx.restore();
      } else {
        // Draw a placeholder while image is loading
        const iconSize = displayRadius * 1.6;
        const iconX = node.x - iconSize / 2;
        const iconY = node.y - iconSize / 2;
        
        // Create a circular clip for the icon
        relationshipWebCtx.save();
        relationshipWebCtx.beginPath();
        relationshipWebCtx.arc(node.x, node.y, displayRadius, 0, 2 * Math.PI);
        relationshipWebCtx.clip();
        
        // Draw a simple character silhouette as placeholder
        relationshipWebCtx.fillStyle = '#666';
        relationshipWebCtx.fillRect(iconX, iconY, iconSize, iconSize);
        
        relationshipWebCtx.fillStyle = '#333';
        relationshipWebCtx.beginPath();
        relationshipWebCtx.arc(node.x, node.y - 6, 8, 0, 2 * Math.PI);
        relationshipWebCtx.fill();
        relationshipWebCtx.beginPath();
        relationshipWebCtx.arc(node.x, node.y + 10, 12, 0, 2 * Math.PI);
        relationshipWebCtx.fill();
        
        relationshipWebCtx.restore();
      }
    }
    
    // Draw character name with improved styling
    relationshipWebCtx.fillStyle = '#FFFFFF';
    relationshipWebCtx.font = 'bold 13px Arial, sans-serif';
    relationshipWebCtx.textAlign = 'center';
    relationshipWebCtx.textBaseline = 'middle';
    
    // Add text shadow for better readability
    relationshipWebCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    relationshipWebCtx.shadowBlur = 3;
    relationshipWebCtx.shadowOffsetX = 1;
    relationshipWebCtx.shadowOffsetY = 1;
    
    // Draw the name
    relationshipWebCtx.fillText(node.name, node.x, node.y + displayRadius + 25);
    
    // Reset effects
    relationshipWebCtx.shadowBlur = 0;
    relationshipWebCtx.shadowOffsetX = 0;
    relationshipWebCtx.shadowOffsetY = 0;
  });
}

function handleRelationshipWebMouseDown(event) {
  const rect = relationshipWebCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  relationshipWebNodes.forEach(node => {
    const dx = x - node.x;
    const dy = y - node.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const clickableRadius = node.radius + 10;
    
    if (distance < clickableRadius) {
      relationshipWebDraggedNode = node;
      relationshipWebMouse.x = x;
      relationshipWebMouse.y = y;
    }
  });
}

function handleRelationshipWebMouseMove(event) {
  if (relationshipWebDraggedNode) {
    const rect = relationshipWebCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    relationshipWebDraggedNode.x = x;
    relationshipWebDraggedNode.y = y;
    relationshipWebDraggedNode.vx = 0;
    relationshipWebDraggedNode.vy = 0;
  }
}

function handleRelationshipWebMouseUp() {
  relationshipWebDraggedNode = null;
}

function handleRelationshipWebWheel(event) {
  event.preventDefault();
  // Could implement zoom functionality here
}
