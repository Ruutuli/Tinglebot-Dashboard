/* ============================================================================
   relationships.js — Relationships Feature Module
   Purpose: Handles character relationship management functionality
   Features: Character selection, relationship CRUD operations, modal management
============================================================================ */

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
  deleteRelationship,
  backToCharacterSelection,
  showAllRelationships,
  loadAllRelationships,
  showCharacterRelationshipsModal,
  closeModal,
  showRelationshipWeb,
  backToRelationshipList
};

// Make module available globally
window.relationshipsModule = relationshipsModule;

// ============================================================================
// ------------------- Global Variables -------------------
// ============================================================================
let currentCharacter = null;
let userCharacters = [];
let allCharacters = [];
let relationships = [];

// Relationship types with emojis
const RELATIONSHIP_TYPES = {
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
  
  card.innerHTML = `
    <div class="relationship-character-card-header">
      <img src="${avatarUrl}" alt="${character.name}" class="relationship-character-avatar" />
      <div class="relationship-character-info">
        <h3>${character.name}</h3>
        <p>${(character.race || 'Unknown').charAt(0).toUpperCase() + (character.race || 'Unknown').slice(1)} • ${(character.job || 'Unknown').charAt(0).toUpperCase() + (character.job || 'Unknown').slice(1)}</p>
        <p>${(character.currentVillage || character.homeVillage || 'Unknown Village').charAt(0).toUpperCase() + (character.currentVillage || character.homeVillage || 'Unknown Village').slice(1)}</p>
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
  
  // Update character details
  const raceJobElement = document.getElementById('relationships-character-race-job');
  const villageElement = document.getElementById('relationships-character-village');
  
  const race = character.race || 'Unknown Race';
  const job = character.job || 'Unknown Job';
  const village = character.currentVillage || character.homeVillage || 'Unknown Village';
  
  raceJobElement.textContent = `${race} • ${job}`;
  villageElement.textContent = village;
  
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
          const relationshipTypes = relationship.relationshipTypes || [relationship.relationshipType] || ['OTHER'];
          const typesDisplay = relationshipTypes.map(type => {
            const typeInfo = RELATIONSHIP_TYPES[type] || RELATIONSHIP_TYPES.OTHER;
            return `<span class="relationship-type-badge ${type.toLowerCase()}">${typeInfo.emoji} ${typeInfo.label}</span>`;
          }).join('');
          
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
  const characterName = targetCharacter ? targetCharacter.name : 'Unknown Character';
  const characterInfo = targetCharacter ? `${targetCharacter.race || 'Unknown'} • ${targetCharacter.job || 'Unknown'}` : '';
  
  // Create relationship types display
  const relationshipTypes = relationship.relationshipTypes || [relationship.relationshipType] || ['OTHER'];
  const typesDisplay = relationshipTypes.map(type => {
    const typeInfo = RELATIONSHIP_TYPES[type] || RELATIONSHIP_TYPES.OTHER;
    return `<span class="relationship-type-badge ${type.toLowerCase()}">${typeInfo.emoji} ${typeInfo.label}</span>`;
  }).join('');
  
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
      <img src="${avatarUrl}" alt="${characterName}" class="relationship-target-avatar" />
      <div class="relationship-target-details">
        <div class="relationship-target-name">${characterName}</div>
        ${characterInfo ? `<div class="relationship-target-info-text">${characterInfo}</div>` : ''}
      </div>
    </div>
    ${relationship.notes ? `<div class="relationship-notes">${relationship.notes}</div>` : ''}
    ${relationship.isMutual ? '<div class="relationship-mutual"><i class="fas fa-sync-alt"></i> Mutual Relationship</div>' : ''}
  `;
  
  return card;
}

function findCharacterById(characterId) {
  console.log('🔍 Looking for character with ID:', characterId);
  
  // Handle case where characterId is actually a full character object
  if (typeof characterId === 'object' && characterId._id) {
    console.log('✅ Character object provided directly:', characterId.name);
    return characterId;
  }
  
  // Handle string ID
  if (typeof characterId === 'string') {
    // First check user characters
    let character = userCharacters.find(c => c._id === characterId);
    if (character) {
      console.log('✅ Found character in user characters:', character.name);
      return character;
    }
    
    // Then check all characters (if loaded)
    character = allCharacters.find(c => c._id === characterId);
    if (character) {
      console.log('✅ Found character in all characters:', character.name);
      return character;
    }
  }
  
  // Handle ObjectId from MongoDB (if it's an object with toString method)
  if (characterId && typeof characterId.toString === 'function') {
    const idString = characterId.toString();
    console.log('🔍 Converting ObjectId to string:', idString);
    
    // First check user characters
    let character = userCharacters.find(c => c._id === idString);
    if (character) {
      console.log('✅ Found character in user characters:', character.name);
      return character;
    }
    
    // Then check all characters (if loaded)
    character = allCharacters.find(c => c._id === idString);
    if (character) {
      console.log('✅ Found character in all characters:', character.name);
      return character;
    }
  }
  
  console.log('❌ Character not found. User characters count:', userCharacters.length);
  console.log('❌ All characters count:', allCharacters.length);
  console.log('❌ Sample user character IDs:', userCharacters.slice(0, 3).map(c => c._id));
  console.log('❌ Sample all character IDs:', allCharacters.slice(0, 3).map(c => c._id));
  
  return null;
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

    return `
      <div class="all-relationships-character-card ${hasRelationships ? 'has-relationships' : 'no-relationships'}" onclick="relationshipsModule.showCharacterRelationshipsModal('${characterId}')">
        <div class="all-relationships-character-info">
          <img src="${formatCharacterIconUrl(character.icon)}" alt="${character.name}" class="all-relationships-character-avatar">
          <div class="all-relationships-character-details">
            <div class="all-relationships-character-name">${character.name}</div>
            <div class="all-relationships-character-info-text">
              ${(character.race || 'Unknown').charAt(0).toUpperCase() + (character.race || 'Unknown').slice(1)} • ${(character.job || 'Unknown').charAt(0).toUpperCase() + (character.job || 'Unknown').slice(1)} • ${(character.currentVillage || character.homeVillage || 'Unknown').charAt(0).toUpperCase() + (character.currentVillage || character.homeVillage || 'Unknown').slice(1)}
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
  modalContent.innerHTML = `
    <div class="character-relationships-modal-header">
      <div class="character-relationships-modal-character-info">
        <img src="${formatCharacterIconUrl(character.icon)}" alt="${character.name}" class="character-relationships-modal-avatar">
        <div class="character-relationships-modal-character-details">
          <h3><i class="fas fa-heart"></i> ${character.name}</h3>
          <p>${(character.race || 'Unknown').charAt(0).toUpperCase() + (character.race || 'Unknown').slice(1)} • ${(character.job || 'Unknown').charAt(0).toUpperCase() + (character.job || 'Unknown').slice(1)} • ${(character.currentVillage || character.homeVillage || 'Unknown').charAt(0).toUpperCase() + (character.currentVillage || character.homeVillage || 'Unknown').slice(1)}</p>
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
            
            const relationshipTypes = rel.relationshipTypes || rel.types || [];
            const typeLabels = relationshipTypes.map(type => {
              const typeInfo = RELATIONSHIP_TYPES[type] || RELATIONSHIP_TYPES.OTHER;
              return typeInfo.emoji + ' ' + typeInfo.label;
            }).join(', ');
            
            return `
              <div class="character-relationship-item">
                <div class="character-relationship-target">
                  <img src="${formatCharacterIconUrl(targetCharacter.icon)}" alt="${targetCharacter.name}" class="character-relationship-target-avatar">
                  <div class="character-relationship-target-info">
                    <div class="character-relationship-target-name">
                      <i class="fas fa-user"></i> ${targetCharacter.name}
                    </div>
                    <div class="character-relationship-target-details">
                      ${(targetCharacter.race || 'Unknown').charAt(0).toUpperCase() + (targetCharacter.race || 'Unknown').slice(1)} • ${(targetCharacter.job || 'Unknown').charAt(0).toUpperCase() + (targetCharacter.job || 'Unknown').slice(1)} • ${(targetCharacter.currentVillage || targetCharacter.homeVillage || 'Unknown').charAt(0).toUpperCase() + (targetCharacter.currentVillage || targetCharacter.homeVillage || 'Unknown').slice(1)}
                    </div>
                  </div>
                </div>
                <div class="character-relationship-details">
                  ${typeLabels ? `<div class="character-relationship-types">${typeLabels}</div>` : ''}
                  ${rel.isMutual ? '<div class="character-relationship-mutual"><i class="fas fa-sync-alt"></i> Mutual Relationship</div>' : ''}
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
function showAddRelationshipModal(preSelectedTargetId = null) {
  console.log('➕ Showing add relationship modal');
  
  // Create modal if it doesn't exist
  if (!document.getElementById('relationship-modal')) {
    createRelationshipModal();
  }
  
  const modal = document.getElementById('relationship-modal');
  modal.classList.add('active');
  
  // Reset form
  const form = modal.querySelector('.relationship-form');
  form.reset();
  
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
        
        <div class="relationship-form-group">
          <div class="checkbox-group">
            <input type="checkbox" id="is-mutual" name="isMutual">
            <label for="is-mutual">Mutual Relationship</label>
          </div>
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
  
  const relationshipData = {
    characterId: currentCharacter._id,
    targetCharacterId: formData.get('targetCharacterId'),
    relationshipType: relationshipTypes,
    notes: formData.get('notes'),
    isMutual: formData.get('isMutual') === 'on'
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
    const mutualCheckbox = form.querySelector('#is-mutual');
    
    if (targetSelect) {
      targetSelect.value = typeof relationship.targetCharacterId === 'object' 
        ? relationship.targetCharacterId._id 
        : relationship.targetCharacterId;
    }
    
    if (typeCheckboxes) {
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
    
    if (mutualCheckbox) {
      mutualCheckbox.checked = relationship.isMutual || false;
    }
    
    // Update modal title
    const modalTitle = modal.querySelector('.relationship-modal-header h3');
    if (modalTitle) {
      modalTitle.textContent = 'Edit Relationship';
    }
    
    // Update form to handle edit mode
    form.dataset.editMode = 'true';
    form.dataset.relationshipId = relationshipId;
    
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

function closeModal() {
  const modal = document.getElementById('relationship-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ============================================================================
// ------------------- Utility Functions -------------------
// ============================================================================

// ------------------- Function: formatCharacterIconUrl -------------------
// Formats and returns character icon URL
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

function showNotification(message, type = 'info') {
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
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// ============================================================================
// ------------------- Module Initialization -------------------
// ============================================================================
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  init();
});

// Add notification styles
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
  }
  
  .notification.show {
    transform: translateX(0);
  }
  
  .notification-success {
    background: var(--success-color);
  }
  
  .notification-error {
    background: var(--error-color);
  }
  
  .notification-info {
    background: var(--primary-color);
  }
`;

// Inject notification styles
if (!document.getElementById('notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = notificationStyles;
  document.head.appendChild(style);
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
        radius: 20,
        character: character,
        hasRelationships: true // All characters in the web have relationships
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
    const actualSourceId = relationship.characterId._id || relationship.characterId;
    const actualTargetId = relationship.targetCharacterId._id || relationship.targetCharacterId;
    
    console.log('📋 Relationship:', {
      source: actualSourceId,
      target: actualTargetId,
      types: relationship.relationshipTypes
    });
    
    const sourceNode = relationshipWebNodes.find(node => node.id === actualSourceId);
    const targetNode = relationshipWebNodes.find(node => node.id === actualTargetId);
    
    if (sourceNode && targetNode) {
      // Create a unique key for this character pair (sorted to ensure consistency)
      const pairKey = [actualSourceId, actualTargetId].sort().join('_');
      
      if (!relationshipMap.has(pairKey)) {
        relationshipMap.set(pairKey, {
          source: sourceNode,
          target: targetNode,
          sourceToTarget: null,
          targetToSource: null
        });
      }
      
      const pair = relationshipMap.get(pairKey);
      
      // Store the relationship based on the actual direction from the relationship data
      // The relationship.characterId is the source, relationship.targetCharacterId is the target
      const relationshipSourceId = relationship.characterId._id || relationship.characterId;
      const relationshipTargetId = relationship.targetCharacterId._id || relationship.targetCharacterId;
      
      if (actualSourceId === relationshipSourceId && actualTargetId === relationshipTargetId) {
        // This is source -> target relationship
        pair.sourceToTarget = {
          types: relationship.relationshipTypes,
          colors: relationship.relationshipTypes.map(type => RELATIONSHIP_TYPES[type]?.color || '#8d6e63')
        };
      } else if (actualSourceId === relationshipTargetId && actualTargetId === relationshipSourceId) {
        // This is target -> source relationship
        pair.targetToSource = {
          types: relationship.relationshipTypes,
          colors: relationship.relationshipTypes.map(type => RELATIONSHIP_TYPES[type]?.color || '#8d6e63')
        };
      }
    }
  });
  
  // Convert the relationship map to edges
  relationshipMap.forEach((pair, key) => {
    console.log('🔗 Processing relationship pair:', key, {
      sourceToTarget: pair.sourceToTarget,
      targetToSource: pair.targetToSource
    });
    
    if (pair.sourceToTarget && pair.targetToSource) {
      // Bidirectional relationship - create two parallel lines
      console.log('🔄 Creating bidirectional relationship');
      relationshipWebEdges.push({
        source: pair.source,
        target: pair.target,
        bidirectional: true,
        sourceToTarget: pair.sourceToTarget,
        targetToSource: pair.targetToSource
      });
    } else if (pair.sourceToTarget) {
      // Unidirectional relationship - create single line from source to target
      console.log('➡️ Creating unidirectional relationship (source to target)');
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
      console.log('⬅️ Creating unidirectional relationship (target to source)');
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
      
      if (distance > 0 && distance < 60) {
        const force = (60 - distance) / distance * 0.02; // Very light repulsion
        node.vx -= (dx / distance) * force;
        node.vy -= (dy / distance) * force;
      }
    });
    
    // No center attraction - let nodes stay where they are
    // Only apply very light damping to prevent infinite movement
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
      const lineOffset = 6; // Distance between lines
      
      // Draw source to target line (upper)
      const upperSourceX = edge.source.x + Math.cos(perpendicularAngle) * lineOffset;
      const upperSourceY = edge.source.y + Math.sin(perpendicularAngle) * lineOffset;
      const upperTargetX = edge.target.x + Math.cos(perpendicularAngle) * lineOffset;
      const upperTargetY = edge.target.y + Math.sin(perpendicularAngle) * lineOffset;
      
      // Check if source to target has multiple relationship types
      if (edge.sourceToTarget.colors.length > 1) {
        // Draw gradient line for multiple relationship types
        const gradient = relationshipWebCtx.createLinearGradient(
          upperSourceX, upperSourceY, upperTargetX, upperTargetY
        );
        edge.sourceToTarget.colors.forEach((color, index) => {
          const stop = index / (edge.sourceToTarget.colors.length - 1);
          gradient.addColorStop(stop, color);
        });
        
        relationshipWebCtx.beginPath();
        relationshipWebCtx.moveTo(upperSourceX, upperSourceY);
        relationshipWebCtx.lineTo(upperTargetX, upperTargetY);
        relationshipWebCtx.strokeStyle = gradient;
        relationshipWebCtx.lineWidth = 3;
        relationshipWebCtx.stroke();
      } else {
        // Draw solid color line for single relationship type
        relationshipWebCtx.beginPath();
        relationshipWebCtx.moveTo(upperSourceX, upperSourceY);
        relationshipWebCtx.lineTo(upperTargetX, upperTargetY);
        relationshipWebCtx.strokeStyle = edge.sourceToTarget.colors[0];
        relationshipWebCtx.lineWidth = 3;
        relationshipWebCtx.stroke();
      }
      
      // Draw target to source line (lower)
      const lowerSourceX = edge.source.x - Math.cos(perpendicularAngle) * lineOffset;
      const lowerSourceY = edge.source.y - Math.sin(perpendicularAngle) * lineOffset;
      const lowerTargetX = edge.target.x - Math.cos(perpendicularAngle) * lineOffset;
      const lowerTargetY = edge.target.y - Math.sin(perpendicularAngle) * lineOffset;
      
      // Check if target to source has multiple relationship types
      if (edge.targetToSource.colors.length > 1) {
        // Draw gradient line for multiple relationship types
        const gradient = relationshipWebCtx.createLinearGradient(
          lowerSourceX, lowerSourceY, lowerTargetX, lowerTargetY
        );
        edge.targetToSource.colors.forEach((color, index) => {
          const stop = index / (edge.targetToSource.colors.length - 1);
          gradient.addColorStop(stop, color);
        });
        
        relationshipWebCtx.beginPath();
        relationshipWebCtx.moveTo(lowerSourceX, lowerSourceY);
        relationshipWebCtx.lineTo(lowerTargetX, lowerTargetY);
        relationshipWebCtx.strokeStyle = gradient;
        relationshipWebCtx.lineWidth = 3;
        relationshipWebCtx.stroke();
      } else {
        // Draw solid color line for single relationship type
        relationshipWebCtx.beginPath();
        relationshipWebCtx.moveTo(lowerSourceX, lowerSourceY);
        relationshipWebCtx.lineTo(lowerTargetX, lowerTargetY);
        relationshipWebCtx.strokeStyle = edge.targetToSource.colors[0];
        relationshipWebCtx.lineWidth = 3;
        relationshipWebCtx.stroke();
      }
      
      // Draw directional ticks
      const tickLength = 10;
      const tickDistance = 35; // Much further from bubbles
      
      // Upper line tick (source to target) - single sided like ↼
      const upperTargetTickX = upperTargetX - Math.cos(lineAngle) * tickDistance;
      const upperTargetTickY = upperTargetY - Math.sin(lineAngle) * tickDistance;
      
      // Draw angled tick pointing to target (like →)
      relationshipWebCtx.beginPath();
      relationshipWebCtx.moveTo(upperTargetTickX, upperTargetTickY);
      relationshipWebCtx.lineTo(
        upperTargetTickX - Math.cos(perpendicularAngle - Math.PI/4) * tickLength,
        upperTargetTickY - Math.sin(perpendicularAngle - Math.PI/4) * tickLength
      );
      relationshipWebCtx.strokeStyle = edge.sourceToTarget.colors[0];
      relationshipWebCtx.lineWidth = 4;
      relationshipWebCtx.stroke();
      
      // Lower line tick (target to source) - single sided like ↼
      const lowerTargetTickX = lowerTargetX - Math.cos(lineAngle) * tickDistance;
      const lowerTargetTickY = lowerTargetY - Math.sin(lineAngle) * tickDistance;
      
      // Draw angled tick pointing to source (like →)
      relationshipWebCtx.beginPath();
      relationshipWebCtx.moveTo(lowerTargetTickX, lowerTargetTickY);
      relationshipWebCtx.lineTo(
        lowerTargetTickX - Math.cos(perpendicularAngle - Math.PI/4) * tickLength,
        lowerTargetTickY - Math.sin(perpendicularAngle - Math.PI/4) * tickLength
      );
      relationshipWebCtx.strokeStyle = edge.targetToSource.colors[0];
      relationshipWebCtx.lineWidth = 4;
      relationshipWebCtx.stroke();
      
    } else {
      // Unidirectional relationship - draw single line with tick
      const tickLength = 10;
      const tickDistance = 35; // Much further from bubbles
      
      // Check if this relationship has multiple types
      if (edge.colors.length > 1) {
        // Draw gradient line for multiple relationship types
        const gradient = relationshipWebCtx.createLinearGradient(
          edge.source.x, edge.source.y, edge.target.x, edge.target.y
        );
        edge.colors.forEach((color, index) => {
          const stop = index / (edge.colors.length - 1);
          gradient.addColorStop(stop, color);
        });
        
        relationshipWebCtx.beginPath();
        relationshipWebCtx.moveTo(edge.source.x, edge.source.y);
        relationshipWebCtx.lineTo(edge.target.x, edge.target.y);
        relationshipWebCtx.strokeStyle = gradient;
        relationshipWebCtx.lineWidth = 3;
        relationshipWebCtx.stroke();
      } else {
        // Draw solid color line for single relationship type
        relationshipWebCtx.beginPath();
        relationshipWebCtx.moveTo(edge.source.x, edge.source.y);
        relationshipWebCtx.lineTo(edge.target.x, edge.target.y);
        relationshipWebCtx.strokeStyle = edge.colors[0];
        relationshipWebCtx.lineWidth = 3;
        relationshipWebCtx.stroke();
      }
      
      // Draw directional tick at target end - single sided like ↼
      const targetTickX = edge.target.x - Math.cos(lineAngle) * tickDistance;
      const targetTickY = edge.target.y - Math.sin(lineAngle) * tickDistance;
      
      // Draw angled tick pointing to target (like →)
      relationshipWebCtx.beginPath();
      relationshipWebCtx.moveTo(targetTickX, targetTickY);
      relationshipWebCtx.lineTo(
        targetTickX - Math.cos(perpendicularAngle - Math.PI/4) * tickLength,
        targetTickY - Math.sin(perpendicularAngle - Math.PI/4) * tickLength
      );
      relationshipWebCtx.strokeStyle = edge.colors[0];
      relationshipWebCtx.lineWidth = 4;
      relationshipWebCtx.stroke();
    }
  });
}

function drawRelationshipWebNodes() {
  relationshipWebNodes.forEach(node => {
    // Increase clickable area by making nodes larger
    const displayRadius = node.radius + 5; // Larger visual radius for better clickability
    
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
    
    // All characters in the web have relationships, so give them prominent borders
    relationshipWebCtx.strokeStyle = '#4CAF50'; // Green for connected
    relationshipWebCtx.lineWidth = 4;
    
    // No glow effect
    relationshipWebCtx.shadowBlur = 0;
    relationshipWebCtx.stroke();
    
    // Reset shadow
    relationshipWebCtx.shadowBlur = 0;
    
    // Draw character icon if available
    if (node.character && node.character.icon) {
      const characterId = node.character._id || node.character.id;
      const cachedImage = characterImages.get(characterId);
      
      if (cachedImage) {
        const iconSize = displayRadius * 1.8; // Much bigger icon, extends beyond bubble
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
        const iconSize = displayRadius * 1.8; // Much bigger placeholder
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
        relationshipWebCtx.arc(node.x, node.y - 6, 8, 0, 2 * Math.PI); // Much bigger head
        relationshipWebCtx.fill();
        relationshipWebCtx.beginPath();
        relationshipWebCtx.arc(node.x, node.y + 10, 12, 0, 2 * Math.PI); // Much bigger body
        relationshipWebCtx.fill();
        
        relationshipWebCtx.restore();
      }
    }
    
    // Draw character name with improved styling
    relationshipWebCtx.fillStyle = '#FFFFFF'; // White text
    relationshipWebCtx.globalAlpha = 1; // All characters in web have relationships
    relationshipWebCtx.font = 'bold 12px Arial, sans-serif';
    relationshipWebCtx.textAlign = 'center';
    relationshipWebCtx.textBaseline = 'middle';
    
    // Add text shadow for better readability
    relationshipWebCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    relationshipWebCtx.shadowBlur = 3;
    relationshipWebCtx.shadowOffsetX = 1;
    relationshipWebCtx.shadowOffsetY = 1;
    
    // Draw the name
    relationshipWebCtx.fillText(node.name, node.x, node.y + displayRadius + 20);
    
    // Reset effects
    relationshipWebCtx.globalAlpha = 1;
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
    
    // Use larger clickable area for better usability
    const clickableRadius = node.radius + 8;
    
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
