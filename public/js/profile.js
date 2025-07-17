/* ============================================================================
 * File: profile.js
 * Purpose: Handles user profile page functionality and data display.
 * ============================================================================ */

import { currentUser, isAuthenticated } from './auth.js';
import { renderCharacterCards } from './characters.js';

// ============================================================================
// ------------------- Section: Profile Page Initialization -------------------
// Sets up profile page and loads user data
// ============================================================================

let profileInitialized = false;

// ------------------- Function: initProfilePage -------------------
// Initializes the profile page and loads user data
async function initProfilePage() {
  try {
    
    if (profileInitialized) {
      return;
    }
    
    // Check authentication
    if (!isAuthenticated || !currentUser) { 
      window.location.href = '/login';
      return;
    }
    
    // Load profile data
    await loadProfileData();
    
    // Setup event listeners
    setupProfileEventListeners();
    
    profileInitialized = true;
    
  } catch (error) {
    console.error('[profile.js]: ❌ Error initializing profile page:', error);
  }
}

// ============================================================================
// ------------------- Section: Profile Data Loading -------------------
// Handles loading and displaying user profile data
// ============================================================================

// ------------------- Function: loadProfileData -------------------
// Loads and displays user profile data
async function loadProfileData() {
  try {
    
    
    // Update profile elements with current user data
    updateProfileDisplay(currentUser);
    
    // Load additional profile data if needed
    await loadExtendedProfileData();
    
    // Load user's characters
    await loadUserCharacters();
    
  } catch (error) {
    console.error('[profile.js]: ❌ Error loading profile data:', error);
    showProfileError('Failed to load profile data');
  }
}

// ------------------- Function: updateProfileDisplay -------------------
// Updates the profile page display with user data
function updateProfileDisplay(userData) {
  const profileAvatar = document.getElementById('profile-avatar');
  const profileName = document.getElementById('profile-name');
  const profileTokens = document.getElementById('profile-tokens');
  const profileSlots = document.getElementById('profile-slots');
  const profileJoined = document.getElementById('profile-joined');
  
  if (!profileAvatar || !profileName ||
      !profileTokens || !profileSlots || !profileJoined) {
    
    return;
  }
  
  // Update avatar
  const avatarUrl = userData.avatarUrl || '/images/ankleicon.png';
  profileAvatar.src = avatarUrl;
  
  // Update user info
  profileName.textContent = userData.username || 'User';
  
  // Update stats
  profileTokens.textContent = userData.tokens || 0;
  profileSlots.textContent = userData.characterSlot || 2;
  
  // Update join date - will be updated by loadExtendedProfileData
  profileJoined.textContent = 'Loading...';
  
}

// ------------------- Function: loadExtendedProfileData -------------------
// Loads additional profile data from server if needed
async function loadExtendedProfileData() {
  try {
    
    
    // Fetch guild member information to get actual join date
    const response = await fetch('/api/user/guild-info', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const guildData = await response.json();
    const profileJoined = document.getElementById('profile-joined');
    
    if (profileJoined) {
      if (guildData.joinedAt) {
        const joinDate = new Date(guildData.joinedAt);
        profileJoined.textContent = formatDate(joinDate);
      } else if (guildData.inGuild === false) {
        profileJoined.textContent = 'Not in guild';
      } else {
        // Fallback to database creation date
        if (currentUser && currentUser.createdAt) {
          const joinDate = new Date(currentUser.createdAt);
          profileJoined.textContent = formatDate(joinDate) + ' (Account)';
        } else {
          profileJoined.textContent = 'Unknown';
        }
      }
    }
    
  } catch (error) {
    console.error('[profile.js]: ❌ Error loading extended profile data:', error);
    
    // Fallback to database creation date on error
    const profileJoined = document.getElementById('profile-joined');
    if (profileJoined && currentUser && currentUser.createdAt) {
      const joinDate = new Date(currentUser.createdAt);
      profileJoined.textContent = formatDate(joinDate) + ' (Account)';
    } else if (profileJoined) {
      profileJoined.textContent = 'Unknown';
    }
  }
}

// ------------------- Function: loadUserCharacters -------------------
// Loads and displays the user's characters
async function loadUserCharacters() {
  try {
    
    
    const charactersContainer = document.getElementById('profile-characters-container');
    const charactersCount = document.getElementById('characters-count');
    const charactersLoading = document.getElementById('profile-characters-loading');
    
    if (!charactersContainer || !charactersCount || !charactersLoading) {
      
      return;
    }
    
    // Show loading state
    charactersLoading.style.display = 'flex';
    charactersContainer.innerHTML = '';
    charactersContainer.appendChild(charactersLoading);
    
    // Fetch user's characters from the API
    const response = await fetch('/api/user/characters', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const { data: characters } = await response.json();
    
    // Update character count
    charactersCount.textContent = characters.length;
    
    // Hide loading state
    charactersLoading.style.display = 'none';
    
    if (characters.length === 0) {
      // Show no characters message
      charactersContainer.innerHTML = `
        <div class="profile-no-characters">
          <i class="fas fa-user-slash"></i>
          <h4>No Characters Found</h4>
          <p>You haven't created any characters yet. Start your adventure by creating your first character!</p>
        </div>
      `;
    } else {
      // Create a grid container for character cards
      const charactersGrid = document.createElement('div');
      charactersGrid.className = 'profile-characters-grid';
      
      // Render character cards using the existing character rendering function
      characters.forEach(character => {
        const characterCard = createProfileCharacterCard(character);
        charactersGrid.appendChild(characterCard);
      });
      
      charactersContainer.appendChild(charactersGrid);
    }
    
  } catch (error) {
    
    
    const charactersContainer = document.getElementById('profile-characters-container');
    if (charactersContainer) {
      charactersContainer.innerHTML = `
        <div class="profile-no-characters">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Error Loading Characters</h4>
          <p>Failed to load your characters. Please try refreshing the page.</p>
        </div>
      `;
    }
  }
}

// ------------------- Function: createProfileCharacterCard -------------------
// Creates a simplified character card for the profile page
function createProfileCharacterCard(character) {
  const card = document.createElement('div');
  card.className = 'profile-character-card';
  card.setAttribute('data-character', character.name);
  
  // Determine character status
  let statusClass = '';
  let statusText = '';
  let statusIcon = '';
  
  if (character.blighted) {
    statusClass = 'blighted';
    statusText = 'Blighted';
    statusIcon = 'fas fa-skull';
  } else if (character.ko) {
    statusClass = 'ko';
    statusText = 'KO\'d';
    statusIcon = 'fas fa-heart-broken';
  } else {
    statusClass = 'online';
    statusText = 'Active';
    statusIcon = 'fas fa-heart';
  }
  
  // Check if character has rolled today
  const hasRolledToday = checkIfCharacterRolledToday(character);
  const rollStatus = hasRolledToday ? 
    '<div class="profile-character-roll-status rolled"><i class="fas fa-dice"></i> Rolled today</div>' :
    '<div class="profile-character-roll-status not-rolled"><i class="fas fa-clock"></i> Has not rolled today</div>';
  
  // Format character icon URL
  const iconUrl = formatCharacterIconUrl(character.icon);
  
  // Get village information
  const currentVillage = character.currentVillage || character.homeVillage || 'Unknown';
  const homeVillage = character.homeVillage || 'Unknown';
  const isVisiting = currentVillage !== homeVillage;
  
  card.innerHTML = `
    <div class="profile-character-header">
      <img 
        src="${iconUrl}" 
        alt="${character.name}" 
        class="profile-character-avatar"
        onerror="this.src='/images/ankleicon.png'"
      >
      <div class="profile-character-info">
        <h4 class="profile-character-name">${character.name}</h4>
        <p class="profile-character-details">
          ${character.race ? capitalize(character.race) : ''}
          ${character.race && character.job ? ' • ' : ''}
          ${character.job ? capitalize(character.job) : ''}
        </p>
        <p class="profile-character-village">
          <i class="fas fa-map-marker-alt"></i>
          ${isVisiting ? `Visiting ${capitalize(currentVillage)}` : `Home: ${capitalize(homeVillage)}`}
          ${isVisiting ? ` (from ${capitalize(homeVillage)})` : ''}
        </p>
      </div>
    </div>
    
    <div class="profile-character-stats">
      <div class="profile-character-stat">
        <span class="profile-character-stat-label">Hearts</span>
        <span class="profile-character-stat-value">${character.currentHearts}/${character.maxHearts}</span>
      </div>
      <div class="profile-character-stat">
        <span class="profile-character-stat-label">Stamina</span>
        <span class="profile-character-stat-value">${character.currentStamina}/${character.maxStamina}</span>
      </div>
    </div>
    
    <div class="profile-character-status ${statusClass}">
      <i class="${statusIcon}"></i>
      <span>${statusText}</span>
    </div>
    
    ${rollStatus}
  `;
  
  // Add click handler to show character details modal
  card.addEventListener('click', () => {
    showCharacterModal(character);
  });
  
  return card;
}

// ------------------- Function: showCharacterModal -------------------
// Shows a modal with detailed character information
function showCharacterModal(character) {
  
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'character-modal';
  
  // Create modal content using CSS classes
  const modalContent = document.createElement('div');
  modalContent.className = 'character-modal-content';
  
  // Format character icon URL
  const iconUrl = formatCharacterIconUrl(character.icon);
  
  // Determine character status
  let statusClass = '';
  let statusText = '';
  let statusIcon = '';
  
  if (character.blighted) {
    statusClass = 'blighted';
    statusText = 'Blighted';
    statusIcon = 'fas fa-skull';
  } else if (character.ko) {
    statusClass = 'ko';
    statusText = 'KO\'d';
    statusIcon = 'fas fa-heart-broken';
  } else {
    statusClass = 'online';
    statusText = 'Active';
    statusIcon = 'fas fa-heart';
  }
  
  modalContent.innerHTML = `
    <div class="character-modal-header">
      <div style="display: flex; align-items: center; gap: 1.5rem;">
        <img 
          src="${iconUrl}" 
          alt="${character.name}" 
          style="
            width: 60px;
            height: 60px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid var(--border-color);
          "
          onerror="this.src='/images/ankleicon.png'"
        >
        <div>
          <h2 style="margin: 0 0 0.5rem 0; color: var(--text-color); font-size: 1.8rem;">${character.name}</h2>
          <p style="margin: 0 0 0.5rem 0; color: var(--text-secondary);">
            ${character.race ? capitalize(character.race) : ''}
            ${character.race && character.job ? ' • ' : ''}
            ${character.job ? capitalize(character.job) : ''}
          </p>
          <div class="character-status ${statusClass}" style="
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.9rem;
            font-weight: 500;
            background: ${statusClass === 'blighted' ? 'var(--blight-border)' : statusClass === 'ko' ? '#f44336' : 'var(--success-color)'};
            color: white;
          ">
            <i class="${statusIcon}"></i>
            <span>${statusText}</span>
          </div>
        </div>
      </div>
      <button class="close-modal">&times;</button>
    </div>
    
    <div class="character-modal-body">
      <div class="character-modal-section">
        <h3>Basic Info</h3>
        <div class="character-modal-grid">
          <div class="character-modal-item">
            <span class="label">Race:</span>
            <span class="value">${character.race ? capitalize(character.race) : 'Unknown'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Job:</span>
            <span class="value">${character.job ? capitalize(character.job) : 'Unknown'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Home Village:</span>
            <span class="value">${character.homeVillage ? capitalize(character.homeVillage) : 'Unknown'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Current Village:</span>
            <span class="value">${character.currentVillage ? capitalize(character.currentVillage) : 'Unknown'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Pronouns:</span>
            <span class="value">${character.pronouns || 'Unknown'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Age:</span>
            <span class="value">${character.age || 'Unknown'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Birthday:</span>
            <span class="value">${character.birthday || 'Unknown'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Height:</span>
            <span class="value">${character.height ? `${character.height} cm | ${convertCmToFeetInches(character.height)}` : 'Unknown'}</span>
          </div>
        </div>
      </div>

      <div class="character-modal-section">
        <h3>Stats</h3>
        <div class="character-modal-grid">
          <div class="character-modal-item">
            <span class="label">Hearts:</span>
            <span class="value">${character.currentHearts}/${character.maxHearts}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Stamina:</span>
            <span class="value">${character.currentStamina}/${character.maxStamina}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Attack:</span>
            <span class="value">${character.attack || 0}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Defense:</span>
            <span class="value">${character.defense || 0}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Spirit Orbs:</span>
            <span class="value">${character.spiritOrbs || 0}</span>
          </div>
        </div>
      </div>

      <div class="character-modal-section">
        <h3>Gear</h3>
        <div class="character-modal-grid">
          <div class="character-modal-item">
            <span class="label">Weapon:</span>
            <span class="value">${character.gearWeapon?.name ? `${character.gearWeapon.name} | ${getGearStat(character.gearWeapon, 'modifierHearts')}` : 'None'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Shield:</span>
            <span class="value">${character.gearShield?.name ? `${character.gearShield.name} | ${getGearStat(character.gearShield, 'modifierHearts')}` : 'None'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Head:</span>
            <span class="value">${character.gearArmor?.head?.name ? `${character.gearArmor.head.name} | ${getGearStat(character.gearArmor.head, 'modifierHearts')}` : 'None'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Chest:</span>
            <span class="value">${character.gearArmor?.chest?.name ? `${character.gearArmor.chest.name} | ${getGearStat(character.gearArmor.chest, 'modifierHearts')}` : 'None'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Legs:</span>
            <span class="value">${character.gearArmor?.legs?.name ? `${character.gearArmor.legs.name} | ${getGearStat(character.gearArmor.legs, 'modifierHearts')}` : 'None'}</span>
          </div>
        </div>
      </div>

      <div class="character-modal-section">
        <h3>Status</h3>
        <div class="character-modal-grid">
          <div class="character-modal-item">
            <span class="label">Blighted:</span>
            <span class="value">${character.blighted ? 'Yes' : 'No'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Blight Stage:</span>
            <span class="value">${character.blightStage ?? 0}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Debuff:</span>
            <span class="value">${character.debuff?.active
              ? `Debuffed${character.debuff.endDate ? ' | Ends ' + new Date(character.debuff.endDate).toLocaleDateString() : ''}`
              : 'Not Debuffed'}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Last Stamina Usage:</span>
            <span class="value">${formatPrettyDate(character.lastStaminaUsage)}</span>
          </div>
          <div class="character-modal-item">
            <span class="label">Job Changed:</span>
            <span class="value">${formatPrettyDate(character.jobDateChanged)}</span>
          </div>
        </div>
      </div>

      <div class="character-modal-section">
        <h3>Links</h3>
        <div class="character-modal-links">
          ${character.appLink ? `
            <a href="${character.appLink}" target="_blank">
              <i class="fas fa-external-link-alt"></i>
              Character Sheet
            </a>
          ` : ''}
          ${character.inventory ? `
            <a href="${character.inventory}" target="_blank">
              <i class="fas fa-backpack"></i>
              Inventory
            </a>
          ` : ''}
          ${character.shopLink ? `
            <a href="${character.shopLink}" target="_blank">
              <i class="fas fa-store"></i>
              Shop
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Add close functionality
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn?.addEventListener('click', () => {
    modal.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    }
  });
  
  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modal.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// ------------------- Function: getGearStat -------------------
// Returns a stat string with + prefix if positive
function getGearStat(gear, statName) {
  if (!gear || !gear[statName]) return '';
  const value = gear[statName];
  return value > 0 ? `+${value}` : value;
}

// ------------------- Function: formatPrettyDate -------------------
// Converts a date string into a human-readable format
function formatPrettyDate(date) {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
}

// ------------------- Function: convertCmToFeetInches -------------------
// Converts centimeters to feet and inches format
function convertCmToFeetInches(heightInCm) {
  const totalInches = heightInCm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

// ============================================================================
// ------------------- Section: Event Listeners -------------------
// Sets up profile page event listeners
// ============================================================================

// ------------------- Function: setupProfileEventListeners -------------------
// Sets up all profile page event listeners
function setupProfileEventListeners() {
  
  // Profile link in user dropdown
  const profileLink = document.getElementById('profile-link');
  if (profileLink) {
    profileLink.addEventListener('click', handleProfileLinkClick);
  }
  
  // Listen for custom navigation events
  document.addEventListener('navigateToSection', (event) => {
    if (event.detail.section === 'profile-section') {
      // The section will be shown by the main navigation handler
      // We just need to initialize the profile page
      setTimeout(() => {
        initProfilePage();
      }, 100);
    }
  });
  
}

// ============================================================================
// ------------------- Section: Profile Actions -------------------
// Handles profile page action buttons
// ============================================================================

// ------------------- Function: handleProfileLinkClick -------------------
// Handles profile link click from user dropdown
function handleProfileLinkClick(event) {
  event.preventDefault();
  
  // Close the user dropdown
  const userDropdown = document.getElementById('user-dropdown');
  if (userDropdown) {
    userDropdown.classList.remove('show');
  }
  
  // Navigate to profile section
  window.location.hash = '#profile';
  // Trigger the profile section display
  const navEvent = new CustomEvent('navigateToSection', { 
    detail: { section: 'profile-section' } 
  });
  document.dispatchEvent(navEvent);
}

// ============================================================================
// ------------------- Section: Utility Functions -------------------
// Helper functions for profile functionality
// ============================================================================

// ------------------- Function: formatDate -------------------
// Formats a date for display
function formatDate(date) {
  try {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    
    return 'Unknown';
  }
}

// ------------------- Function: showProfileMessage -------------------
// Shows a message on the profile page
function showProfileMessage(message, type = 'info') {
  
  
  // Create a temporary message element
  const messageElement = document.createElement('div');
  messageElement.className = `profile-message ${type}`;
  messageElement.textContent = message;
  messageElement.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    max-width: 300px;
  `;
  
  // Set background color based on type
  switch (type) {
    case 'success':
      messageElement.style.background = '#4CAF50';
      break;
    case 'error':
      messageElement.style.background = '#f44336';
      break;
    case 'warning':
      messageElement.style.background = '#ff9800';
      break;
    default:
      messageElement.style.background = '#2196F3';
  }
  
  // Add to page
  document.body.appendChild(messageElement);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (messageElement.parentNode) {
      messageElement.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement);
        }
      }, 300);
    }
  }, 3000);
}

// ------------------- Function: showProfileError -------------------
// Shows an error message on the profile page
function showProfileError(message) {
  showProfileMessage(message, 'error');
}

// ============================================================================
// ------------------- Section: Helper Functions -------------------
// Utility functions for character display
// ============================================================================

// ------------------- Function: checkIfCharacterRolledToday -------------------
// Checks if a character has rolled today based on their dailyRoll data
// Uses 8am-8am rolling window logic
function checkIfCharacterRolledToday(character) {
  try {
    if (!character.dailyRoll || typeof character.dailyRoll !== 'object') {
      return false;
    }
    
    // Calculate the current 8am-8am rolling window
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
    
    // Check if any of the dailyRoll entries fall within the current rolling window
    for (const [rollType, timestamp] of Object.entries(character.dailyRoll)) {
      if (timestamp) {
        const rollDate = new Date(timestamp);
        if (rollDate >= weatherDayStart && rollDate < weatherDayEnd) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {

    return false;
  }
}

// ------------------- Function: capitalize -------------------
// Capitalizes the first letter of a string safely
function capitalize(str) {
  return typeof str === 'string' ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

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

// ============================================================================
// ------------------- Section: Public API -------------------
// Exports functions for use in other modules
// ============================================================================

export {
  initProfilePage,
  loadProfileData,
  updateProfileDisplay
}; 