// ============================================================================
// Guilds Module - Handles guild information and actions
// ============================================================================

// Global variables
let guildData = null;

// ============================================================================
// ------------------- Section: Guild Data Loading -------------------
// Loads guild information from the server
// ============================================================================

// ------------------- Function: loadGuildData -------------------
// Fetches guild data from the server
async function loadGuildData() {
  try {
    console.log('[guilds.js]: 📊 Loading guild data...');
    
    const response = await fetch('/api/guild/info', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    guildData = await response.json();
    console.log('[guilds.js]: ✅ Guild data loaded:', guildData);
    
    // Update the UI with guild data
    updateGuildUI(guildData);
    
  } catch (error) {
    console.error('[guilds.js]: ❌ Error loading guild data:', error);
    showGuildError('Failed to load guild information');
  }
}

// ------------------- Function: updateGuildUI -------------------
// Updates the guild UI with fetched data
function updateGuildUI(data) {
  console.log('[guilds.js]: 🎨 Updating guild UI...');
  
  // Update guild basic info
  const guildName = document.getElementById('guild-name');
  const guildDescription = document.getElementById('guild-description');
  const guildIcon = document.getElementById('guild-icon');
  const guildMembers = document.getElementById('guild-members');
  const guildInactive = document.getElementById('guild-inactive');
  
  if (guildName) {
    guildName.textContent = data.name || 'Tinglebot Guild';
  }
  
  if (guildDescription) {
    guildDescription.textContent = data.description || 'A community server for Tinglebot users to play together, share experiences, and enjoy the RPG system.';
  }
  
  if (guildIcon && data.icon) {
    guildIcon.src = data.icon;
  }
  
  if (guildMembers) {
    guildMembers.textContent = data.memberCount !== undefined ? data.memberCount : 'Loading...';
  }
  
  if (guildInactive) {
    guildInactive.textContent = data.inactiveCount !== undefined ? data.inactiveCount : 'Loading...';
  }
  
  console.log('[guilds.js]: ✅ Guild UI updated');
}

// ------------------- Function: showGuildError -------------------
// Shows error state for guild loading
function showGuildError(message) {
  console.error('[guilds.js]: ❌ Guild error:', message);
  
  const guildName = document.getElementById('guild-name');
  const guildDescription = document.getElementById('guild-description');
  
  if (guildName) {
    guildName.textContent = 'Error Loading Guild';
  }
  
  if (guildDescription) {
    guildDescription.textContent = message || 'Unable to load guild information. Please try again later.';
  }
}

// ============================================================================
// ------------------- Section: Guild Actions -------------------
// Handles guild action buttons
// ============================================================================

// ------------------- Function: setupGuildActions -------------------
// Sets up event listeners for guild action buttons
function setupGuildActions() {
  console.log('[guilds.js]: 🔧 Setting up guild actions...');
  
  const joinGuildBtn = document.getElementById('join-guild-btn');
  const viewGuildBtn = document.getElementById('view-guild-btn');
  
  if (joinGuildBtn) {
    joinGuildBtn.addEventListener('click', handleJoinGuild);
  }
  
  if (viewGuildBtn) {
    viewGuildBtn.addEventListener('click', handleViewGuild);
  }
  
  console.log('[guilds.js]: ✅ Guild actions setup complete');
}

// ------------------- Function: handleJoinGuild -------------------
// Handles join guild button click
async function handleJoinGuild(event) {
  event.preventDefault();
  console.log('[guilds.js]: 🚪 Join guild button clicked');
  
  try {
    // Get guild ID from environment (this would be passed from server)
    const response = await fetch('/api/guild/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        // Open Discord invite link
        window.open(result.inviteUrl, '_blank');
      } else {
        console.error('[guilds.js]: ❌ Failed to get invite URL');
        alert('Unable to generate invite link. Please contact an administrator.');
      }
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
  } catch (error) {
    console.error('[guilds.js]: ❌ Error joining guild:', error);
    alert('Failed to join guild. Please try again later.');
  }
}

// ------------------- Function: handleViewGuild -------------------
// Handles view guild button click
function handleViewGuild(event) {
  event.preventDefault();
  console.log('[guilds.js]: 👁️ View guild button clicked');
  
  // Open Discord guild in new tab
  // Use the guild ID from the loaded guild data
  if (guildData && guildData.id) {
    const guildUrl = `https://discord.com/channels/${guildData.id}`;
    window.open(guildUrl, '_blank');
  } else {
    console.error('[guilds.js]: ❌ Guild ID not available');
    alert('Guild information not loaded. Please refresh the page and try again.');
  }
}

// ============================================================================
// ------------------- Section: Guild Section Management -------------------
// Handles guild section display and initialization
// ============================================================================

// ------------------- Function: showGuildSection -------------------
// Shows the guild section and initializes it
function showGuildSection() {
  console.log('[guilds.js]: 🏰 Showing guild section...');
  
  // Hide all main content sections
  const mainContent = document.querySelector('.main-content');
  const sections = mainContent.querySelectorAll('section, #model-details-page');
  
  sections.forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the guild section
  const guildSection = document.getElementById('guilds-section');
  if (guildSection) {
    guildSection.style.display = 'block';
    console.log('[guilds.js]: ✅ Guild section displayed');
    
    // Initialize guild page
    initGuildPage();
  } else {
    console.error('[guilds.js]: ❌ Guild section not found');
  }
  
  // Update active state in sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  sidebarLinks.forEach(link => {
    const linkSection = link.getAttribute('data-section');
    const listItem = link.closest('li');
    if (listItem) {
      if (linkSection === 'guilds-section') {
        listItem.classList.add('active');
      } else {
        listItem.classList.remove('active');
      }
    }
  });
  
  // Update breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = 'Guilds';
  }
}

// ------------------- Function: initGuildPage -------------------
// Initializes the guild page
async function initGuildPage() {
  console.log('[guilds.js]: 🚀 Initializing guild page...');
  
  try {
    // Load guild data
    await loadGuildData();
    
    // Setup guild actions
    setupGuildActions();
    
    console.log('[guilds.js]: ✅ Guild page initialized');
    
  } catch (error) {
    console.error('[guilds.js]: ❌ Error initializing guild page:', error);
    showGuildError('Failed to initialize guild page');
  }
}

// ============================================================================
// ------------------- Section: Event Listeners -------------------
// Sets up guild page event listeners
// ============================================================================

// ------------------- Function: setupGuildEventListeners -------------------
// Sets up all guild page event listeners
function setupGuildEventListeners() {
  console.log('[guilds.js]: 🎧 Setting up guild event listeners...');
  
  // Listen for custom navigation events
  document.addEventListener('navigateToSection', (event) => {
    if (event.detail.section === 'guilds-section') {
      console.log('[guilds.js]: 🎯 Received navigation event to guild section');
      // The section will be shown by the main navigation handler
      // We just need to initialize the guild page
      setTimeout(() => {
        initGuildPage();
      }, 100);
    }
  });
  
  console.log('[guilds.js]: ✅ Guild event listeners setup complete');
}

// ============================================================================
// ------------------- Section: Initialization -------------------
// Initialize guild module when loaded
// ============================================================================

// Initialize event listeners when module loads
setupGuildEventListeners();

// ============================================================================
// ------------------- Section: Exports -------------------
// Export functions for use in other modules
// ============================================================================

export {
  showGuildSection,
  initGuildPage,
  loadGuildData,
  setupGuildActions,
  handleJoinGuild,
  handleViewGuild
}; 