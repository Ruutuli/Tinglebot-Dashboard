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
  closeModal
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
    'relationships-error'
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
  document.getElementById('relationships-character-name').textContent = character.name;
  
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
              ${relationship.notes ? `<div class="relationship-notes">${relationship.notes}</div>` : ''}
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
