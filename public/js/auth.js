/* ============================================================================
 * File: auth.js
 * Purpose: Handles user authentication state and user menu functionality.
 * ============================================================================ */

// ============================================================================
// ------------------- Section: Authentication State -------------------
// Manages current user authentication status and data
// ============================================================================

let currentUser = null;
let isAuthenticated = false;
let userDropdown = null; // Global reference to user dropdown element

// ============================================================================
// ------------------- Section: Initialization -------------------
// Sets up authentication checking and user menu functionality
// ============================================================================

document.addEventListener('DOMContentLoaded', initUserAuth);

// ------------------- Function: initUserAuth -------------------
// Initializes user authentication and menu functionality
async function initUserAuth() {
  try {
    console.log('[auth.js]: 🔐 Initializing user authentication...');
    
    // Check if user just logged in (check URL parameters)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'success') {
      console.log('[auth.js]: 🎉 Login success detected, refreshing user data...');
      // Remove the parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Wait a moment for server to process login
      setTimeout(async () => {
        await checkUserAuthStatus();
      }, 500);
    } else {
      // Check authentication status
      await checkUserAuthStatus();
    }
    
    // Set up user menu interactions
    setupUserMenu();
    
    // Set up periodic refresh (every 30 seconds)
    setInterval(async () => {
      if (isAuthenticated) {
        await refreshUserData();
      }
    }, 30000);
    
    console.log('[auth.js]: ✅ User authentication initialized');
  } catch (error) {
    console.error('[auth.js]: ❌ Error initializing user auth:', error);
    showGuestUser();
  }
}

// ============================================================================
// ------------------- Section: Authentication Status -------------------
// Handles checking and updating authentication state
// ============================================================================

// ------------------- Function: checkUserAuthStatus -------------------
// Checks current user authentication status from server
async function checkUserAuthStatus() {
  try {
    const response = await fetch('/api/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    
    const userData = await response.json();
    
    if (userData.authenticated) {
      console.log('[auth.js]: ✅ User authenticated:', userData.username);
      currentUser = userData;
      isAuthenticated = true;
      updateUserMenu(userData);
    } else {
      console.log('[auth.js]: 👤 User not authenticated, showing guest mode');
      currentUser = null;
      isAuthenticated = false;
      showGuestUser();
    }
  } catch (error) {
    console.error('[auth.js]: ❌ Error checking auth status:', error);
    showGuestUser();
  }
}

// ============================================================================
// ------------------- Section: User Menu Management -------------------
// Handles user menu display and interactions
// ============================================================================

// ------------------- Function: setupUserMenu -------------------
// Sets up user menu click handlers and interactions
function setupUserMenu() {
  const userMenu = document.getElementById('user-menu');
  userDropdown = document.getElementById('user-dropdown'); // Assign to global variable
  
  if (!userMenu || !userDropdown) {
    console.error('[auth.js]: ❌ User menu elements not found');
    return;
  }
  
  console.log('[auth.js]: 🔧 Setting up user menu interactions');

  // User menu click handler
  userMenu.addEventListener('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Toggle dropdown
    if (userDropdown.classList.contains('show')) {
        closeUserDropdown('userMenu click');
    } else {
        openUserDropdown('userMenu click');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    if (!userMenu.contains(event.target) && !userDropdown.contains(event.target)) {
        closeUserDropdown('outside click');
    }
  });

  // Close dropdown when window loses focus
  window.addEventListener('blur', function() {
    closeUserDropdown('window blur');
  });

  // Close dropdown when pressing Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && userDropdown.classList.contains('show')) {
        closeUserDropdown('escape key');
    }
  });

  // Handle logout button click
  const logoutButton = userDropdown.querySelector('.logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log('[auth.js]: 🚪 Logout button clicked', {time: Date.now(), stack: new Error().stack});
      closeUserDropdown('logout button');
      await logout();
    });
  }

  // Handle profile button click
  const profileButton = userDropdown.querySelector('.profile-button');
  if (profileButton) {
    profileButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log('[auth.js]: 👤 Profile button clicked', {time: Date.now(), stack: new Error().stack});
      closeUserDropdown('profile button');
      // Navigate to profile section
      const profileLink = document.querySelector('a[data-section="profile-section"]');
      if (profileLink) {
        profileLink.click();
      }
    });
  }

  console.log('[auth.js]: ✅ User menu interactions set up successfully');
}

// ------------------- Function: openUserDropdown -------------------
// Opens the user dropdown menu
function openUserDropdown(source = 'unknown') {
  // Get userDropdown element if not already initialized
  const dropdown = userDropdown || document.getElementById('user-dropdown');
  if (!dropdown) {
    console.error('[auth.js]: ❌ User dropdown element not found');
    return;
  }
  
  dropdown.classList.add('show');
  dropdown.setAttribute('aria-expanded', 'true');
}

// ------------------- Function: closeUserDropdown -------------------
// Closes the user dropdown menu
function closeUserDropdown(source = 'unknown') {
  // Get userDropdown element if not already initialized
  const dropdown = userDropdown || document.getElementById('user-dropdown');
  if (!dropdown || !dropdown.classList.contains('show')) {
    return;
  }
  
  dropdown.classList.remove('show');
  dropdown.setAttribute('aria-expanded', 'false');
}

// ------------------- Function: updateUserMenu -------------------
// Updates user menu with authenticated user data
function updateUserMenu(userData) {
  const usernameElement = document.getElementById('username');
  const userAvatar = document.getElementById('user-avatar');
  const userDropdownAvatar = document.getElementById('user-dropdown-avatar');
  const userName = document.getElementById('user-name');
  const userDiscriminator = document.getElementById('user-discriminator');
  const userTokens = document.getElementById('user-tokens');
  const userSlots = document.getElementById('user-slots');
  const userInfo = document.getElementById('user-info');
  const guestInfo = document.getElementById('guest-info');
  
  if (!usernameElement || !userAvatar || !userDropdownAvatar || !userName || 
      !userDiscriminator || !userTokens || !userSlots || !userInfo || !guestInfo) {
    console.error('[auth.js]: ❌ User menu elements not found');
    return;
  }
  
  // Update main username display
  usernameElement.textContent = userData.username || 'User';
  
  // Update avatars
  const avatarUrl = userData.avatarUrl || '/images/ankleicon.png';
  userAvatar.src = avatarUrl;
  userDropdownAvatar.src = avatarUrl;
  
  // Update dropdown user info
  userName.textContent = userData.username || 'User';
  userDiscriminator.textContent = userData.discriminator ? `#${userData.discriminator}` : '';
  userTokens.textContent = userData.tokens || 0;
  userSlots.textContent = userData.characterSlot || 2;
  
  // Show user info, hide guest info
  userInfo.style.display = 'flex';
  guestInfo.style.display = 'none';
  
  console.log('[auth.js]: ✅ User menu updated for authenticated user');
}

// ------------------- Function: showGuestUser -------------------
// Shows guest user interface when not authenticated
function showGuestUser() {
  const usernameElement = document.getElementById('username');
  const userAvatar = document.getElementById('user-avatar');
  const userInfo = document.getElementById('user-info');
  const guestInfo = document.getElementById('guest-info');
  
  if (!usernameElement || !userAvatar || !userInfo || !guestInfo) {
    console.error('[auth.js]: ❌ User menu elements not found');
    return;
  }
  
  // Update main display
  usernameElement.textContent = 'Login';
  userAvatar.src = '/images/ankleicon.png';
  
  // Show guest info, hide user info
  userInfo.style.display = 'none';
  guestInfo.style.display = 'flex';
  
  console.log('[auth.js]: ✅ User menu updated for guest user');
}

// ============================================================================
// ------------------- Section: Authentication Utilities -------------------
// Helper functions for authentication management
// ============================================================================

// ------------------- Function: refreshUserData -------------------
// Refreshes user data from server
async function refreshUserData() {
  try {
    console.log('[auth.js]: 🔄 Refreshing user data...');
    await checkUserAuthStatus();
  } catch (error) {
    console.error('[auth.js]: ❌ Error refreshing user data:', error);
  }
}

// ------------------- Function: forceRefreshUserMenu -------------------
// Forces a refresh of the user menu (useful after login/logout)
async function forceRefreshUserMenu() {
  try {
    console.log('[auth.js]: 🔄 Force refreshing user menu...');
    await checkUserAuthStatus();
  } catch (error) {
    console.error('[auth.js]: ❌ Error force refreshing user menu:', error);
  }
}

// ------------------- Function: logout -------------------
// Handles user logout
async function logout() {
  try {
    const response = await fetch('/auth/logout', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('[auth.js]: ✅ User logged out successfully');
      currentUser = null;
      isAuthenticated = false;
      showGuestUser();
      
      // Close dropdown using global variable
      if (userDropdown) {
        userDropdown.classList.remove('show');
      }
    } else {
      console.error('[auth.js]: ❌ Logout failed');
    }
  } catch (error) {
    console.error('[auth.js]: ❌ Error during logout:', error);
  }
}

// ============================================================================
// ------------------- Section: Public API -------------------
// Exports functions for use in other modules
// ============================================================================

export {
  currentUser,
  isAuthenticated,
  checkUserAuthStatus,
  updateUserMenu,
  showGuestUser,
  refreshUserData,
  forceRefreshUserMenu,
  logout,
  openUserDropdown,
  closeUserDropdown
}; 